import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readDb, writeDb } from "@/lib/db/store";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const resetSchema = z.object({
  email: z.string().trim().email().optional(),
  password: z.string().min(6, "รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = resetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "รหัสผ่านไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    if (isSupabaseConfigured()) {
      const supabase = await createSupabaseServerClient();
      const { error } = await supabase.auth.updateUser({
        password: parsed.data.password,
      });
      if (error) {
        return NextResponse.json(
          { error: error.message || "ไม่สามารถเปลี่ยนรหัสผ่านได้ ลิงก์อาจหมดอายุแล้ว" },
          { status: 400 }
        );
      }
      return NextResponse.json({ ok: true });
    }

    // Local JSON fallback mode
    if (!parsed.data.email) {
      return NextResponse.json({ error: "กรุณาระบุอีเมล" }, { status: 400 });
    }
    const state = readDb();
    const user = state.users.find(
      (u) => u.email.toLowerCase() === parsed.data.email!.toLowerCase() && u.is_active
    );
    if (!user) {
      return NextResponse.json({ error: "ไม่พบบัญชีผู้ใช้" }, { status: 404 });
    }
    state.passwords[user.email] = parsed.data.password;
    writeDb(state);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "ไม่สามารถอัปเดตรหัสผ่านได้" },
      { status: 500 }
    );
  }
}
