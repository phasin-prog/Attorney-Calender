import { NextRequest, NextResponse } from "next/server";
import { handleApiError, requireAuthUser } from "@/lib/auth/api-auth";
import {
  upsertAppointmentType,
  upsertCaseCategory,
  upsertCourt,
  upsertPublicHoliday,
  upsertUserAccount,
} from "@/lib/db/store";
import { upsertSupabaseSetting } from "@/lib/db/supabase-store";
import { isSupabaseConfigured } from "@/lib/supabase/config";
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

    const useSupabase = isSupabaseConfigured();

    switch (body.entity) {
      case "court": {
        const parsed = courtInputSchema.safeParse(body.payload);
        if (!parsed.success) {
          return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
        }
        const item = useSupabase
          ? await upsertSupabaseSetting(auth.user, "court", parsed.data, body.id)
          : upsertCourt(auth.user, { ...parsed.data, id: body.id });
        return NextResponse.json({ item });
      }
      case "case_category": {
        const parsed = caseCategoryInputSchema.safeParse(body.payload);
        if (!parsed.success) {
          return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
        }
        const item = useSupabase
          ? await upsertSupabaseSetting(auth.user, "case_category", parsed.data, body.id)
          : upsertCaseCategory(auth.user, { ...parsed.data, id: body.id });
        return NextResponse.json({ item });
      }
      case "appointment_type": {
        const parsed = appointmentTypeInputSchema.safeParse(body.payload);
        if (!parsed.success) {
          return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
        }
        const item = useSupabase
          ? await upsertSupabaseSetting(auth.user, "appointment_type", parsed.data, body.id)
          : upsertAppointmentType(auth.user, { ...parsed.data, id: body.id });
        return NextResponse.json({ item });
      }
      case "public_holiday": {
        const parsed = holidayInputSchema.safeParse(body.payload);
        if (!parsed.success) {
          return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
        }
        const item = useSupabase
          ? await upsertSupabaseSetting(auth.user, "public_holiday", parsed.data, body.id)
          : upsertPublicHoliday(auth.user, { ...parsed.data, id: body.id });
        return NextResponse.json({ item });
      }
      case "user": {
        const parsed = userInputSchema.safeParse(body.payload);
        if (!parsed.success) {
          return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
        }
        const item = useSupabase
          ? await upsertSupabaseSetting(auth.user, "user", parsed.data, body.id)
          : upsertUserAccount(auth.user, { ...parsed.data, id: body.id });
        return NextResponse.json({ item });
      }
      default:
        return NextResponse.json({ error: "ประเภทข้อมูลไม่ถูกต้อง" }, { status: 400 });
    }
  } catch (err) {
    return handleApiError(err);
  }
}
