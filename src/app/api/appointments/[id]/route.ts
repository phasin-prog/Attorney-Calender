import { NextRequest, NextResponse } from "next/server";
import { handleApiError, requireAuthUser } from "@/lib/auth/api-auth";
import {
  restoreAppointmentRecord,
  softDeleteAppointmentRecord,
  updateAppointmentRecord,
} from "@/lib/db/store";
import {
  restoreSupabaseAppointment,
  softDeleteSupabaseAppointment,
  updateSupabaseAppointment,
} from "@/lib/db/supabase-store";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { appointmentInputSchema } from "@/lib/validation";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuthUser();
    if (auth.error) return auth.error;

    const { id } = await context.params;
    const body = await req.json();
    const parsed = appointmentInputSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "ข้อมูลนัดหมายไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    const updated = isSupabaseConfigured()
      ? await updateSupabaseAppointment(auth.user, id, parsed.data)
      : updateAppointmentRecord(auth.user, id, parsed.data);
    return NextResponse.json({ appointment: updated });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuthUser();
    if (auth.error) return auth.error;

    const { id } = await context.params;
    if (isSupabaseConfigured()) {
      await softDeleteSupabaseAppointment(auth.user, id);
    } else {
      softDeleteAppointmentRecord(auth.user, id);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuthUser();
    if (auth.error) return auth.error;

    const { id } = await context.params;
    const restored = isSupabaseConfigured()
      ? await restoreSupabaseAppointment(auth.user, id)
      : restoreAppointmentRecord(auth.user, id);
    return NextResponse.json({ appointment: restored });
  } catch (err) {
    return handleApiError(err);
  }
}
