import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { readDb, upsertUserAccount } from "@/lib/db/store";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { registerSchema } from "@/lib/validation";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "ข้อมูลสมัครใช้งานไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    const { full_name, email, password } = parsed.data;

    if (isSupabaseConfigured()) {
      const supabase = await createSupabaseServerClient();
      const dbClient = createSupabaseAdminClient() || supabase;

      // Enforce 5-account office limit
      const { count } = await dbClient
        .from("users")
        .select("id", { count: "exact", head: true });
      if ((count ?? 0) >= 5) {
        return NextResponse.json(
          { error: "สำนักงานมีบัญชีผู้ใช้งานครบ 5 บัญชีแล้ว กรุณาติดต่อผู้ดูแลระบบ" },
          { status: 400 }
        );
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name },
        },
      });

      if (error || !data.user) {
        return NextResponse.json(
          { error: error?.message || "สมัครใช้งานไม่สำเร็จ" },
          { status: 400 }
        );
      }

      // Provision profile in public.users immediately if possible
      const role = (count ?? 0) === 0 ? "admin" : "staff";
      await dbClient.from("users").upsert(
        {
          id: data.user.id,
          full_name,
          email,
          role,
          is_active: true,
        },
        { onConflict: "email" }
      );

      return NextResponse.json({
        user: data.user,
        needsEmailConfirmation: !data.session,
      });
    }

    // Local fallback mode
    const db = readDb();
    const firstAdmin = db.users[0];
    const created = upsertUserAccount(firstAdmin, {
      full_name,
      email,
      role: "staff",
      is_active: true,
      password,
    });
    const token = createSessionToken(created.id, created.email);
    const res = NextResponse.json({ user: created, needsEmailConfirmation: false });
    res.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "สมัครใช้งานไม่สำเร็จ";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
