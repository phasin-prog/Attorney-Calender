import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError, requireAuthUser } from "@/lib/auth/api-auth";
import { addCaseNoteRecord } from "@/lib/db/store";
import { addSupabaseCaseNote } from "@/lib/db/supabase-store";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const addNoteSchema = z.object({
  content: z.string().trim().min(1, "กรุณากรอกข้อความหมายเหตุ"),
});

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuthUser();
    if (auth.error) return auth.error;

    const { id } = await context.params;
    const body = await req.json();
    const parsed = addNoteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "ข้อความหมายเหตุไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    const updated = isSupabaseConfigured()
      ? await addSupabaseCaseNote(auth.user, id, parsed.data.content)
      : addCaseNoteRecord(auth.user, id, parsed.data.content);

    return NextResponse.json({ case: updated }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
