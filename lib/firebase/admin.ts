// lib/firebase/admin.ts
import "server-only";

import type { ServiceAccount } from "firebase-admin";
import type { App } from "firebase-admin/app";
import type { Firestore } from "firebase-admin/firestore";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function parseServiceAccountFromBase64(): ServiceAccount {
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (!b64) throw new Error("Missing env FIREBASE_SERVICE_ACCOUNT_BASE64");

  const json = Buffer.from(b64, "base64").toString("utf8");
  const parsed = JSON.parse(json);

  // Normaliza private_key si viene con \\n
  if (typeof parsed?.private_key === "string") {
    parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
  }

  return parsed as ServiceAccount;
}

// ✅ Persistimos en globalThis para que Turbopack/Hot Reload no re-ejecute settings()
const g = globalThis as unknown as {
  __PROMPTEA_ADMIN_APP__?: App;
  __PROMPTEA_ADMIN_DB__?: Firestore;
};

export function getAdminApp(): App {
  // firebase-admin ya cachea apps; esto es extra-safe con HMR
  if (getApps().length > 0) return getApps()[0]!;
  if (g.__PROMPTEA_ADMIN_APP__) return g.__PROMPTEA_ADMIN_APP__;

  const serviceAccount = parseServiceAccountFromBase64();
  const projectId = process.env.FIREBASE_PROJECT_ID ?? (serviceAccount as any).project_id;

  const app = initializeApp({
    credential: cert(serviceAccount),
    projectId,
  });

  g.__PROMPTEA_ADMIN_APP__ = app;
  return app;
}

export function getAdminFirestore(): Firestore {
  if (g.__PROMPTEA_ADMIN_DB__) return g.__PROMPTEA_ADMIN_DB__;

  const app = getAdminApp();
  const db = getFirestore(app);

  // ✅ settings() UNA sola vez, antes de cualquier otro método
  db.settings({ ignoreUndefinedProperties: true });

  g.__PROMPTEA_ADMIN_DB__ = db;
  return db;
}

