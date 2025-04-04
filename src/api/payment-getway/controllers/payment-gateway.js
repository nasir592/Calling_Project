
const crypto = require("crypto");

const axios = require('axios');


module.exports = {
  async initiatePayment(ctx) {


    console.log(ctx.request.body);
    const settings = await strapi.entityService.findMany("api::app-config.app-config", { limit: 1 });
    console.log("Settings:", settings);
    

if (!settings || !settings.Payment_MerchantKey || !settings.Payment_Salt) {
    return ctx.badRequest({ message: "Missing configuration settings likes Key." });
}

const merchantKey = settings.Payment_MerchantKey;
const salt = settings.Payment_Salt;


console.log(ctx.request.body);


    try {

      const { amount, userId, email, phone } = ctx.request.body;
      if (!amount || !userId || !phone) {
        return ctx.badRequest("Missing required fields");
      }

      console.log(ctx.request.body);
      

      const txnId = `TXN${userId}_${Date.now()}`;;
      const productInfo = "Wallet Recharge";
      const firstName = "User";
      const surl = "http://localhost:1337/api/payu/success";
      const furl = "http://localhost:1337/api/payu/failure";

      // ✅ Correct Hash String
      const hashString = `${merchantKey}|${txnId}|${amount}|${productInfo}|${firstName}|${email || ""}|||||||||||${salt}`;
      const hash = crypto.createHash("sha512").update(hashString).digest("hex");

      return ctx.send({ status: "success", payuData: {
        key: merchantKey,
        txnid: txnId,
        amount,
        productinfo: productInfo,
        firstname: firstName,
        email,
        phone,
        surl,
        furl,
        hash,
        userId,
        service_provider: "payu_paisa",
      }});
    } catch (error) {
      return ctx.send({ status: "error", message: error.message });
    }
  },

  async handlePaymentResponse(ctx) {

   

    const settings = await strapi.entityService.findMany("api::app-config.app-config", 1);

    console.log(settings);
    
    if (!settings || !settings.Payment_MerchantKey || !settings.Payment_Salt) {
    return ctx.badRequest({ message: "Missing configuration settings likes Key." });
      }

    const merchantKey = settings.Payment_MerchantKey;
    const salt = settings.Payment_Salt;


    try {
  
      const {
        txnid,
        status,
        hash: receivedHash,
        amount,
        firstname,
        email,
        additionalCharges,
        productinfo = "Wallet Recharge",
      
      } = ctx.request.body;
  
      
       // User ID (if applicable)

       const userId = ctx.request.body.udf1 || "";
      // ✅ Ensure correct formatting
      const amountStr = parseFloat(amount).toFixed(2); // Always format to 2 decimal places
      const txnidStr = txnid.trim();
      const emailStr = email ? email.trim() : "";
      const firstnameStr = firstname ? firstname.trim() : "User";
  
      // ✅ Construct hash string in correct order (PayU format)
      let hashString;
      if (additionalCharges) {
        hashString = `${additionalCharges}|${salt}|${status}||||||||||${userId}|${emailStr}|${firstnameStr}|${productinfo}|${amountStr}|${txnidStr}|${merchantKey}`;
      } else {
        hashString = `${salt}|${status}||||||||||${userId}|${emailStr}|${firstnameStr}|${productinfo}|${amountStr}|${txnidStr}|${merchantKey}`;
      }
  

  
      const calculatedHash = crypto.createHash("sha512").update(hashString).digest("hex");
  
  
      if (calculatedHash !== receivedHash) {
        return ctx.send({
          status: "error",
          message: "Hash mismatch, possible data tampering",
          debug: {
            receivedHash,
            calculatedHash,
            hashString
          }
        });
      }
  
      if (status === "success") {
        console.log("✅ Payment successful, updating wallet...");
    
        const txnidStr = txnid.trim();
        const UserId = txnidStr.split("_")[0].replace("TXN", ""); // Extract userId
        console.log("🔹 Extracted User ID:", UserId);
    
        if (!UserId) {
            return ctx.badRequest("User ID missing in response");
        }
    
        const parsedUserId = Number(UserId);
        if (isNaN(parsedUserId)) {
            console.error("🚨 Invalid UserId:", UserId);
            return ctx.badRequest("Invalid User ID");
        }
    
        // ✅ 1️⃣ Fetch or Create Wallet
        let wallet = await strapi.entityService.findMany("api::wallet.wallet", {
            filters: { user: parsedUserId },
            populate: ["transactions"],
        });
    
        let walletId;
        let currentBalance = 0;
    
        if (!wallet || wallet.length === 0) {
            console.warn("⚠️ Wallet not found for user:", parsedUserId);
    
            // ✅ Create New Wallet
            const newWallet = await strapi.entityService.create("api::wallet.wallet", {
                data: {
                    user: parsedUserId,
                    balance: 0, // Default balance
                    isActive: true,
                },
            });
    
            walletId = newWallet.id;
            console.log("✅ New Wallet Created:", walletId);
        } else {
            walletId = wallet[0].id;
            currentBalance = Number(wallet[0].balance) || 0;
            console.log("✅ Found Existing Wallet ID:", walletId, "Current Balance:", currentBalance);
        }
    
        // ✅ 2️⃣ Calculate New Wallet Balance
        const paymentAmount = Number(amount);
        const newBalance = (currentBalance + paymentAmount).toFixed(2); // Ensure proper decimal precision
    
        console.log(`💰 Updating wallet ${walletId}: Old Balance: ${currentBalance}, Payment: ${paymentAmount}, New Balance: ${newBalance}`);
    
        // ✅ 3️⃣ Update Wallet Balance and Verify
        const updatedWallet = await strapi.entityService.update("api::wallet.wallet", walletId, {
            data: {
                balance: newBalance,  // ✅ Correct update
            },
        });
    
        console.log("✅ Wallet Updated:", updatedWallet);
    
        // 🔍 **Verification Step: Fetch Wallet Again to Ensure Update**
        const verifyWallet = await strapi.entityService.findOne("api::wallet.wallet", walletId);
        console.log("🔄 Verified Wallet Balance:", verifyWallet.balance);
    
        if (verifyWallet.balance !== newBalance) {
            console.error("🚨 Wallet Balance Mismatch! Expected:", newBalance, "Got:", verifyWallet.balance);
        }
    
        // ✅ 4️⃣ Log the Transaction
        await strapi.entityService.create("api::transaction.transaction", {
            data: {
                wallet: walletId,
                user: parsedUserId,
                order_Id: txnid,
                amount: paymentAmount,
                transactionType: "credit",
                paymentStatus: "completed",
                method: "razorPay",
            }
        });
    
        const user = await strapi.entityService.findOne("api::public-user.public-user", parsedUserId);
    if (!user || !user.email) {
        console.error("🚨 Email not found for user:", parsedUserId);
        return ctx.badRequest("User email not found");
    }
    const userEmail = user.email;

    // ✅ Send Email
    try {
    

     await axios.post('http://localhost:1337/api/send-custom-email', {
  to: userEmail,
  subject: '💰 Payment Successful - Wallet Recharge',
  text: `Dear ${user.name}, your payment of ₹${amount} was successful. Transaction ID: ${txnid}. Wallet balance: ₹${newBalance}.`,
  html: `
  <div style="font-family: 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #eee; border-radius: 10px; background-color: #f9f9f9;">
    <div style="text-align: center;">
      <h2 style="color: #4CAF50;">✅ Payment Successful</h2>
      <p style="font-size: 16px; color: #444;">Hi <strong>${user.name}</strong>,</p>
      <p style="font-size: 16px; color: #444;">We’ve received your payment of <strong>₹${amount}</strong>.</p>
    </div>

    <div style="margin-top: 30px;">
      <table style="width: 100%; border-collapse: collapse; font-size: 15px;">
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">Transaction ID</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>${txnid}</strong></td>
        </tr>
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">Amount</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">₹${amount}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">Updated Wallet Balance</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">₹${newBalance}</td>
        </tr>
      </table>
    </div>

    <div style="margin-top: 40px; text-align: center;">
      <p style="font-size: 14px; color: #888;">Thank you for using our service!</p>
      <p style="font-size: 14px; color: #888;">If you have any questions, feel free to reply to this email.</p>
    </div>

    <div style="margin-top: 20px; text-align: center; font-size: 12px; color: #aaa;">
      © ${new Date().getFullYear()} CE Calling. All rights reserved.
    </div>
  </div>
`,
});

    
      console.log("✅ Payment email sent to:", userEmail);
    } catch (err) {
      console.error("❌ Failed to send payment email:", err);
    }
   

    return ctx.send({
      status: "success",
      message: "Payment processed successfully, wallet updated",
      newBalance: verifyWallet.balance
  });







    } else {
        console.log("❌ Payment failed!");
    
        return ctx.send({
            status: "error",
            message: "Payment failed"
        });
    }
    
    
    
  
    } catch (error) {
      return ctx.send({ status: "error", message: error.message });
    }
  }
  

 
};
