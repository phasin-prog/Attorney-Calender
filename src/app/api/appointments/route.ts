import { NextRequest, NextResponse } from "next/server";
import { handleApiError, requireAuthUser } from "@/lib/auth/api-auth";
import { createAppointmentRecord } from "@/lib/db/store";
import { appointmentInputSchema } from "@/lib/validation";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuthUser();
    if (auth.error) return auth.error;

    const body = await req.json();
    const parsed = appointmentInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "ข้อมูลนัดหมายไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    const d = parsed.data;
    const created = createAppointmentRecord(auth.user, {
      title: d.title,
      appointment_date: d.appointment_date,
      category: d.category,
      appointment_type: d.appointment_type,
      start_time: d.start_time ?? null,
      end_time: d.end_time ?? null,
      case_id: d.case_id ?? null,
      court_id: d.court_id ?? null,
      location: d.location ?? "",
      responsible_user_id: d.responsible_user_id,
      visibility: d.visibility,
      description: d.description ?? "",
      status: d.status,
      reminder_1_day: d.reminder_1_day,
      reminder_same_day: d.reminder_same_day,
      force_duplicate: d.force_duplicate,
    });

    return NextResponse.json({ appointment: created }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
