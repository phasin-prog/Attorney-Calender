import { NextResponse } from "next/server";
import { handleApiError, requireAuthUser } from "@/lib/auth/api-auth";
import { getBootstrapData } from "@/lib/db/store";
import { getSupabaseBootstrapData } from "@/lib/db/supabase-store";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET() {
  try {
    const auth = await requireAuthUser();
    if (auth.error) return auth.error;
    if (isSupabaseConfigured()) {
      return NextResponse.json(await getSupabaseBootstrapData(auth.user));
    }
    return NextResponse.json(getBootstrapData(auth.user));
  } catch (err) {
    return handleApiError(err);
  }
}
