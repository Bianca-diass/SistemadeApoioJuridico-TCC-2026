const admin = require("firebase-admin");
const path = require("path");

const serviceAccount = require(path.join(
  __dirname,
  "../../firebase-key.json"
));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket:
    process.env.FIREBASE_STORAGE_BUCKET ||
    "sistema-juridico-digital.firebasestorage.app"
});

const db = admin.firestore();

const bucket = admin.storage().bucket();

module.exports = {
  admin,
  db,
  bucket
};