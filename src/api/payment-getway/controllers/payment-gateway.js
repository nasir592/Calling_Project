
const crypto = require("crypto");

const axios = require('axios');


module.exports = {
  async initiatePayment(ctx) {

    
    const settings = await strapi.entityService.findMany("api::app-config.app-config", { limit: 1 });
    

     if (!settings || !settings.Payment_MerchantKey || !settings.Payment_Salt) {
    return ctx.badRequest({ message: "Missing configuration settings likes Key." });
        }

        const merchantKey = settings.Payment_MerchantKey;
        const salt = settings.Payment_Salt;

    try {

      const { amount, userId, email, phone } = ctx.request.body;
      if (!amount || !userId || !phone) {
        return ctx.badRequest("Missing required fields");
      }


      const txnId = `TXN${userId}_${Date.now()}`;;
      const productInfo = "Wallet Recharge";
      const firstName = "User";
      // const surl = "http://localhost:1337/api/payu/success";
      // const furl = "http://localhost:1337/api/payu/failure";
      const surl = "https://manage.consultease.com/api/payu/success";
      const furl = "https://manage.consultease.com/api/payu/failure";

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
        templateId,
      
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

      const type = "Payment";

        const templates = await strapi.entityService.findMany('api::email-template.email-template', {
            filters: { type },
           limit: 1
           });

       if (!templates || templates.length === 0) {
         return ctx.throw(404, 'Email template not found');
          }

         const template = templates[0]; // Get the first template

// Now you can access: template.officialEmail, template.subject, template.body

    

    await axios.post('https://manage.consultease.com/api/send-custom-email', {
  to: userEmail,
  subject: template.subject,
  html: template.body ,
  data: {
    user,
    amount,
    txnid,
    newBalance,
  }
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
  },
  
  async withdrawToBank(ctx) {
    try {
      const { userId, amount } = ctx.request.body;
      if (!userId || !amount) return ctx.badRequest("Missing required fields");

      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount)) return ctx.badRequest("Invalid amount");
      
      if (parsedAmount <= 0) return ctx.badRequest("Minimum withdrawal amount is $1");

      // 1️⃣ Get user & bank details
      const user = await strapi.entityService.findOne("api::public-user.public-user", userId, {
        populate: { expert_profile: true },
      });

      if (!user || !user.expert_profile) return ctx.badRequest("Expert not found");

      const profile = user.expert_profile;
      const { accountNumber, ifscCode, accountHolderName } = profile;

      if (!accountNumber || !ifscCode || !accountHolderName) {
        return ctx.badRequest("Bank details incomplete");
      }

      // 2️⃣ Fetch wallet
      const wallets = await strapi.entityService.findMany("api::wallet.wallet", {
        filters: { user: userId },
        populate: true,
      });

      if (!wallets || wallets.length === 0) return ctx.badRequest("Wallet not found");

      const wallet = wallets[0];
      if (wallet.balance < parsedAmount) return ctx.badRequest("Insufficient balance");

      // 3️⃣ Deduct amount immediately (prevent multiple withdrawals)
      const newBalance = (wallet.balance - parsedAmount).toFixed(2);
      await strapi.entityService.update("api::wallet.wallet", wallet.id, {
        data: { balance: newBalance },
      });

      // 4️⃣ Get PayU access token
      const accessToken = await getPayUAccessToken();

      // 5️⃣ Initiate payout
      const merchantRefId = `WITHDRAW_${userId}_${Date.now()}`;


      const payoutResponse = await initiatePayUPayout({
        amount: parsedAmount,
        accountNumber,
        ifsc: ifscCode,
        name: accountHolderName,
        referenceId: merchantRefId,
        token: accessToken,
      });

      // 6️⃣ Log withdrawal request
      await strapi.entityService.create("api::withdrawal-request.withdrawal-request", {
        data: {
          user: userId,
          amount: parsedAmount,
          bankDetails: {
            accountHolderName,
            accountNumber,
            ifscCode,
          },
          status: "completed",
          remarks: `PayU Ref: ${payoutResponse?.data?.merchant_ref_id || "N/A"}`,
        },
      });

      // 7️⃣ Transaction log
      await strapi.entityService.create("api::transaction.transaction", {
        data: {
          wallet: wallet.id,
          user: userId,
          order_Id: merchantRefId,
          amount: parsedAmount,
          transactionType: "debit",
          paymentStatus: "completed",
          method: "bankTransfer",
        },
      });

      return ctx.send({
        status: "success",
        message: "Withdrawal initiated successfully",
        payoutResponse,
        newBalance,
      });

    } catch (error) {
      console.error("❌ Withdrawal Failed:", error);
      return ctx.send({ status: "error", message: error.message });
    }
  },

  async initiatePayUPayout({ amount, accountNumber, ifsc, name, referenceId, token }) {
    try {
      const response = await axios.post(
        "https://uat-payout.payu.in/payout/v1/account/transfer",
        {
          account_number: accountNumber,
          ifsc: ifsc,
          amount: parseFloat(amount),
          merchant_ref_id: referenceId,
          narrative: "Expert Wallet Withdrawal",
          payee_name: name
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
        }
      );
  
      return response.data;
    } catch (error) {
      console.error("❌ PayU payout error:", error.response?.data || error.message);
      throw error;
    }
  },
};

  
