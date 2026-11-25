import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { addDays, format, parseISO } from "date-fns";
import { createInitialSeed } from "@/lib/db/seed";
import { formatCaseNumber } from "@/lib/thai-date";
import type {
  Appointment,
  AppointmentTypeItem,
  AppointmentWithRelations,
  AuditAction,
  AuditLog,
  CaseCategory,
  CaseWithRelations,
  Court,
  DatabaseState,
  LegalCase,
  Notification,
  PublicHoliday,
  User,
} from "@/types/domain";

export class ConflictError extends Error {
  status = 409;
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}

export class ValidationError extends Error {
  status = 400;
  data?: unknown;
  constructor(message: string, data?: unknown) {
    super(message);
    this.name = "ValidationError";
    this.data = data;
  }
}

const DEFAULT_DATA_DIR = process.env.VERCEL
  ? path.join(os.tmpdir(), "lawyer-calendar-data")
  : path.join(process.cwd(), ".data");

function getDbFilePath(): string {
  const dir = process.env.LAWYER_CALENDAR_DATA_DIR || DEFAULT_DATA_DIR;
  return path.join(dir, "db.json");
}

export function readDb(): DatabaseState {
  const filePath = getDbFilePath();
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(filePath)) {
    const seed = createInitialSeed();
    fs.writeFileSync(filePath, JSON.stringify(seed, null, 2), "utf-8");
    return seed;
  }
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as DatabaseState;
}

export function writeDb(state: DatabaseState): void {
  const filePath = getDbFilePath();
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const tmpPath = `${filePath}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(state, null, 2), "utf-8");
  fs.renameSync(tmpPath, filePath);
}

function appendAuditLog(
  state: DatabaseState,
  userId: string,
  entityType: string,
  entityId: string,
  action: AuditAction,
  oldData: Record<string, unknown> | null,
  newData: Record<string, unknown> | null
): void {
  const actor = state.users.find((u) => u.id === userId);
  const log: AuditLog = {
    id: crypto.randomUUID(),
    user_id: userId,
    user_name: actor?.full_name || "ผู้ใช้งานระบบ",
    entity_type: entityType,
    entity_id: entityId,
    action,
    old_data: oldData,
    new_data: newData,
    created_at: new Date().toISOString(),
  };
  state.audit_logs.unshift(log);
}

function syncAppointmentReminders(state: DatabaseState, appt: Appointment): void {
  state.appointment_reminders = state.appointment_reminders.filter(
    (r) => r.appointment_id !== appt.id
  );
  if (appt.deleted_at || appt.status === "cancelled") return;

  if (appt.reminder_1_day) {
    const prevDay = format(addDays(parseISO(appt.appointment_date), -1), "yyyy-MM-dd");
    state.appointment_reminders.push({
      id: crypto.randomUUID(),
      appointment_id: appt.id,
      user_id: appt.responsible_user_id,
      remind_at: `${prevDay}T09:00:00+07:00`,
      is_sent: false,
      sent_at: null,
    });
  }

  if (appt.reminder_same_day) {
    state.appointment_reminders.push({
      id: crypto.randomUUID(),
      appointment_id: appt.id,
      user_id: appt.responsible_user_id,
      remind_at: `${appt.appointment_date}T07:00:00+07:00`,
      is_sent: false,
      sent_at: null,
    });
  }
}

function notifyUsersForAppointment(
  state: DatabaseState,
  actorId: string,
  appt: Appointment,
  title: string,
  message: string
): void {
  const nowIso = new Date().toISOString();
  // Notify responsible user (if not actor) and other active users for shared appointments
  for (const u of state.users) {
    if (!u.is_active || u.id === actorId) continue;
    if (appt.visibility === "private" && u.id !== appt.responsible_user_id && u.role !== "admin") {
      continue;
    }
    const n: Notification = {
      id: crypto.randomUUID(),
      user_id: u.id,
      appointment_id: appt.id,
      title,
      message,
      is_read: false,
      created_at: nowIso,
    };
    state.notifications.unshift(n);
  }
}

export function authenticateUser(email: string, password: string): User | null {
  const state = readDb();
  const normalized = email.trim().toLowerCase();
  const user = state.users.find(
    (u) => u.email.toLowerCase() === normalized && u.is_active
  );
  if (!user) return null;
  if (state.passwords[user.email] !== password) return null;
  return user;
}

export function getUserById(userId: string): User | null {
  const state = readDb();
  return state.users.find((u) => u.id === userId && u.is_active) ?? null;
}

export function enrichCase(state: DatabaseState, c: LegalCase): CaseWithRelations {
  const court = state.courts.find((ct) => ct.id === c.court_id);
  const category = state.case_categories.find((cat) => cat.id === c.category_id);
  const responsible_user = state.users.find((u) => u.id === c.responsible_user_id);
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

export function enrichAppointment(
  state: DatabaseState,
  a: Appointment,
  viewer: User
): AppointmentWithRelations {
  const isOwnerOrAdmin = a.responsible_user_id === viewer.id || viewer.role === "admin";
  const shouldMask = a.visibility === "private" && !isOwnerOrAdmin;

  const linkedCase =
    !shouldMask && a.case_id
      ? state.cases.find((c) => c.id === a.case_id && !c.deleted_at)
      : undefined;
  const court =
    !shouldMask && a.court_id ? state.courts.find((ct) => ct.id === a.court_id) : undefined;
  const responsible_user = state.users.find((u) => u.id === a.responsible_user_id);

  if (shouldMask) {
    return {
      ...a,
      title: "ไม่ว่าง (นัดหมายส่วนตัว)",
      location: "ไม่ระบุ",
      description: "",
      case_id: null,
      case: null,
      court: null,
      responsible_user: responsible_user ?? null,
      is_masked_private: true,
    };
  }

  return {
    ...a,
    case: linkedCase ? enrichCase(state, linkedCase) : null,
    court: court ?? null,
    responsible_user: responsible_user ?? null,
    is_masked_private: false,
  };
}

export function getBootstrapData(viewer: User) {
  const state = readDb();
  const activeCases = state.cases
    .filter((c) => !c.deleted_at)
    .map((c) => enrichCase(state, c));
  const deletedCases = state.cases
    .filter((c) => !!c.deleted_at)
    .map((c) => enrichCase(state, c));

  const activeAppointments = state.appointments
    .filter((a) => !a.deleted_at)
    .map((a) => enrichAppointment(state, a, viewer));
  const deletedAppointments = state.appointments
    .filter((a) => !!a.deleted_at)
    .map((a) => enrichAppointment(state, a, viewer));

  const notifications = state.notifications.filter((n) => n.user_id === viewer.id);

  return {
    currentUser: viewer,
    users: state.users,
    courts: state.courts,
    case_categories: state.case_categories,
    appointment_types: state.appointment_types,
    public_holidays: state.public_holidays.sort((a, b) =>
      a.holiday_date.localeCompare(b.holiday_date)
    ),
    cases: activeCases,
    deletedCases,
    appointments: activeAppointments,
    deletedAppointments,
    notifications,
    audit_logs: state.audit_logs.slice(0, 200),
  };
}

export function createCaseRecord(
  actor: User,
  input: Omit<LegalCase, "id" | "created_by" | "updated_by" | "created_at" | "updated_at" | "deleted_at">
): CaseWithRelations {
  const state = readDb();
  const duplicate = state.cases.find(
    (c) =>
      !c.deleted_at &&
      c.court_id === input.court_id &&
      c.category_id === input.category_id &&
      c.black_case_number.trim() === input.black_case_number.trim() &&
      c.case_year === input.case_year
  );

  if (duplicate) {
    throw new ValidationError("พบข้อมูลคดีซ้ำในระบบแล้ว", {
      duplicateCase: enrichCase(state, duplicate),
    });
  }

  const nowIso = new Date().toISOString();
  const record: LegalCase = {
    ...input,
    id: crypto.randomUUID(),
    black_case_number: input.black_case_number.trim(),
    created_by: actor.id,
    updated_by: actor.id,
    created_at: nowIso,
    updated_at: nowIso,
    deleted_at: null,
  };
  state.cases.unshift(record);
  appendAuditLog(
    state,
    actor.id,
    "case",
    record.id,
    "CREATE",
    null,
    record as unknown as Record<string, unknown>
  );
  writeDb(state);
  return enrichCase(state, record);
}

export function updateCaseRecord(
  actor: User,
  caseId: string,
  input: Partial<LegalCase> & { expected_updated_at?: string }
): CaseWithRelations {
  const state = readDb();
  const idx = state.cases.findIndex((c) => c.id === caseId && !c.deleted_at);
  if (idx === -1) throw new ValidationError("ไม่พบข้อมูลคดี");

  const existing = state.cases[idx];
  if (input.expected_updated_at && existing.updated_at !== input.expected_updated_at) {
    throw new ConflictError("ข้อมูลคดีถูกแก้ไขโดยผู้ใช้อื่นแล้ว กรุณาโหลดข้อมูลใหม่ก่อนบันทึก");
  }

  const nextCourt = input.court_id ?? existing.court_id;
  const nextCat = input.category_id ?? existing.category_id;
  const nextBlack = (input.black_case_number ?? existing.black_case_number).trim();
  const nextYear = input.case_year ?? existing.case_year;

  const duplicate = state.cases.find(
    (c) =>
      !c.deleted_at &&
      c.id !== caseId &&
      c.court_id === nextCourt &&
      c.category_id === nextCat &&
      c.black_case_number.trim() === nextBlack &&
      c.case_year === nextYear
  );
  if (duplicate) {
    throw new ValidationError("พบข้อมูลคดีซ้ำในระบบแล้ว", {
      duplicateCase: enrichCase(state, duplicate),
    });
  }

  const { expected_updated_at: _expected, ...casePatch } = input;
  const updated: LegalCase = {
    ...existing,
    ...casePatch,
    black_case_number: nextBlack,
    updated_by: actor.id,
    updated_at: new Date().toISOString(),
  };

  state.cases[idx] = updated;
  appendAuditLog(
    state,
    actor.id,
    "case",
    caseId,
    "UPDATE",
    existing as unknown as Record<string, unknown>,
    updated as unknown as Record<string, unknown>
  );
  writeDb(state);
  return enrichCase(state, updated);
}

export function softDeleteCaseRecord(actor: User, caseId: string): void {
  const state = readDb();
  const idx = state.cases.findIndex((c) => c.id === caseId && !c.deleted_at);
  if (idx === -1) throw new ValidationError("ไม่พบข้อมูลคดี");

  const hasAppointments = state.appointments.some(
    (a) => a.case_id === caseId && !a.deleted_at
  );
  if (hasAppointments) {
    throw new ValidationError("ไม่สามารถลบคดีที่มีนัดหมายเชื่อมโยงอยู่ได้");
  }

  const existing = state.cases[idx];
  const nowIso = new Date().toISOString();
  state.cases[idx] = { ...existing, deleted_at: nowIso, updated_by: actor.id, updated_at: nowIso };
  appendAuditLog(
    state,
    actor.id,
    "case",
    caseId,
    "DELETE",
    existing as unknown as Record<string, unknown>,
    { deleted_at: nowIso }
  );
  writeDb(state);
}

export function restoreCaseRecord(actor: User, caseId: string): CaseWithRelations {
  const state = readDb();
  const idx = state.cases.findIndex((c) => c.id === caseId && !!c.deleted_at);
  if (idx === -1) throw new ValidationError("ไม่พบข้อมูลคดีที่ถูกลบ");

  const existing = state.cases[idx];
  const duplicate = state.cases.find(
    (c) =>
      !c.deleted_at &&
      c.court_id === existing.court_id &&
      c.category_id === existing.category_id &&
      c.black_case_number === existing.black_case_number &&
      c.case_year === existing.case_year
  );
  if (duplicate) {
    throw new ValidationError("ไม่สามารถกู้คืนได้ เนื่องจากมีคดีหมายเลขเดียวกันใช้งานอยู่แล้ว");
  }

  const nowIso = new Date().toISOString();
  const restored: LegalCase = {
    ...existing,
    deleted_at: null,
    updated_by: actor.id,
    updated_at: nowIso,
  };
  state.cases[idx] = restored;
  appendAuditLog(
    state,
    actor.id,
    "case",
    caseId,
    "RESTORE",
    existing as unknown as Record<string, unknown>,
    restored as unknown as Record<string, unknown>
  );
  writeDb(state);
  return enrichCase(state, restored);
}

export function createAppointmentRecord(
  actor: User,
  input: Omit<
    Appointment,
    "id" | "created_by" | "updated_by" | "created_at" | "updated_at" | "deleted_at"
  > & { force_duplicate?: boolean }
): AppointmentWithRelations {
  const state = readDb();

  if (!input.force_duplicate) {
    const dup = state.appointments.find(
      (a) =>
        !a.deleted_at &&
        a.status !== "cancelled" &&
        a.appointment_date === input.appointment_date &&
        ((a.start_time && input.start_time && a.start_time === input.start_time && a.responsible_user_id === input.responsible_user_id) ||
          (a.title.trim() === input.title.trim() && a.case_id === (input.case_id ?? null)))
    );
    if (dup) {
      throw new ValidationError("พบนัดหมายที่อาจซ้ำกันในวันและเวลาดังกล่าว", {
        duplicateAppointment: enrichAppointment(state, dup, actor),
      });
    }
  }

  const nowIso = new Date().toISOString();
  const record: Appointment = {
    id: crypto.randomUUID(),
    case_id: input.case_id ?? null,
    title: input.title.trim(),
    category: input.category,
    appointment_type: input.appointment_type,
    appointment_date: input.appointment_date,
    start_time: input.start_time ?? null,
    end_time: input.end_time ?? null,
    location: input.location ?? "",
    court_id: input.court_id ?? null,
    responsible_user_id: input.responsible_user_id,
    visibility: input.visibility ?? "shared",
    description: input.description ?? "",
    status: input.status ?? "scheduled",
    reminder_1_day: input.reminder_1_day ?? true,
    reminder_same_day: input.reminder_same_day ?? true,
    created_by: actor.id,
    updated_by: actor.id,
    created_at: nowIso,
    updated_at: nowIso,
    deleted_at: null,
  };

  state.appointments.push(record);
  syncAppointmentReminders(state, record);
  notifyUsersForAppointment(
    state,
    actor.id,
    record,
    "มีนัดหมายใหม่",
    `${actor.full_name} เพิ่มนัด "${record.title}" วันที่ ${record.appointment_date}`
  );
  appendAuditLog(
    state,
    actor.id,
    "appointment",
    record.id,
    "CREATE",
    null,
    record as unknown as Record<string, unknown>
  );
  writeDb(state);
  return enrichAppointment(state, record, actor);
}

export function updateAppointmentRecord(
  actor: User,
  apptId: string,
  input: Partial<Appointment> & { expected_updated_at?: string }
): AppointmentWithRelations {
  const state = readDb();
  const idx = state.appointments.findIndex((a) => a.id === apptId && !a.deleted_at);
  if (idx === -1) throw new ValidationError("ไม่พบข้อมูลนัดหมาย");

  const existing = state.appointments[idx];
  if (input.expected_updated_at && existing.updated_at !== input.expected_updated_at) {
    throw new ConflictError(
      "นัดหมายนี้ถูกแก้ไขโดยผู้ใช้อื่นแล้ว กรุณาโหลดข้อมูลใหม่ก่อนบันทึกทับ"
    );
  }

  const { expected_updated_at: _expected, ...apptPatch } = input;
  const updated: Appointment = {
    ...existing,
    ...apptPatch,
    updated_by: actor.id,
    updated_at: new Date().toISOString(),
  };

  state.appointments[idx] = updated;
  syncAppointmentReminders(state, updated);

  const isCancelled = existing.status !== "cancelled" && updated.status === "cancelled";
  notifyUsersForAppointment(
    state,
    actor.id,
    updated,
    isCancelled ? "มีการยกเลิกนัดหมาย" : "มีการแก้ไขนัดหมาย",
    `${actor.full_name} ${isCancelled ? "ยกเลิก" : "แก้ไข"}นัด "${updated.title}"`
  );
  appendAuditLog(
    state,
    actor.id,
    "appointment",
    apptId,
    "UPDATE",
    existing as unknown as Record<string, unknown>,
    updated as unknown as Record<string, unknown>
  );
  writeDb(state);
  return enrichAppointment(state, updated, actor);
}

export function softDeleteAppointmentRecord(actor: User, apptId: string): void {
  const state = readDb();
  const idx = state.appointments.findIndex((a) => a.id === apptId && !a.deleted_at);
  if (idx === -1) throw new ValidationError("ไม่พบข้อมูลนัดหมาย");

  const existing = state.appointments[idx];
  const nowIso = new Date().toISOString();
  const deleted = { ...existing, deleted_at: nowIso, updated_by: actor.id, updated_at: nowIso };
  state.appointments[idx] = deleted;
  syncAppointmentReminders(state, deleted);
  appendAuditLog(
    state,
    actor.id,
    "appointment",
    apptId,
    "DELETE",
    existing as unknown as Record<string, unknown>,
    { deleted_at: nowIso }
  );
  writeDb(state);
}

export function restoreAppointmentRecord(
  actor: User,
  apptId: string
): AppointmentWithRelations {
  const state = readDb();
  const idx = state.appointments.findIndex((a) => a.id === apptId && !!a.deleted_at);
  if (idx === -1) throw new ValidationError("ไม่พบนัดหมายที่ถูกลบ");

  const existing = state.appointments[idx];
  const nowIso = new Date().toISOString();
  const restored: Appointment = {
    ...existing,
    deleted_at: null,
    updated_by: actor.id,
    updated_at: nowIso,
  };
  state.appointments[idx] = restored;
  syncAppointmentReminders(state, restored);
  appendAuditLog(
    state,
    actor.id,
    "appointment",
    apptId,
    "RESTORE",
    existing as unknown as Record<string, unknown>,
    restored as unknown as Record<string, unknown>
  );
  writeDb(state);
  return enrichAppointment(state, restored, actor);
}

export function markNotificationRead(userId: string, notificationId: string): void {
  const state = readDb();
  const n = state.notifications.find(
    (item) => item.id === notificationId && item.user_id === userId
  );
  if (n) {
    n.is_read = true;
    writeDb(state);
  }
}

export function markAllNotificationsRead(userId: string): void {
  const state = readDb();
  for (const n of state.notifications) {
    if (n.user_id === userId) n.is_read = true;
  }
  writeDb(state);
}

export function upsertCourt(actor: User, input: Omit<Court, "id" | "created_at"> & { id?: string }): Court {
  const state = readDb();
  if (input.id) {
    const idx = state.courts.findIndex((c) => c.id === input.id);
    if (idx === -1) throw new ValidationError("ไม่พบข้อมูลศาล");
    const updated = { ...state.courts[idx], ...input };
    state.courts[idx] = updated;
    appendAuditLog(state, actor.id, "court", updated.id, "UPDATE", state.courts[idx] as unknown as Record<string, unknown>, updated as unknown as Record<string, unknown>);
    writeDb(state);
    return updated;
  }
  const created: Court = {
    id: crypto.randomUUID(),
    name: input.name,
    province: input.province || "",
    is_active: input.is_active ?? true,
    created_at: new Date().toISOString(),
  };
  state.courts.push(created);
  appendAuditLog(state, actor.id, "court", created.id, "CREATE", null, created as unknown as Record<string, unknown>);
  writeDb(state);
  return created;
}

export function upsertCaseCategory(actor: User, input: Omit<CaseCategory, "id"> & { id?: string }): CaseCategory {
  const state = readDb();
  if (input.id) {
    const idx = state.case_categories.findIndex((c) => c.id === input.id);
    if (idx === -1) throw new ValidationError("ไม่พบประเภทคดี");
    const updated = { ...state.case_categories[idx], ...input };
    state.case_categories[idx] = updated;
    appendAuditLog(state, actor.id, "case_category", updated.id, "UPDATE", null, updated as unknown as Record<string, unknown>);
    writeDb(state);
    return updated;
  }
  const created: CaseCategory = {
    id: crypto.randomUUID(),
    abbreviation: input.abbreviation,
    description: input.description || "",
    is_active: input.is_active ?? true,
  };
  state.case_categories.push(created);
  appendAuditLog(state, actor.id, "case_category", created.id, "CREATE", null, created as unknown as Record<string, unknown>);
  writeDb(state);
  return created;
}

export function upsertAppointmentType(
  actor: User,
  input: Omit<AppointmentTypeItem, "id" | "created_at"> & { id?: string }
): AppointmentTypeItem {
  const state = readDb();
  if (input.id) {
    const idx = state.appointment_types.findIndex((t) => t.id === input.id);
    if (idx === -1) throw new ValidationError("ไม่พบประเภทนัดหมาย");
    const updated = { ...state.appointment_types[idx], ...input };
    state.appointment_types[idx] = updated;
    writeDb(state);
    return updated;
  }
  const created: AppointmentTypeItem = {
    id: crypto.randomUUID(),
    category: input.category,
    name: input.name,
    is_active: input.is_active ?? true,
    created_at: new Date().toISOString(),
  };
  state.appointment_types.push(created);
  appendAuditLog(state, actor.id, "appointment_type", created.id, "CREATE", null, created as unknown as Record<string, unknown>);
  writeDb(state);
  return created;
}

export function upsertPublicHoliday(
  actor: User,
  input: Omit<PublicHoliday, "id" | "created_at"> & { id?: string }
): PublicHoliday {
  if (actor.role !== "admin") {
    throw new ValidationError("เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถจัดการวันหยุดราชการได้");
  }
  const state = readDb();
  if (input.id) {
    const idx = state.public_holidays.findIndex((h) => h.id === input.id);
    if (idx === -1) throw new ValidationError("ไม่พบวันหยุดราชการ");
    const prev = state.public_holidays[idx];
    const updated = { ...prev, ...input };
    state.public_holidays[idx] = updated;
    appendAuditLog(state, actor.id, "public_holiday", updated.id, "UPDATE", prev as unknown as Record<string, unknown>, updated as unknown as Record<string, unknown>);
    writeDb(state);
    return updated;
  }
  const created: PublicHoliday = {
    id: crypto.randomUUID(),
    holiday_date: input.holiday_date,
    name: input.name,
    holiday_type: input.holiday_type || "national",
    is_active: input.is_active ?? true,
    created_at: new Date().toISOString(),
  };
  state.public_holidays.push(created);
  appendAuditLog(state, actor.id, "public_holiday", created.id, "CREATE", null, created as unknown as Record<string, unknown>);
  writeDb(state);
  return created;
}

export function upsertUserAccount(
  actor: User,
  input: { id?: string; full_name: string; email: string; role: "admin" | "staff"; is_active: boolean; password?: string }
): User {
  if (actor.role !== "admin") {
    throw new ValidationError("เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถจัดการบัญชีผู้ใช้ได้");
  }
  const state = readDb();
  if (input.id) {
    const idx = state.users.findIndex((u) => u.id === input.id);
    if (idx === -1) throw new ValidationError("ไม่พบบัญชีผู้ใช้");
    const prev = state.users[idx];
    const updated: User = {
      ...prev,
      full_name: input.full_name,
      email: input.email,
      role: input.role,
      is_active: input.is_active,
    };
    state.users[idx] = updated;
    if (input.password) {
      state.passwords[updated.email] = input.password;
    }
    appendAuditLog(state, actor.id, "user", updated.id, "UPDATE", prev as unknown as Record<string, unknown>, updated as unknown as Record<string, unknown>);
    writeDb(state);
    return updated;
  }

  if (state.users.length >= 5) {
    throw new ValidationError("ระบบรองรับบัญชีผู้ใช้งานสูงสุด 5 บัญชีตามแผนที่กำหนด");
  }
  if (state.users.some((u) => u.email.toLowerCase() === input.email.toLowerCase())) {
    throw new ValidationError("อีเมลนี้มีอยู่ในระบบแล้ว");
  }

  const created: User = {
    id: crypto.randomUUID(),
    full_name: input.full_name,
    email: input.email,
    role: input.role,
    is_active: input.is_active,
    created_at: new Date().toISOString(),
  };
  state.users.push(created);
  state.passwords[created.email] = input.password || "123456";
  appendAuditLog(state, actor.id, "user", created.id, "CREATE", null, created as unknown as Record<string, unknown>);
  writeDb(state);
  return created;
}
