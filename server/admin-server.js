import express from "express";
import cors from "cors";
import admin from "firebase-admin";

const app = express();
app.use(cors());
app.use(express.json());

// Load Firebase Admin key from Replit Secrets
admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_ADMIN_KEY))
});

// Only allow your super admin
const SUPER_ADMIN_EMAIL = "sb4549@k12.sd.us";

// Middleware to verify super admin
function verifySuperAdmin(req, res, next) {
  if (req.headers["x-admin-email"] !== SUPER_ADMIN_EMAIL) {
    return res.status(403).json({ error: "Not authorized" });
  }
  next();
}

// Delete user by email
app.post("/deleteUser", verifySuperAdmin, async (req, res) => {
  const { email } = req.body;

  try {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().deleteUser(user.uid);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.listen(3001, () => console.log("Admin server running on port 3001"));
