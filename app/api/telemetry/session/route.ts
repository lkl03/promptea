// app/api/telemetry/session/route.ts
import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase/admin";

export const runtime = "nodejs";

function todayKey(d = new Date()) {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return NextResponse.json({ error: "Unsupported content-type" }, { status: 415 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const sessionId = String(body?.sessionId ?? "").trim();
  const lang = body?.lang === "en" ? "en" : "es";

  // ✅ No confíes en projectId del cliente
  const projectId = process.env.FIREBASE_PROJECT_ID ?? null;

  if (sessionId.length < 10) {
    return NextResponse.json({ error: "Invalid sessionId" }, { status: 400 });
  }

  const db = getAdminFirestore();
  const sessionsRef = db.collection("telemetry_sessions").doc(sessionId);

  const day = todayKey();
  const metricsRef = db.collection("telemetry_metrics_daily").doc(day);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(sessionsRef);

    if (!snap.exists) {
      tx.set(
        sessionsRef,
        {
          sessionId,
          projectId,
          lang,
          firstSeenAt: FieldValue.serverTimestamp(),
          lastSeenAt: FieldValue.serverTimestamp(),
          lastSeenDate: day,
        },
        { merge: true }
      );

      tx.set(
        metricsRef,
        {
          day,
          dau: FieldValue.increment(1),
          newSessions: FieldValue.increment(1),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      return;
    }

    const lastSeenDate = String(snap.data()?.lastSeenDate ?? "");
    const isNewDay = lastSeenDate !== day;

    tx.set(
      sessionsRef,
      {
        projectId,
        lang,
        lastSeenAt: FieldValue.serverTimestamp(),
        lastSeenDate: day,
      },
      { merge: true }
    );

    if (isNewDay) {
      tx.set(
        metricsRef,
        {
          day,
          dau: FieldValue.increment(1),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }
  });

  return NextResponse.json({ ok: true }, { status: 200 });
}
