import { addDays, format, parseISO } from "date-fns";
import { ConflictError, ValidationError } from "@/lib/db/store";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { formatCaseNumber, formatPartiesSummary } from "@/lib/thai-date";
import type {
  Appointment,
  AppointmentTypeItem,
  AppointmentWithRelations,
  AuditAction,
  AuditLog,
  CaseCategory,
  CaseNoteEntry,
  CaseWithRelations,
  Court,
  LegalCase,
  Notification,
  PublicHoliday,
  User,
} from "@/types/domain";

type DbClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

async function getDb() {
  return await createSupabaseServerClient();
}

function enrichCaseRow(
  c: LegalCase,
  courtMap: Map<string, Court>,
  categoryMap: Map<string, CaseCategory>,
  userMap: Map<string, User>
): CaseWithRelations {
  const court = courtMap.get(c.court_id);
  const category = categoryMap.get(c.category_id);
  const responsible_user = userMap.get(c.responsible_user_id);
  return {
    ...c,
    court,
    category,
    responsible_user,
    formatted_case_number: formatCaseNumber(
      category?.abbreviation,
      c.black_case_number,
      c.case_year
    ),
  };
}

function enrichAppointmentRow(
  a: Appointment,
  viewer: User,
  caseMap: Map<string, CaseWithRelations>,
  courtMap: Map<string, Court>,
  userMap: Map<string, User>
): AppointmentWithRelations {
  const isOwnerOrAdmin = a.responsible_user_id === viewer.id || viewer.role === "admin";
  const shouldMask = a.visibility === "private" && !isOwnerOrAdmin;
  const responsible_user = userMap.get(a.responsible_user_id) ?? null;

  const normalizeTime = (t: string | null) => (t ? t.slice(0, 5) : null);

  if (shouldMask) {
    return {
      ...a,
      start_time: normalizeTime(a.start_time),
      end_time: normalizeTime(a.end_time),
      title: "ไม่ว่าง (นัดหมายส่วนตัว)",
      location: "ไม่ระบุ",
      courtroom: "",
      sequence_note: "",
      plaintiff_name: "",
      defendant_name: "",
      description: "",
      case_id: null,
      case: null,
      court: null,
      responsible_user,
      is_masked_private: true,
    };
  }

  const linkedCase = a.case_id ? caseMap.get(a.case_id) ?? null : null;
  const court = a.court_id ? courtMap.get(a.court_id) ?? null : null;

  return {
    ...a,
    start_time: normalizeTime(a.start_time),
    end_time: normalizeTime(a.end_time),
    case: linkedCase,
    court,
    responsible_user,
    is_masked_private: false,
  };
}

async function appendAudit(
  actorId: string,
  entityType: string,
  entityId: string,
  action: AuditAction,
  oldData: Record<string, unknown> | null,
  newData: Record<string, unknown> | null,
  dbClient?: DbClient
) {
  const db = dbClient || (await getDb());
  await db.from("audit_logs").insert({
    user_id: actorId,
    entity_type: entityType,
    entity_id: entityId,
    action,
    old_data: oldData,
    new_data: newData,
  });
}

async function syncReminders(appt: Appointment, dbClient?: DbClient) {
  const db = dbClient || (await getDb());
  await db.from("appointment_reminders").delete().eq("appointment_id", appt.id);
  if (appt.deleted_at || appt.status === "cancelled") return;

  const rows = [];
  if (appt.reminder_1_day) {
    const prevDay = format(addDays(parseISO(appt.appointment_date), -1), "yyyy-MM-dd");
    rows.push({
      appointment_id: appt.id,
      user_id: appt.responsible_user_id,
      remind_at: `${prevDay}T09:00:00+07:00`,
      is_sent: false,
    });
  }
  if (appt.reminder_same_day) {
    rows.push({
      appointment_id: appt.id,
      user_id: appt.responsible_user_id,
      remind_at: `${appt.appointment_date}T07:00:00+07:00`,
      is_sent: false,
    });
  }
  if (rows.length > 0) {
    await db.from("appointment_reminders").insert(rows);
  }
}

async function notifyOffice(
  actorId: string,
  appt: Appointment,
  title: string,
  message: string,
  dbClient?: DbClient
) {
  const db = dbClient || (await getDb());
  const { data: users } = await db.from("users").select("id, role, is_active");
  if (!users) return;

  const rows = [];
  for (const u of users) {
    if (!u.is_active || u.id === actorId) continue;
    if (appt.visibility === "private" && u.id !== appt.responsible_user_id && u.role !== "admin") {
      continue;
    }
    rows.push({
      user_id: u.id,
      appointment_id: appt.id,
      title,
      message,
      is_read: false,
    });
  }
  if (rows.length > 0) {
    await db.from("notifications").insert(rows);
  }
}

export async function getSupabaseBootstrapData(
  viewer: User,
  scope: "full" | "dynamic" = "full"
) {
  const db = await getDb();

  if (scope === "dynamic") {
    const [usersRes, courtsRes, catsRes, casesRes, apptsRes, notifRes] = await Promise.all([
      db.from("users").select("id, full_name, email, role, is_active, created_at").order("created_at", { ascending: true }),
      db.from("courts").select("*").order("name", { ascending: true }),
      db.from("case_categories").select("*").order("abbreviation", { ascending: true }),
      db.from("cases").select("*").order("created_at", { ascending: false }),
      db.from("appointments").select("*").order("appointment_date", { ascending: true }),
      db
        .from("notifications")
        .select("*")
        .eq("user_id", viewer.id)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    const users = (usersRes.data || []) as User[];
    const courts = (courtsRes.data || []) as Court[];
    const case_categories = (catsRes.data || []) as CaseCategory[];
    const allCases = (casesRes.data || []) as LegalCase[];
    const allAppts = (apptsRes.data || []) as Appointment[];

    const userMap = new Map(users.map((u) => [u.id, u]));
    const courtMap = new Map(courts.map((c) => [c.id, c]));
    const catMap = new Map(case_categories.map((c) => [c.id, c]));

    const activeCases = allCases
      .filter((c) => !c.deleted_at)
      .map((c) => enrichCaseRow(c, courtMap, catMap, userMap));
    const caseMap = new Map(activeCases.map((c) => [c.id, c]));

    const appointments = allAppts
      .filter((a) => !a.deleted_at)
      .map((a) => enrichAppointmentRow(a, viewer, caseMap, courtMap, userMap));

    return {
      currentUser: viewer,
      isReadOnly: false,
      cases: activeCases,
      appointments,
      notifications: (notifRes.data || []) as Notification[],
    };
  }

  const [
    usersRes,
    courtsRes,
    catsRes,
    typesRes,
    holidaysRes,
    casesRes,
    apptsRes,
    notifRes,
    auditRes,
  ] = await Promise.all([
    db.from("users").select("*").order("created_at", { ascending: true }),
    db.from("courts").select("*").order("name", { ascending: true }),
    db.from("case_categories").select("*").order("abbreviation", { ascending: true }),
    db.from("appointment_types").select("*").order("created_at", { ascending: true }),
    db.from("public_holidays").select("*").order("holiday_date", { ascending: true }),
    db.from("cases").select("*").order("created_at", { ascending: false }),
    db.from("appointments").select("*").order("appointment_date", { ascending: true }),
    db
      .from("notifications")
      .select("*")
      .eq("user_id", viewer.id)
      .order("created_at", { ascending: false })
      .limit(100),
    db.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(200),
  ]);

  const users = (usersRes.data || []) as User[];
  const courts = (courtsRes.data || []) as Court[];
  const case_categories = (catsRes.data || []) as CaseCategory[];
  const appointment_types = (typesRes.data || []) as AppointmentTypeItem[];
  const public_holidays = (holidaysRes.data || []) as PublicHoliday[];
  const allCases = (casesRes.data || []) as LegalCase[];
  const allAppts = (apptsRes.data || []) as Appointment[];

  const userMap = new Map(users.map((u) => [u.id, u]));
  const courtMap = new Map(courts.map((c) => [c.id, c]));
  const catMap = new Map(case_categories.map((c) => [c.id, c]));

  const activeCases = allCases
    .filter((c) => !c.deleted_at)
    .map((c) => enrichCaseRow(c, courtMap, catMap, userMap));
  const deletedCases = allCases
    .filter((c) => !!c.deleted_at)
    .map((c) => enrichCaseRow(c, courtMap, catMap, userMap));
  const caseMap = new Map(activeCases.map((c) => [c.id, c]));

  const appointments = allAppts
    .filter((a) => !a.deleted_at)
    .map((a) => enrichAppointmentRow(a, viewer, caseMap, courtMap, userMap));
  const deletedAppointments = allAppts
    .filter((a) => !!a.deleted_at)
    .map((a) => enrichAppointmentRow(a, viewer, caseMap, courtMap, userMap));

  const audit_logs = ((auditRes.data || []) as AuditLog[]).map((l) => ({
    ...l,
    user_name: userMap.get(l.user_id)?.full_name || l.user_id,
  }));

  return {
    currentUser: viewer,
    isReadOnly: false,
    users,
    courts,
    case_categories,
    appointment_types,
    public_holidays,
    cases: activeCases,
    deletedCases,
    appointments,
    deletedAppointments,
    notifications: (notifRes.data || []) as Notification[],
    audit_logs,
  };
}

export async function getSupabasePublicBootstrapData(scope: "full" | "dynamic" = "full") {
  const db = createSupabaseAdminClient() || (await getDb());
  const guestViewer: User = {
    id: "guest",
    full_name: "ผู้เยี่ยมชม (ดูอย่างเดียว)",
    email: "",
    role: "staff",
    is_active: true,
    created_at: "",
  };

  if (scope === "dynamic") {
    const [usersRes, courtsRes, catsRes, casesRes, apptsRes] = await Promise.all([
      db.from("users").select("id, full_name, role, is_active, created_at").order("created_at", { ascending: true }),
      db.from("courts").select("*").order("name", { ascending: true }),
      db.from("case_categories").select("*").order("abbreviation", { ascending: true }),
      db.from("cases").select("*").is("deleted_at", null).order("created_at", { ascending: false }),
      db
        .from("appointments")
        .select("*")
        .is("deleted_at", null)
        .eq("visibility", "shared")
        .order("appointment_date", { ascending: true }),
    ]);

    const users = ((usersRes.data || []) as Omit<User, "email">[]).map((u) => ({
      ...u,
      email: "",
    }));
    const courts = (courtsRes.data || []) as Court[];
    const case_categories = (catsRes.data || []) as CaseCategory[];
    const activeCasesRaw = (casesRes.data || []) as LegalCase[];
    const publicApptsRaw = (apptsRes.data || []) as Appointment[];

    const userMap = new Map(users.map((u) => [u.id, u]));
    const courtMap = new Map(courts.map((c) => [c.id, c]));
    const catMap = new Map(case_categories.map((c) => [c.id, c]));

    const activeCases = activeCasesRaw.map((c) => ({
      ...enrichCaseRow(c, courtMap, catMap, userMap),
      client_phone: "",
      client_contact_name: "",
    }));
    const caseMap = new Map(activeCases.map((c) => [c.id, c]));
    const appointments = publicApptsRaw.map((a) =>
      enrichAppointmentRow(a, guestViewer, caseMap, courtMap, userMap)
    );

    return {
      currentUser: null,
      isReadOnly: true,
      cases: activeCases,
      appointments,
      notifications: [],
    };
  }

  const [usersRes, courtsRes, catsRes, typesRes, holidaysRes, casesRes, apptsRes] =
    await Promise.all([
      db.from("users").select("id, full_name, role, is_active, created_at").order("created_at", { ascending: true }),
      db.from("courts").select("*").order("name", { ascending: true }),
      db.from("case_categories").select("*").order("abbreviation", { ascending: true }),
      db.from("appointment_types").select("*").order("created_at", { ascending: true }),
      db.from("public_holidays").select("*").order("holiday_date", { ascending: true }),
      db.from("cases").select("*").is("deleted_at", null).order("created_at", { ascending: false }),
      db
        .from("appointments")
        .select("*")
        .is("deleted_at", null)
        .eq("visibility", "shared")
        .order("appointment_date", { ascending: true }),
    ]);

  const users = ((usersRes.data || []) as Omit<User, "email">[]).map((u) => ({
    ...u,
    email: "",
  }));
  const courts = (courtsRes.data || []) as Court[];
  const case_categories = (catsRes.data || []) as CaseCategory[];
  const appointment_types = (typesRes.data || []) as AppointmentTypeItem[];
  const public_holidays = (holidaysRes.data || []) as PublicHoliday[];
  const activeCasesRaw = (casesRes.data || []) as LegalCase[];
  const publicApptsRaw = (apptsRes.data || []) as Appointment[];

  const userMap = new Map(users.map((u) => [u.id, u]));
  const courtMap = new Map(courts.map((c) => [c.id, c]));
  const catMap = new Map(case_categories.map((c) => [c.id, c]));

  const activeCases = activeCasesRaw.map((c) => ({
    ...enrichCaseRow(c, courtMap, catMap, userMap),
    client_phone: "",
    client_contact_name: "",
  }));
  const caseMap = new Map(activeCases.map((c) => [c.id, c]));
  const appointments = publicApptsRaw.map((a) =>
    enrichAppointmentRow(a, guestViewer, caseMap, courtMap, userMap)
  );

  return {
    currentUser: null,
    isReadOnly: true,
    users,
    courts,
    case_categories,
    appointment_types,
    public_holidays,
    cases: activeCases,
    deletedCases: [],
    appointments,
    deletedAppointments: [],
    notifications: [],
    audit_logs: [],
  };
}

async function enrichSingleSupabaseCase(
  db: DbClient,
  c: LegalCase
): Promise<CaseWithRelations> {
  const [courtRes, catRes, userRes] = await Promise.all([
    db.from("courts").select("*").eq("id", c.court_id).maybeSingle(),
    db.from("case_categories").select("*").eq("id", c.category_id).maybeSingle(),
    db
      .from("users")
      .select("id, full_name, email, role, is_active, created_at")
      .eq("id", c.responsible_user_id)
      .maybeSingle(),
  ]);
  const court = (courtRes.data as Court) || undefined;
  const category = (catRes.data as CaseCategory) || undefined;
  const responsible_user = (userRes.data as User) || undefined;
  return {
    ...c,
    court,
    category,
    responsible_user,
    formatted_case_number: formatCaseNumber(
      category?.abbreviation,
      c.black_case_number,
      c.case_year
    ),
  };
}

export async function createSupabaseCase(
  actor: User,
  input: Omit<LegalCase, "id" | "created_by" | "updated_by" | "created_at" | "updated_at" | "deleted_at">
) {
  const db = await getDb();
  const { data: dup } = await db
    .from("cases")
    .select("*")
    .is("deleted_at", null)
    .eq("court_id", input.court_id)
    .eq("category_id", input.category_id)
    .eq("black_case_number", input.black_case_number.trim())
    .eq("case_year", input.case_year)
    .maybeSingle();

  if (dup) {
    throw new ValidationError("พบข้อมูลคดีซ้ำในระบบแล้ว", { duplicateCase: dup });
  }

  const nowIso = new Date().toISOString();
  const plaintiffs =
    input.plaintiffs && input.plaintiffs.length > 0
      ? input.plaintiffs
      : input.plaintiff_name
      ? [{ order: 1, name: input.plaintiff_name }]
      : [];
  const defendants =
    input.defendants && input.defendants.length > 0
      ? input.defendants
      : input.defendant_name
      ? [{ order: 1, name: input.defendant_name }]
      : [];
  const initialNotes: CaseNoteEntry[] =
    input.case_notes && input.case_notes.length > 0
      ? input.case_notes
      : input.notes?.trim()
      ? [
          {
            id: crypto.randomUUID(),
            content: input.notes.trim(),
            created_by: actor.id,
            created_by_name: actor.full_name,
            created_at: nowIso,
          },
        ]
      : [];

  const { data: created, error } = await db
    .from("cases")
    .insert({
      ...input,
      black_case_number: input.black_case_number.trim(),
      plaintiffs,
      defendants,
      plaintiff_name: formatPartiesSummary(plaintiffs, input.plaintiff_name),
      defendant_name: formatPartiesSummary(defendants, input.defendant_name),
      case_notes: initialNotes,
      court_level: input.court_level ?? "first_instance",
      client_phone: input.client_phone ?? "",
      client_contact_name: input.client_contact_name ?? "",
      created_by: actor.id,
      updated_by: actor.id,
    })
    .select("*")
    .single();

  if (error || !created) throw new ValidationError(error?.message || "สร้างคดีไม่สำเร็จ");

  const [enriched] = await Promise.all([
    enrichSingleSupabaseCase(db, created as LegalCase),
    appendAudit(actor.id, "case", created.id, "CREATE", null, created, db),
  ]);
  return enriched;
}

export async function updateSupabaseCase(
  actor: User,
  caseId: string,
  input: Partial<LegalCase> & { expected_updated_at?: string }
) {
  const db = await getDb();
  const { data: existing } = await db
    .from("cases")
    .select("*")
    .eq("id", caseId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!existing) throw new ValidationError("ไม่พบข้อมูลคดี");
  if (input.expected_updated_at && existing.updated_at !== input.expected_updated_at) {
    throw new ConflictError("ข้อมูลคดีถูกแก้ไขโดยผู้ใช้อื่นแล้ว กรุณาโหลดข้อมูลใหม่ก่อนบันทึก");
  }

  const { expected_updated_at: _exp, ...patch } = input;
  const nextPlaintiffs =
    patch.plaintiffs !== undefined ? patch.plaintiffs : existing.plaintiffs;
  const nextDefendants =
    patch.defendants !== undefined ? patch.defendants : existing.defendants;

  const { data: updated, error } = await db
    .from("cases")
    .update({
      ...patch,
      ...(nextPlaintiffs && nextPlaintiffs.length > 0
        ? { plaintiff_name: formatPartiesSummary(nextPlaintiffs) }
        : {}),
      ...(nextDefendants && nextDefendants.length > 0
        ? { defendant_name: formatPartiesSummary(nextDefendants) }
        : {}),
      updated_by: actor.id,
    })
    .eq("id", caseId)
    .select("*")
    .single();

  if (error || !updated) throw new ValidationError(error?.message || "อัปเดตคดีไม่สำเร็จ");
  const [enriched] = await Promise.all([
    enrichSingleSupabaseCase(db, updated as LegalCase),
    appendAudit(actor.id, "case", caseId, "UPDATE", existing, updated, db),
  ]);
  return enriched;
}

export async function addSupabaseCaseNote(
  actor: User,
  caseId: string,
  content: string
) {
  const db = await getDb();
  const { data: existing } = await db
    .from("cases")
    .select("*")
    .eq("id", caseId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!existing) throw new ValidationError("ไม่พบข้อมูลคดี");

  const entry: CaseNoteEntry = {
    id: crypto.randomUUID(),
    content: content.trim(),
    created_by: actor.id,
    created_by_name: actor.full_name,
    created_at: new Date().toISOString(),
  };

  const nextNotes = [entry, ...((existing.case_notes as CaseNoteEntry[]) || [])];
  const { data: updated, error } = await db
    .from("cases")
    .update({ case_notes: nextNotes, updated_by: actor.id })
    .eq("id", caseId)
    .select("*")
    .single();

  if (error || !updated) throw new ValidationError(error?.message || "เพิ่มหมายเหตุไม่สำเร็จ");
  const [enriched] = await Promise.all([
    enrichSingleSupabaseCase(db, updated as LegalCase),
    appendAudit(actor.id, "case", caseId, "UPDATE", existing, updated, db),
  ]);
  return enriched;
}

export async function softDeleteSupabaseCase(actor: User, caseId: string) {
  const db = await getDb();
  const { count } = await db
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("case_id", caseId)
    .is("deleted_at", null);

  if ((count ?? 0) > 0) {
    throw new ValidationError("ไม่สามารถลบคดีที่มีนัดหมายเชื่อมโยงอยู่ได้");
  }

  const nowIso = new Date().toISOString();
  const { error } = await db
    .from("cases")
    .update({ deleted_at: nowIso, updated_by: actor.id })
    .eq("id", caseId);

  if (error) throw new ValidationError(error.message);
  await appendAudit(actor.id, "case", caseId, "DELETE", null, { deleted_at: nowIso });
}

export async function restoreSupabaseCase(actor: User, caseId: string) {
  const db = await getDb();
  const { data: restored, error } = await db
    .from("cases")
    .update({ deleted_at: null, updated_by: actor.id })
    .eq("id", caseId)
    .select("*")
    .single();

  if (error || !restored) throw new ValidationError(error?.message || "กู้คืนคดีไม่สำเร็จ");
  await appendAudit(actor.id, "case", caseId, "RESTORE", null, restored);
  return restored;
}

async function enrichSingleSupabaseAppointment(
  db: DbClient,
  appt: Appointment,
  viewer: User
): Promise<AppointmentWithRelations> {
  const [caseRes, courtRes, userRes] = await Promise.all([
    appt.case_id
      ? db.from("cases").select("*").eq("id", appt.case_id).maybeSingle()
      : Promise.resolve({ data: null }),
    appt.court_id
      ? db.from("courts").select("*").eq("id", appt.court_id).maybeSingle()
      : Promise.resolve({ data: null }),
    db.from("users").select("id, full_name, email, role, is_active, created_at").eq("id", appt.responsible_user_id).maybeSingle(),
  ]);

  let linkedCase: CaseWithRelations | null = null;
  if (caseRes.data) {
    const c = caseRes.data as LegalCase;
    const [cCourtRes, cCatRes] = await Promise.all([
      db.from("courts").select("*").eq("id", c.court_id).maybeSingle(),
      db.from("case_categories").select("*").eq("id", c.category_id).maybeSingle(),
    ]);
    linkedCase = {
      ...c,
      court: (cCourtRes.data as Court) || undefined,
      category: (cCatRes.data as CaseCategory) || undefined,
      formatted_case_number: formatCaseNumber(
        (cCatRes.data as CaseCategory | null)?.abbreviation,
        c.black_case_number,
        c.case_year
      ),
    };
  }

  const normalizeTime = (t: string | null) => (t ? t.slice(0, 5) : null);
  return {
    ...appt,
    start_time: normalizeTime(appt.start_time),
    end_time: normalizeTime(appt.end_time),
    case: linkedCase,
    court: (courtRes.data as Court) || null,
    responsible_user: (userRes.data as User) || (appt.responsible_user_id === viewer.id ? viewer : null),
    is_masked_private: false,
  };
}

export async function createSupabaseAppointment(
  actor: User,
  input: Omit<
    Appointment,
    "id" | "created_by" | "updated_by" | "created_at" | "updated_at" | "deleted_at"
  > & { force_duplicate?: boolean }
) {
  const db = await getDb();

  const { force_duplicate: _fd, ...clean } = input;
  const { data: created, error } = await db
    .from("appointments")
    .insert({
      ...clean,
      title: clean.title.trim(),
      created_by: actor.id,
      updated_by: actor.id,
    })
    .select("*")
    .single();

  if (error || !created) throw new ValidationError(error?.message || "สร้างนัดหมายไม่สำเร็จ");

  const [enriched] = await Promise.all([
    enrichSingleSupabaseAppointment(db, created as Appointment, actor),
    syncReminders(created as Appointment, db),
    notifyOffice(
      actor.id,
      created as Appointment,
      "มีนัดหมายใหม่",
      `${actor.full_name} เพิ่มนัด "${created.title}" วันที่ ${created.appointment_date}`,
      db
    ),
    appendAudit(actor.id, "appointment", created.id, "CREATE", null, created, db),
  ]);

  return enriched;
}

export async function updateSupabaseAppointment(
  actor: User,
  apptId: string,
  input: Partial<Appointment> & { expected_updated_at?: string }
) {
  const db = await getDb();
  const { data: existing } = await db
    .from("appointments")
    .select("*")
    .eq("id", apptId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!existing) throw new ValidationError("ไม่พบข้อมูลนัดหมาย");
  if (input.expected_updated_at && existing.updated_at !== input.expected_updated_at) {
    throw new ConflictError(
      "นัดหมายนี้ถูกแก้ไขโดยผู้ใช้อื่นแล้ว กรุณาโหลดข้อมูลใหม่ก่อนบันทึกทับ"
    );
  }

  const { expected_updated_at: _exp, ...patch } = input;
  const { data: updated, error } = await db
    .from("appointments")
    .update({ ...patch, updated_by: actor.id })
    .eq("id", apptId)
    .select("*")
    .single();

  if (error || !updated) throw new ValidationError(error?.message || "แก้ไขนัดหมายไม่สำเร็จ");

  const isCancelled = existing.status !== "cancelled" && updated.status === "cancelled";
  const [enriched] = await Promise.all([
    enrichSingleSupabaseAppointment(db, updated as Appointment, actor),
    syncReminders(updated as Appointment, db),
    notifyOffice(
      actor.id,
      updated as Appointment,
      isCancelled ? "มีการยกเลิกนัดหมาย" : "มีการแก้ไขนัดหมาย",
      `${actor.full_name} ${isCancelled ? "ยกเลิก" : "แก้ไข"}นัด "${updated.title}"`,
      db
    ),
    appendAudit(actor.id, "appointment", apptId, "UPDATE", existing, updated, db),
  ]);

  return enriched;
}

export async function softDeleteSupabaseAppointment(actor: User, apptId: string) {
  const db = await getDb();
  const nowIso = new Date().toISOString();
  const { data: deleted, error } = await db
    .from("appointments")
    .update({ deleted_at: nowIso, updated_by: actor.id })
    .eq("id", apptId)
    .select("*")
    .single();

  if (error || !deleted) throw new ValidationError(error?.message || "ลบนัดหมายไม่สำเร็จ");
  await syncReminders(deleted as Appointment);
  await appendAudit(actor.id, "appointment", apptId, "DELETE", null, { deleted_at: nowIso });
}

export async function restoreSupabaseAppointment(actor: User, apptId: string) {
  const db = await getDb();
  const { data: restored, error } = await db
    .from("appointments")
    .update({ deleted_at: null, updated_by: actor.id })
    .eq("id", apptId)
    .select("*")
    .single();

  if (error || !restored) throw new ValidationError(error?.message || "กู้คืนนัดหมายไม่สำเร็จ");
  await syncReminders(restored as Appointment);
  await appendAudit(actor.id, "appointment", apptId, "RESTORE", null, restored);
  return restored;
}

export async function markSupabaseNotificationRead(userId: string, id?: string, all?: boolean) {
  const db = await getDb();
  if (all) {
    await db.from("notifications").update({ is_read: true }).eq("user_id", userId);
  } else if (id) {
    await db
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id)
      .eq("user_id", userId);
  }
}

export async function upsertSupabaseSetting(
  actor: User,
  entity: "court" | "case_category" | "appointment_type" | "public_holiday" | "user",
  payload: Record<string, unknown>,
  id?: string
) {
  const db = await getDb();

  if (entity === "public_holiday" && actor.role !== "admin") {
    throw new ValidationError("เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถจัดการวันหยุดราชการได้");
  }

  if (entity === "user") {
    if (actor.role !== "admin") {
      throw new ValidationError("เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถจัดการบัญชีผู้ใช้ได้");
    }
    const adminClient = createSupabaseAdminClient();
    if (!id) {
      const { count } = await db
        .from("users")
        .select("id", { count: "exact", head: true });
      if ((count ?? 0) >= 5) {
        throw new ValidationError("ระบบรองรับบัญชีผู้ใช้งานสูงสุด 5 บัญชีตามแผนที่กำหนด");
      }
      if (!adminClient) {
        throw new ValidationError(
          "กรุณาเพิ่ม SUPABASE_SERVICE_ROLE_KEY ใน Environment หรือสร้างผู้ใช้ใน Supabase Auth Dashboard"
        );
      }
      const { data: authCreated, error: authErr } = await adminClient.auth.admin.createUser({
        email: String(payload.email),
        password: String(payload.password || "123456"),
        email_confirm: true,
        user_metadata: { full_name: String(payload.full_name) },
      });
      if (authErr || !authCreated.user) {
        throw new ValidationError(authErr?.message || "สร้างบัญชี Supabase Auth ไม่สำเร็จ");
      }
      const { data: userRow, error: insErr } = await adminClient
        .from("users")
        .insert({
          id: authCreated.user.id,
          full_name: payload.full_name,
          email: payload.email,
          role: payload.role || "staff",
          is_active: payload.is_active ?? true,
        })
        .select("*")
        .single();
      if (insErr) throw new ValidationError(insErr.message);
      await appendAudit(actor.id, "user", authCreated.user.id, "CREATE", null, userRow);
      return userRow;
    }

    const client = adminClient || db;
    const { data: updated, error } = await client
      .from("users")
      .update({
        full_name: payload.full_name,
        email: payload.email,
        role: payload.role,
        is_active: payload.is_active,
      })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new ValidationError(error.message);
    await appendAudit(actor.id, "user", id, "UPDATE", null, updated);
    return updated;
  }

  const tableMap = {
    court: "courts",
    case_category: "case_categories",
    appointment_type: "appointment_types",
    public_holiday: "public_holidays",
  } as const;
  const table = tableMap[entity];

  if (id) {
    const { data: updated, error } = await db
      .from(table)
      .update(payload)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new ValidationError(error.message);
    await appendAudit(actor.id, entity, id, "UPDATE", null, updated);
    return updated;
  }

  const { data: created, error } = await db
    .from(table)
    .insert(payload)
    .select("*")
    .single();
  if (error) throw new ValidationError(error.message);
  await appendAudit(actor.id, entity, created.id, "CREATE", null, created);
  return created;
}
