import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { authenticateUser } from "@/lib/db/store";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/validation";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "ข้อมูลเข้าสู่ระบบไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    if (isSupabaseConfigured()) {
      const supabase = await createSupabaseServerClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: parsed.data.email,
        password: parsed.data.password,
      });

      if (error || !data.user) {
        return NextResponse.json(
          { error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง หรือบัญชีไม่ได้รับอนุญาต" },
          { status: 401 }
        );
      }
      return NextResponse.json({ user: data.user });
    }

    const user = authenticateUser(parsed.data.email, parsed.data.password);
    if (!user) {
      return NextResponse.json(
        { error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง หรือบัญชีถูกระงับ" },
        { status: 401 }
      );
    }

    const token = createSessionToken(user.id, user.email);
    const res = NextResponse.json({ user });
    res.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch {
    return NextResponse.json({ error: "ไม่สามารถเข้าสู่ระบบได้" }, { status: 500 });
  }
}
