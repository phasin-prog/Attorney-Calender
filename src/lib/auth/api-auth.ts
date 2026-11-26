import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { ConflictError, getUserById, ValidationError } from "@/lib/db/store";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";
import type { User } from "@/types/domain";

export async function requireAuthUser(): Promise<
  { user: User; error?: never } | { user?: never; error: NextResponse }
> {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser || !authUser.email) {
      return {
        error: NextResponse.json(
          { error: "กรุณาเข้าสู่ระบบก่อนใช้งาน" },
          { status: 401 }
        ),
      };
    }

    // Look up profile in public.users by id or email
    const dbClient = createSupabaseAdminClient() || supabase;
    const { data: byId } = await dbClient
      .from("users")
      .select("*")
      .eq("id", authUser.id)
      .maybeSingle();

    const profile =
      byId ||
      (
        await dbClient
          .from("users")
          .select("*")
          .eq("email", authUser.email)
          .maybeSingle()
      ).data;

    if (profile) {
      if (!profile.is_active) {
        return {
          error: NextResponse.json(
            { error: "บัญชีผู้ใช้ถูกระงับการใช้งาน" },
            { status: 401 }
          ),
        };
      }
      return { user: profile as User };
    }

    // Auto-provision public.users profile on first Supabase Auth login
    const { count } = await dbClient
      .from("users")
      .select("id", { count: "exact", head: true });

    const newProfile: User = {
      id: authUser.id,
      full_name:
        (authUser.user_metadata?.full_name as string) ||
        authUser.email.split("@")[0],
      email: authUser.email,
      role: (count ?? 0) === 0 ? "admin" : "staff",
      is_active: true,
      created_at: new Date().toISOString(),
    };

    const { data: inserted, error: insertErr } = await dbClient
      .from("users")
      .insert(newProfile)
      .select("*")
      .single();

    if (insertErr || !inserted) {
      return {
        error: NextResponse.json(
          { error: "ไม่พบข้อมูลโปรไฟล์ผู้ใช้ในฐานข้อมูล" },
          { status: 401 }
        ),
      };
    }

    return { user: inserted as User };
  }

  // Local fallback mode (when Supabase env vars are not set)
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

export async function getOptionalAuthUser(): Promise<User | null> {
  const res = await requireAuthUser();
  return res.user ?? null;
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
