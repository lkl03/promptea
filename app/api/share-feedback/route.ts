import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";

export const runtime = "nodejs";

const BodySchema = z.object({
  message: z.string().min(5).max(4000),
  email: z.string().email().optional().nullable(),
  analysisId: z.string().min(10).optional().nullable(),
  sessionId: z.string().min(10).optional().nullable(),
  lang: z.enum(["es", "en"]).optional(),
  purpose: z.string().optional().nullable(),
  target: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return NextResponse.json({ error: "Unsupported content-type" }, { status: 415 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation error", details: parsed.error.flatten() }, { status: 400 });
  }

  const { message, email, analysisId, sessionId, lang, purpose, target } = parsed.data;

  const resend = new Resend(process.env.RESEND_API_KEY);
  const to = process.env.FEEDBACK_EMAIL_TO || "contact.eterlab@gmail.com";
  const from = process.env.FEEDBACK_EMAIL_FROM || "Promptea <onboarding@resend.dev>";

  const subject = "Feedback Promptea";

  const text = [
    `Mensaje:`,
    message,
    "",
    `---`,
    `Meta:`,
    email ? `replyTo: ${email}` : `replyTo: (none)`,
    analysisId ? `analysisId: ${analysisId}` : `analysisId: (none)`,
    sessionId ? `sessionId: ${sessionId}` : `sessionId: (none)`,
    lang ? `lang: ${lang}` : `lang: (none)`,
    purpose ? `purpose: ${purpose}` : `purpose: (none)`,
    target ? `target: ${target}` : `target: (none)`,
  ].join("\n");

  try {
    await resend.emails.send({
      from,
      to: [to],
      subject,
      text,
      replyTo: email ?? undefined,
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Email send failed" }, { status: 500 });
  }
}
