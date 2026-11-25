import { NextRequest, NextResponse } from "next/server";
import { handleApiError, requireAuthUser } from "@/lib/auth/api-auth";
import {
  upsertAppointmentType,
  upsertCaseCategory,
  upsertCourt,
  upsertPublicHoliday,
  upsertUserAccount,
} from "@/lib/db/store";
import {
  appointmentTypeInputSchema,
  caseCategoryInputSchema,
  courtInputSchema,
  holidayInputSchema,
  userInputSchema,
} from "@/lib/validation";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuthUser();
    if (auth.error) return auth.error;

    const body = (await req.json()) as {
      entity: "court" | "case_category" | "appointment_type" | "public_holiday" | "user";
      id?: string;
      payload: Record<string, unknown>;
    };

    switch (body.entity) {
      case "court": {
        const parsed = courtInputSchema.safeParse(body.payload);
        if (!parsed.success) {
          return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
        }
        return NextResponse.json({ item: upsertCourt(auth.user, { ...parsed.data, id: body.id }) });
      }
      case "case_category": {
        const parsed = caseCategoryInputSchema.safeParse(body.payload);
        if (!parsed.success) {
          return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
        }
        return NextResponse.json({
          item: upsertCaseCategory(auth.user, { ...parsed.data, id: body.id }),
        });
      }
      case "appointment_type": {
        const parsed = appointmentTypeInputSchema.safeParse(body.payload);
        if (!parsed.success) {
          return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
        }
        return NextResponse.json({
          item: upsertAppointmentType(auth.user, { ...parsed.data, id: body.id }),
        });
      }
      case "public_holiday": {
        const parsed = holidayInputSchema.safeParse(body.payload);
        if (!parsed.success) {
          return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
        }
        return NextResponse.json({
          item: upsertPublicHoliday(auth.user, { ...parsed.data, id: body.id }),
        });
      }
      case "user": {
        const parsed = userInputSchema.safeParse(body.payload);
        if (!parsed.success) {
          return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
        }
        return NextResponse.json({
          item: upsertUserAccount(auth.user, { ...parsed.data, id: body.id }),
        });
      }
      default:
        return NextResponse.json({ error: "ประเภทข้อมูลไม่ถูกต้อง" }, { status: 400 });
    }
  } catch (err) {
    return handleApiError(err);
  }
}
