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
  // 1. Check Clerk authentication first (if signed in via Clerk)
  if (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    try {
      const { userId: clerkUserId } = await auth();
      if (clerkUserId) {
        const clerkProfile = await currentUser();
        const email =
          clerkProfile?.primaryEmailAddress?.emailAddress ||
          clerkProfile?.emailAddresses?.[0]?.emailAddress ||
          "";
        const fullName =
          [clerkProfile?.firstName, clerkProfile?.lastName]
            .filter(Boolean)
            .join(" ")
            .trim() ||
          clerkProfile?.username ||
          (email ? email.split("@")[0] : "ผู้ใช้งาน");

        if (isSupabaseConfigured()) {
          const dbClient =
            createSupabaseAdminClient() || (await createSupabaseServerClient());

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
              await dbClient
                .from("users")
                .update({ clerk_user_id: clerkUserId })
                .eq("id", byEmail.id);
              profile = { ...byEmail, clerk_user_id: clerkUserId };
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
            clerk_user_id: clerkUserId,
            created_at: new Date().toISOString(),
          },
        };
      }
    } catch {
      // Fall through to Supabase Auth / Local session if Clerk auth check is unavailable
    }
  }

  // 2. Supabase Auth fallback (allows Supabase email/password login simultaneously)
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

  // 3. Local JSON fallback mode
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
