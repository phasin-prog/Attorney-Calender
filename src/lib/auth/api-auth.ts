import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { ConflictError, getUserById, ValidationError } from "@/lib/db/store";
import type { User } from "@/types/domain";

export async function requireAuthUser(): Promise<
  { user: User; error?: never } | { user?: never; error: NextResponse }
> {
  const userId = await getSessionUserId();
  if (!userId) {
    return {
      error: NextResponse.json(
        { error: "กรุณาเข้าสู่ระบบก่อนใช้งาน" },
        { status: 401 }
      ),
    };
  }
  const user = getUserById(userId);
  if (!user) {
    return {
      error: NextResponse.json(
        { error: "บัญชีผู้ใช้ถูกระงับหรือไม่พบในระบบ" },
        { status: 401 }
      ),
    };
  }
  return { user };
}

export function handleApiError(err: unknown) {
  if (err instanceof ConflictError) {
    return NextResponse.json({ error: err.message, code: "CONFLICT" }, { status: 409 });
  }
  if (err instanceof ValidationError) {
    return NextResponse.json(
      { error: err.message, data: err.data ?? null, code: "VALIDATION" },
      { status: 400 }
    );
  }
  console.error("API Error:", err);
  return NextResponse.json(
    { error: "เกิดข้อผิดพลาดภายในระบบ กรุณาลองใหม่อีกครั้ง" },
    { status: 500 }
  );
}
