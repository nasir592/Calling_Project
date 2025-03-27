"use strict";
const Razorpay = require("razorpay");
const crypto = require("crypto");

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_ID ,
    key_secret: process.env.RAZORPAY_KEY_SECRET ,
});



module.exports = {
    async createOrder(ctx) {
        try {
          const { amount, currency } = ctx.request.body;
      
          // ✅ Ensure amount is correct (in INR)
          if (!amount || amount < 1) {
            return ctx.throw(400, "Amount must be at least 1 INR");
          }
      
          const options = {
            amount: amount * 100, // ✅ Convert INR to paise for Razorpay
            currency: currency || "INR",
            receipt: `order_${Date.now()}`,
          };
      
          const order = await razorpay.orders.create(options);
      
          // ✅ Return both INR & paise amounts in response
          return ctx.send({
            order_id: order.id,
            amount: amount, // ✅ Show INR to the user
            currency: order.currency,
            status: order.status,
            order
          });
        } catch (error) {
          console.error("Error creating order:", error);
          ctx.throw(500, "Error creating order");
        }
      },
      
    
      async verifyPayment(ctx) {
        try {
          const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount, userId =14 } = ctx.request.body;
      
          console.log("🔹 Received Data:", ctx.request.body);
      
          const secret = process.env.RAZORPAY_KEY_SECRET;
          if (!secret) {
            console.error("❌ Razorpay secret key is missing in environment variables");
            return ctx.throw(500, "Server configuration error");
          }
      
          // ✅ Generate expected signature
          const generatedSignature = crypto
            .createHmac("sha256", secret)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest("hex");
      
          console.log("🔹 Generated Signature:", generatedSignature);
          console.log("🔹 Received Signature:", razorpay_signature);
      
          // ✅ Verify signature
          if (generatedSignature === razorpay_signature) {
            console.log("✅ Payment Verified Successfully!");
      
            // 🔹 Fetch user from public-user collection
            const user = await strapi.entityService.findOne("api::public-user.public-user", userId, {
              populate: ["wallet"],
            });
      
            if (!user) {
              console.error("❌ User not found!");
              return ctx.throw(404, "User not found");
            }
      
            // 🔹 Calculate new wallet balance
            let walletBalance = user.wallet?.balance || 0;
            let newBalance = walletBalance + amount / 100; // Convert from paise to INR
      
            console.log(`🔹 Current Balance: ${walletBalance}, Adding: ${amount / 100}, New Balance: ${newBalance}`);
      
            // 🔹 Update user wallet
            await strapi.entityService.update("api::public-user.public-user", userId, {
              data: {
                wallet: {
                  balance: newBalance,
                },
              },
            });
      
            console.log("✅ Wallet updated successfully!");
      
            return ctx.send({ success: true, message: "Payment verified and wallet updated", newBalance });
          } else {
            console.error("❌ Signature Mismatch!");
            return ctx.throw(401, "Unauthorized - Invalid signature");
          }
        } catch (error) {
          console.error("❌ Error verifying payment:", error);
          ctx.throw(500, "Error verifying payment");
        }
      },
      

  async withdrawMoney(ctx) {
    try {
      const { amount, account_number, ifsc_code } = ctx.request.body;
      const expert = ctx.state.user;

      const wallet = await strapi.query("wallet").findOne({ user: expert.id });
      if (!wallet || wallet.balance < amount) {
        return ctx.throw(400, "Insufficient balance");
      }

      const payout = await razorpay.payouts.create({
        account_number: "YOUR_RAZORPAY_ACCOUNT_NUMBER",
        fund_account: {
          account_type: "bank_account",
          bank_account: {
            name: expert.username,
            account_number: account_number,
            ifsc: ifsc_code,
          },
        },
        amount: amount, // 🔹 No need to multiply by 100, using INR
        currency: "INR",
        mode: "IMPS",
        purpose: "payout",
        queue_if_low_balance: true,
      });

      await strapi.query("wallet").update({ user: expert.id }, { $inc: { balance: -amount } });

      return ctx.send({
        success: true,
        message: "Withdrawal successful",
        payout,
      });
    } catch (error) {
      console.error("Error processing withdrawal:", error);
      ctx.throw(500, "Error processing withdrawal");
    }
  },
};
