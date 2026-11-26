export type UserRole = "admin" | "staff";
export type CaseStatus = "active" | "pending" | "closed";
export type CourtLevel = "first_instance" | "appeal" | "supreme";
export type OurRole = "plaintiff_lawyer" | "defendant_lawyer" | "other";
export type AppointmentCategory = "court" | "office" | "personal";
export type AppointmentVisibility = "shared" | "private";
export type AppointmentStatus = "scheduled" | "completed" | "cancelled";
export type AuditAction = "CREATE" | "UPDATE" | "DELETE" | "RESTORE";

export interface User {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface Court {
  id: string;
  name: string;
  province: string;
  is_active: boolean;
  created_at: string;
}

export interface CaseCategory {
  id: string;
  abbreviation: string;
  description: string;
  is_active: boolean;
}

export interface AppointmentTypeItem {
  id: string;
  category: AppointmentCategory;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface PublicHoliday {
  id: string;
  holiday_date: string; // YYYY-MM-DD
  name: string;
  holiday_type: string;
  is_active: boolean;
  created_at: string;
}

export interface CaseParty {
  order: number;
  name: string;
}

export interface CaseNoteEntry {
  id: string;
  content: string;
  created_by: string;
  created_by_name: string;
  created_at: string;
}

export interface LegalCase {
  id: string;
  court_id: string;
  category_id: string;
  black_case_number: string;
  case_year: number;
  plaintiff_name: string;
  defendant_name: string;
  plaintiffs?: CaseParty[];
  defendants?: CaseParty[];
  our_role?: OurRole;
  court_level?: CourtLevel;
  responsible_user_id: string;
  status: CaseStatus;
  notes: string;
  case_notes?: CaseNoteEntry[];
  client_phone?: string;
  client_contact_name?: string;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CaseWithRelations extends LegalCase {
  court?: Court;
  category?: CaseCategory;
  responsible_user?: User;
  formatted_case_number: string;
}

export interface Appointment {
  id: string;
  case_id: string | null;
  title: string;
  category: AppointmentCategory;
  appointment_type: string;
  appointment_date: string; // YYYY-MM-DD
  start_time: string | null; // HH:mm
  end_time: string | null; // HH:mm
  location: string;
  court_id: string | null;
  courtroom?: string;
  our_role?: OurRole | null;
  sequence_note?: string;
  plaintiff_name?: string;
  defendant_name?: string;
  responsible_user_id: string;
  visibility: AppointmentVisibility;
  description: string;
  status: AppointmentStatus;
  reminder_1_day: boolean;
  reminder_same_day: boolean;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface AppointmentWithRelations extends Appointment {
  case?: CaseWithRelations | null;
  court?: Court | null;
  responsible_user?: User | null;
  is_masked_private?: boolean;
}

export interface AppointmentReminder {
  id: string;
  appointment_id: string;
  user_id: string;
  remind_at: string;
  is_sent: boolean;
  sent_at: string | null;
}

export interface Notification {
  id: string;
  user_id: string;
  appointment_id: string | null;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  user_name?: string;
  entity_type: string;
  entity_id: string;
  action: AuditAction;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
}

export interface DatabaseState {
  users: User[];
  passwords: Record<string, string>; // email -> password (local auth mode)
  courts: Court[];
  case_categories: CaseCategory[];
  appointment_types: AppointmentTypeItem[];
  public_holidays: PublicHoliday[];
  cases: LegalCase[];
  appointments: Appointment[];
  appointment_reminders: AppointmentReminder[];
  notifications: Notification[];
  audit_logs: AuditLog[];
}
