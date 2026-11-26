import { auth, currentUser } from "@clerk/nextjs/server";
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
  // 1. Check Clerk authentication first when Clerk is configured
  if (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return {
        error: NextResponse.json(
          { error: "กรุณาเข้าสู่ระบบก่อนใช้งาน" },
          { status: 401 }
        ),
      };
    }

    const clerkProfile = await currentUser();
    const email =
      clerkProfile?.primaryEmailAddress?.emailAddress ||
      clerkProfile?.emailAddresses?.[0]?.emailAddress ||
      "";
    const fullName =
      [clerkProfile?.firstName, clerkProfile?.lastName].filter(Boolean).join(" ").trim() ||
      clerkProfile?.username ||
      (email ? email.split("@")[0] : "ผู้ใช้งาน");

    if (isSupabaseConfigured()) {
      const dbClient =
        createSupabaseAdminClient() || (await createSupabaseServerClient());

      // Match by clerk_user_id first (if column exists), then fallback to email
      const { data: byClerkId } = await dbClient
        .from("users")
        .select("*")
        .eq("clerk_user_id", clerkUserId)
        .maybeSingle();

      let profile = byClerkId;
      if (!profile && email) {
        const { data: byEmail } = await dbClient
          .from("users")
          .select("*")
          .eq("email", email)
          .maybeSingle();
        if (byEmail) {
          profile = byEmail;
          // Link clerk_user_id to existing Supabase user row (ignore if column not migrated yet)
          await dbClient
            .from("users")
            .update({ clerk_user_id: clerkUserId })
            .eq("id", byEmail.id);
        }
      }

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

      // Auto-provision new public.users row for new Clerk user
      const { count } = await dbClient
        .from("users")
        .select("id", { count: "exact", head: true });

      const newId = crypto.randomUUID();
      const newProfile = {
        id: newId,
        full_name: fullName,
        email: email || `${clerkUserId}@clerk.local`,
        role: (count ?? 0) === 0 ? "admin" : "staff",
        is_active: true,
        clerk_user_id: clerkUserId,
        created_at: new Date().toISOString(),
      };

      const { data: inserted, error: insertErr } = await dbClient
        .from("users")
        .insert(newProfile)
        .select("*")
        .single();

      if (insertErr || !inserted) {
        // Retry insert without clerk_user_id if migration 008 hasn't been run yet
        const { clerk_user_id: _omit, ...fallbackProfile } = newProfile;
        const { data: fallbackInserted, error: fallbackErr } = await dbClient
          .from("users")
          .insert(fallbackProfile)
          .select("*")
          .single();

        if (fallbackErr || !fallbackInserted) {
          return {
            error: NextResponse.json(
              { error: "ไม่สามารถสร้างโปรไฟล์ผู้ใช้ในฐานข้อมูลได้" },
              { status: 401 }
            ),
          };
        }
        return { user: fallbackInserted as User };
      }

      return { user: inserted as User };
    }

    // Clerk + Local JSON store fallback
    return {
      user: {
        id: clerkUserId,
        full_name: fullName,
        email,
        role: "admin",
        is_active: true,
        created_at: new Date().toISOString(),
      },
    };
  }

  // Legacy Local fallback mode (when Clerk keys are not set)
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
