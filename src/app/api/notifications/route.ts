import { NextRequest, NextResponse } from "next/server";
import { handleApiError, requireAuthUser } from "@/lib/auth/api-auth";
import { markAllNotificationsRead, markNotificationRead } from "@/lib/db/store";

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAuthUser();
    if (auth.error) return auth.error;

    const body = (await req.json()) as { id?: string; all?: boolean };
    if (body.all) {
      markAllNotificationsRead(auth.user.id);
    } else if (body.id) {
      markNotificationRead(auth.user.id, body.id);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
