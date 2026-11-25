import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getSupabasePublicKey, getSupabaseUrl } from "@/lib/supabase/config";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const url = getSupabaseUrl()!;
  const publicKey = getSupabasePublicKey()!;

  return createServerClient(url, publicKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from Server Component where setting cookies is ignored
        }
      },
    },
  });
}

export function createSupabaseAdminClient() {
  const url = getSupabaseUrl()!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
