import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readDb } from "@/lib/db/store";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const forgotSchema = z.object({
  email: z.string().trim().email("กรุณากรอกอีเมลให้ถูกต้อง"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = forgotSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "อีเมลไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    const email = parsed.data.email;
    const origin = req.nextUrl.origin;

    if (isSupabaseConfigured()) {
      const supabase = await createSupabaseServerClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/reset-password`,
      });
      if (error) {
        return NextResponse.json(
          { error: error.message || "ไม่สามารถส่งอีเมลรีเซ็ตรหัสผ่านได้" },
          { status: 400 }
        );
      }
      return NextResponse.json({
        ok: true,
        mode: "supabase",
        message: "ส่งลิงก์รีเซ็ตรหัสผ่านไปยังอีเมลของคุณแล้ว กรุณาตรวจสอบกล่องจดหมาย",
      });
    }

    // Local JSON fallback mode
    const state = readDb();
    const user = state.users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.is_active
    );
    if (!user) {
      return NextResponse.json(
        { error: "ไม่พบบัญชีผู้ใช้งานที่ใช้อีเมลนี้" },
        { status: 404 }
      );
    }
    return NextResponse.json({
      ok: true,
      mode: "local",
      message: "ตรวจสอบบัญชีสำเร็จ สามารถตั้งรหัสผ่านใหม่ได้ทันที",
    });
  } catch {
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการส่งคำขอรีเซ็ตรหัสผ่าน" },
      { status: 500 }
    );
  }
}
