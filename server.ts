import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load Firebase Config
const firebaseConfig = JSON.parse(fs.readFileSync(path.join(__dirname, "firebase-applet-config.json"), "utf8"));

// Initialize Firebase Admin
const adminApp = admin.initializeApp({
  projectId: firebaseConfig.projectId,
});

const db = getFirestore(adminApp, firebaseConfig.firestoreDatabaseId);
const auth = admin.auth();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Middleware to verify admin
  const verifyAdmin = async (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const decodedToken = await auth.verifyIdToken(token);
      const userDoc = await db.collection('users').doc(decodedToken.uid).get();
      const userData = userDoc.data();
      
      // Hardcoded admin email fallback or role check
      const isAdmin = userData?.role === 'admin' || decodedToken.email === "jasminhalilovic122@gmail.com";
      
      if (!isAdmin) return res.status(403).json({ error: 'Forbidden' });
      req.user = decodedToken;
      next();
    } catch (error) {
      res.status(401).json({ error: 'Invalid token' });
    }
  };

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Create Worker
  app.post("/api/admin/workers", verifyAdmin, async (req, res) => {
    const { email, password, name, role, phone } = req.body;
    try {
      // 1. Create in Firebase Auth
      const userRecord = await auth.createUser({
        email,
        password,
        displayName: name,
        phoneNumber: phone.startsWith('+') ? phone : undefined, // Firebase requires E.164
      });

      // 2. Create profile in Firestore
      await db.collection('users').doc(userRecord.uid).set({
        uid: userRecord.uid,
        name,
        email,
        phone,
        role: 'worker',
        workerRole: role,
        joinedAt: new Date().toISOString(),
        permissions: {
          canManageMenu: false,
          canManageOrders: true,
          canManageReservations: true,
          canManageWorkers: false
        }
      });

      res.json({ uid: userRecord.uid });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Delete Worker
  app.delete("/api/admin/workers/:uid", verifyAdmin, async (req, res) => {
    const { uid } = req.params;
    try {
      await auth.deleteUser(uid);
      await db.collection('users').doc(uid).delete();
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
