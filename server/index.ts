import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite_setup";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import cors from "cors";
import admin from "firebase-admin";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================
// FIREBASE ADMIN INITIALIZATION
// ============================
admin.initializeApp({
  credential: admin.credential.cert(
    JSON.parse(process.env.FIREBASE_ADMIN_KEY as string)
  ),
  databaseURL: "https://welding-form-default-rtdb.firebaseio.com"
});


// ============================
// EXPRESS SETUP
// ============================
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }
      log(logLine);
    }
  });

  next();
});

// ============================
// ROLE‑BASED SUPERVISOR CHECK
// ============================
async function verifySupervisor(req: Request, res: Response, next: NextFunction) {
  try {
    const idToken = req.headers.authorization?.split("Bearer ")[1];
    if (!idToken) {
      return res.status(401).json({ error: "Missing auth token" });
    }

    // Verify Firebase Auth token
    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;

    // Load user role from Realtime Database
    const snap = await admin.database().ref("users/" + uid).once("value");
    const userData = snap.val();

    if (!userData || userData.role !== "supervisor") {
      return res.status(403).json({ error: "Not authorized" });
    }

    (req as any).supervisorUid = uid;
    next();
  } catch (err) {
    console.error(err);
    return res.status(403).json({ error: "Invalid or expired token" });
  }
}

// ============================
// ADMIN ROUTES (SUPERVISOR ONLY)
// ============================

// List users
app.get("/api/users", verifySupervisor, async (_req: Request, res: Response) => {
  try {
    const list = await admin.auth().listUsers(1000);
    const users = list.users.map((u) => ({
      uid: u.uid,
      email: u.email,
      createdAt: u.metadata.creationTime,
      lastLoginAt: u.metadata.lastSignInTime,
    }));
    res.json({ users });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Create user
app.post("/api/createUser", verifySupervisor, async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password required." });

  try {
    const user = await admin.auth().createUser({ email, password });
    res.json({ success: true, uid: user.uid });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Update email
app.post("/api/updateEmail", verifySupervisor, async (req: Request, res: Response) => {
  const { uid, email } = req.body;
  if (!uid || !email) return res.status(400).json({ error: "UID and new email required." });

  try {
    await admin.auth().updateUser(uid, { email });
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Update password
app.post("/api/updatePassword", verifySupervisor, async (req: Request, res: Response) => {
  const { uid, password } = req.body;
  if (!uid || !password) return res.status(400).json({ error: "UID and new password required." });

  try {
    await admin.auth().updateUser(uid, { password });
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Delete user (Auth + DB)
app.post("/api/deleteUser", verifySupervisor, async (req: Request, res: Response) => {
  const { uid } = req.body;
  if (!uid) return res.status(400).json({ error: "UID required." });

  try {
    await admin.auth().deleteUser(uid);
    await admin.database().ref("users/" + uid).remove();
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ============================
// SERVER + STATIC FILES
// ============================
(async () => {
  const server = createServer(app);

  await registerRoutes(server, app);

  app.get("/teacher", (req, res) => {
    res.sendFile(path.resolve(__dirname, "..", "client", "teacher.html"));
  });

  app.get("/tanks", (req, res) => {
    res.sendFile(path.resolve(__dirname, "..", "client", "tanks.html"));
  });

  app.get("/test", (req, res) => {
    res.sendFile(path.resolve(__dirname, "..", "client", "test.html"));
  });

  app.get("/student", (req, res) => {
    res.sendFile(path.resolve(__dirname, "..", "client", "index.html"));
  });

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const PORT = 5000;
  server.listen(PORT, "0.0.0.0", () => {
    log(`serving on port ${PORT}`);
  });
})();
