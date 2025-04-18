const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountkey.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    
  });
  console.log("Firebase Admin initialized with credentials:", serviceAccount.project_id);

}

module.exports = admin;
