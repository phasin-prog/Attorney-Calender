import crypto from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "lc_session";
const SECRET = process.env.SESSION_SECRET || "lawyer-calendar-local-dev-secret-2569";

interface SessionPayload {
  userId: string;
  email: string;
  exp: number;
}

function sign(payloadB64: string): string {
  return crypto.createHmac("sha256", SECRET).update(payloadB64).digest("base64url");
}

export function createSessionToken(userId: string, email: string): string {
  const payload: SessionPayload = {
    userId,
    email,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload), "utf-8").toString("base64url");
  const sig = sign(payloadB64);
  return `${payloadB64}.${sig}`;
}

export function verifySessionToken(token: string | undefined): SessionPayload | null {
  if (!token || !token.includes(".")) return null;
  const [payloadB64, sig] = token.split(".");
  if (!payloadB64 || !sig) return null;
  const expected = sign(payloadB64);
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf-8")) as SessionPayload;
    if (!parsed.userId || parsed.exp < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function getSessionUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const payload = verifySessionToken(token);
  return payload?.userId ?? null;
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
