import { NextRequest, NextResponse } from "next/server";
import { handleApiError, requireAuthUser } from "@/lib/auth/api-auth";
import { createCaseRecord } from "@/lib/db/store";
import { createSupabaseCase } from "@/lib/db/supabase-store";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { caseInputSchema } from "@/lib/validation";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuthUser();
    if (auth.error) return auth.error;

    const body = await req.json();
    const parsed = caseInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "ข้อมูลคดีไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    const d = parsed.data;
    const payload = {
      court_id: d.court_id,
      category_id: d.category_id,
      black_case_number: d.black_case_number,
      case_year: d.case_year,
      plaintiff_name: d.plaintiff_name ?? "",
      defendant_name: d.defendant_name ?? "",
      plaintiffs: d.plaintiffs,
      defendants: d.defendants,
      our_role: d.our_role,
      court_level: d.court_level,
      responsible_user_id: d.responsible_user_id,
      status: d.status,
      notes: d.notes ?? "",
      case_notes: d.case_notes,
      client_phone: d.client_phone ?? "",
      client_contact_name: d.client_contact_name ?? "",
    };

    const created = isSupabaseConfigured()
      ? await createSupabaseCase(auth.user, payload)
      : createCaseRecord(auth.user, payload);

    return NextResponse.json({ case: created }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
