import { NextRequest, NextResponse } from "next/server";
import { handleApiError, requireAuthUser } from "@/lib/auth/api-auth";
import { createCaseRecord } from "@/lib/db/store";
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
    const created = createCaseRecord(auth.user, {
      court_id: d.court_id,
      category_id: d.category_id,
      black_case_number: d.black_case_number,
      case_year: d.case_year,
      plaintiff_name: d.plaintiff_name,
      defendant_name: d.defendant_name,
      responsible_user_id: d.responsible_user_id,
      status: d.status,
      notes: d.notes ?? "",
    });

    return NextResponse.json({ case: created }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
