import { NextRequest, NextResponse } from "next/server";
import { handleApiError, requireAuthUser } from "@/lib/auth/api-auth";
import {
  restoreCaseRecord,
  softDeleteCaseRecord,
  updateCaseRecord,
} from "@/lib/db/store";
import { caseInputSchema } from "@/lib/validation";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuthUser();
    if (auth.error) return auth.error;

    const { id } = await context.params;
    const body = await req.json();
    const parsed = caseInputSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "ข้อมูลคดีไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    const updated = updateCaseRecord(auth.user, id, parsed.data);
    return NextResponse.json({ case: updated });
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
    softDeleteCaseRecord(auth.user, id);
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
    const restored = restoreCaseRecord(auth.user, id);
    return NextResponse.json({ case: restored });
  } catch (err) {
    return handleApiError(err);
  }
}
