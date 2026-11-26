import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("กรุณากรอกอีเมลให้ถูกต้อง"),
  password: z.string().min(4, "กรุณากรอกรหัสผ่านอย่างน้อย 4 ตัวอักษร"),
});

export const registerSchema = z.object({
  full_name: z.string().trim().min(2, "กรุณากรอกชื่อ-นามสกุล"),
  email: z.string().trim().email("กรุณากรอกอีเมลให้ถูกต้อง"),
  password: z.string().min(6, "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"),
});

export const appointmentInputSchema = z.object({
  title: z.string().trim().min(1, "กรุณากรอกชื่อนัดหมาย"),
  appointment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "รูปแบบวันที่ไม่ถูกต้อง"),
  category: z.enum(["court", "office", "personal"]),
  appointment_type: z.string().trim().min(1, "กรุณาเลือกประเภทนัดหมาย"),
  start_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .nullable()
    .optional(),
  end_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .nullable()
    .optional(),
  case_id: z.string().uuid().nullable().optional(),
  court_id: z.string().uuid().nullable().optional(),
  courtroom: z.string().trim().optional().default(""),
  our_role: z.enum(["plaintiff_lawyer", "defendant_lawyer", "other"]).nullable().optional(),
  sequence_note: z.string().trim().optional().default(""),
  plaintiff_name: z.string().trim().optional().default(""),
  defendant_name: z.string().trim().optional().default(""),
  location: z.string().trim().optional().default(""),
  responsible_user_id: z.string().uuid("กรุณาเลือกผู้รับผิดชอบ"),
  visibility: z.enum(["shared", "private"]).default("shared"),
  description: z.string().trim().optional().default(""),
  status: z.enum(["scheduled", "completed", "cancelled"]).default("scheduled"),
  reminder_1_day: z.boolean().default(true),
  reminder_same_day: z.boolean().default(true),
  expected_updated_at: z.string().optional(),
  force_duplicate: z.boolean().optional(),
});

export const caseInputSchema = z.object({
  court_id: z.string().uuid("กรุณาเลือกศาล"),
  category_id: z.string().uuid("กรุณาเลือกอักษรย่อประเภทคดี"),
  black_case_number: z.string().trim().min(1, "กรุณากรอกหมายเลขคดีดำ"),
  case_year: z.coerce
    .number()
    .int()
    .min(2500, "กรุณากรอกปี พ.ศ. ให้ถูกต้อง")
    .max(2700, "กรุณากรอกปี พ.ศ. ให้ถูกต้อง"),
  plaintiff_name: z.string().trim().min(1, "กรุณากรอกชื่อโจทก์"),
  defendant_name: z.string().trim().min(1, "กรุณากรอกชื่อจำเลย"),
  our_role: z.enum(["plaintiff_lawyer", "defendant_lawyer", "other"]).optional().default("plaintiff_lawyer"),
  responsible_user_id: z.string().uuid("กรุณาเลือกผู้รับผิดชอบคดี"),
  status: z.enum(["active", "pending", "closed"]).default("active"),
  notes: z.string().trim().optional().default(""),
  expected_updated_at: z.string().optional(),
});

export const courtInputSchema = z.object({
  name: z.string().trim().min(1, "กรุณากรอกชื่อศาล"),
  province: z.string().trim().optional().default(""),
  is_active: z.boolean().optional().default(true),
});

export const caseCategoryInputSchema = z.object({
  abbreviation: z.string().trim().min(1, "กรุณากรอกอักษรย่อ"),
  description: z.string().trim().optional().default(""),
  is_active: z.boolean().optional().default(true),
});

export const appointmentTypeInputSchema = z.object({
  category: z.enum(["court", "office", "personal"]),
  name: z.string().trim().min(1, "กรุณากรอกชื่อประเภทนัดหมาย"),
  is_active: z.boolean().optional().default(true),
});

export const holidayInputSchema = z.object({
  holiday_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "รูปแบบวันที่ไม่ถูกต้อง"),
  name: z.string().trim().min(1, "กรุณากรอกชื่อวันหยุดราชการ"),
  holiday_type: z.string().trim().default("national"),
  is_active: z.boolean().optional().default(true),
});

export const userInputSchema = z.object({
  full_name: z.string().trim().min(1, "กรุณากรอกชื่อ-นามสกุล"),
  email: z.string().trim().email("รูปแบบอีเมลไม่ถูกต้อง"),
  role: z.enum(["admin", "staff"]).default("staff"),
  password: z.string().min(4).optional(),
  is_active: z.boolean().optional().default(true),
});
