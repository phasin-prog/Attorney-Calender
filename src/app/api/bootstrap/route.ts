import { NextResponse } from "next/server";
import { handleApiError, requireAuthUser } from "@/lib/auth/api-auth";
import { getBootstrapData } from "@/lib/db/store";

export async function GET() {
  try {
    const auth = await requireAuthUser();
    if (auth.error) return auth.error;
    return NextResponse.json(getBootstrapData(auth.user));
  } catch (err) {
    return handleApiError(err);
  }
}
