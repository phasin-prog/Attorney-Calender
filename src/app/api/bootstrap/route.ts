import { NextRequest, NextResponse } from "next/server";
import { getOptionalAuthUser, handleApiError } from "@/lib/auth/api-auth";
import { getBootstrapData, getPublicBootstrapData } from "@/lib/db/store";
import {
  getSupabaseBootstrapData,
  getSupabasePublicBootstrapData,
} from "@/lib/db/supabase-store";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET(req: NextRequest) {
  try {
    const scopeParam = req.nextUrl.searchParams.get("scope");
    const scope = scopeParam === "dynamic" ? "dynamic" : "full";
    const user = await getOptionalAuthUser();

    if (isSupabaseConfigured()) {
      if (user) {
        return NextResponse.json(await getSupabaseBootstrapData(user, scope));
      }
      return NextResponse.json(await getSupabasePublicBootstrapData(scope));
    }

    if (user) {
      return NextResponse.json(getBootstrapData(user));
    }
    return NextResponse.json(getPublicBootstrapData());
  } catch (err) {
    return handleApiError(err);
  }
}
