import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ConflictError,
  createAppointmentRecord,
  createCaseRecord,
  getBootstrapData,
  getPublicBootstrapData,
  readDb,
  restoreCaseRecord,
  softDeleteCaseRecord,
  updateAppointmentRecord,
  ValidationError,
} from "@/lib/db/store";
import {
  formatCaseNumber,
  formatThaiDate,
  formatThaiNumericDate,
  formatTime24,
  getOurRoleLabel,
  getWorkWeekDays,
} from "@/lib/thai-date";
import type { PublicHoliday } from "@/types/domain";

let tempDir: string;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "lawyer-cal-test-"));
  process.env.LAWYER_CALENDAR_DATA_DIR = tempDir;
});

afterEach(() => {
  delete process.env.LAWYER_CALENDAR_DATA_DIR;
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe("Thai Date & Case Number Formatting", () => {
  it("formats Buddhist Era Thai date correctly", () => {
    expect(formatThaiDate("2026-11-25")).toBe("วันพุธที่ 25 พฤศจิกายน พ.ศ. 2569");
  });

  it("formats case number as [abbr] [black]/[year]", () => {
    expect(formatCaseNumber("ผบ.", "123", 2569)).toBe("ผบ. 123/2569");
  });

  it("returns only Mon-Fri excluding active Thai public holidays", () => {
    const holidays: PublicHoliday[] = [
      {
        id: "h1",
        holiday_date: "2026-11-26", // Thursday
        name: "วันหยุดทดสอบ",
        holiday_type: "national",
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: "h2",
        holiday_date: "2026-11-27", // Friday (inactive)
        name: "วันหยุดยกเลิก",
        holiday_type: "national",
        is_active: false,
        created_at: new Date().toISOString(),
      },
    ];
    const res = getWorkWeekDays("2026-11-25", holidays, "2026-11-25");
    expect(res.workingDays.map((d) => d.date)).toEqual([
      "2026-11-23",
      "2026-11-24",
      "2026-11-25",
      "2026-11-27",
    ]);
    expect(res.skippedHolidays).toHaveLength(1);
    expect(res.skippedHolidays[0].holiday_date).toBe("2026-11-26");
  });
});

describe("Case Duplicate Detection & Soft Delete/Restore", () => {
  it("prevents duplicate active cases and allows restore after soft delete", () => {
    const db = readDb();
    const admin = db.users[0];
    const courtId = db.courts[0].id;
    const catId = db.case_categories[0].id;

    const created = createCaseRecord(admin, {
      court_id: courtId,
      category_id: catId,
      black_case_number: "999",
      case_year: 2569,
      plaintiff_name: "นาย ก",
      defendant_name: "นาย ข",
      responsible_user_id: admin.id,
      status: "active",
      notes: "",
    });

    expect(() =>
      createCaseRecord(admin, {
        court_id: courtId,
        category_id: catId,
        black_case_number: "999",
        case_year: 2569,
        plaintiff_name: "นาย ค",
        defendant_name: "นาย ง",
        responsible_user_id: admin.id,
        status: "active",
        notes: "",
      })
    ).toThrow(ValidationError);

    softDeleteCaseRecord(admin, created.id);
    const restored = restoreCaseRecord(admin, created.id);
    expect(restored.deleted_at).toBeNull();
  });
});

describe("Private Visibility & Optimistic Concurrency Control", () => {
  it("masks private appointments for other staff and throws ConflictError on stale updated_at", () => {
    const db = readDb();
    const owner = db.users[1]; // staff
    const otherStaff = db.users[2]; // another staff

    const appt = createAppointmentRecord(owner, {
      case_id: null,
      title: "นัดพบแพทย์ส่วนตัว",
      category: "personal",
      appointment_type: "นัดหมายส่วนตัวของทนายความ",
      appointment_date: "2026-11-26",
      start_time: "13:00",
      end_time: "14:00",
      location: "โรงพยาบาล",
      court_id: null,
      responsible_user_id: owner.id,
      visibility: "private",
      description: "รายละเอียดลับ",
      status: "scheduled",
      reminder_1_day: true,
      reminder_same_day: true,
    });

    const otherView = getBootstrapData(otherStaff);
    const foundForOther = otherView.appointments.find((a) => a.id === appt.id);
    expect(foundForOther?.is_masked_private).toBe(true);
    expect(foundForOther?.title).toBe("ไม่ว่าง (นัดหมายส่วนตัว)");

    // Simulate OCC conflict with stale timestamp
    expect(() =>
      updateAppointmentRecord(owner, appt.id, {
        title: "แก้ไขใหม่",
        expected_updated_at: "2020-01-01T00:00:00.000Z",
      })
    ).toThrow(ConflictError);
  });

  it("allows multiple appointments on the same day with courtroom, our_role, and sequence_note", () => {
    const db = readDb();
    const owner = db.users[0];

    const appt1 = createAppointmentRecord(owner, {
      case_id: null,
      title: "สืบพยานโจทก์",
      category: "court",
      appointment_type: "นัดสืบพยาน",
      appointment_date: "2026-11-27",
      start_time: "09:00",
      end_time: "12:00",
      location: "",
      court_id: db.courts[0].id,
      courtroom: "บัลลังก์ 4",
      our_role: "plaintiff_lawyer",
      sequence_note: "ลำดับที่ 1",
      plaintiff_name: "นาย ก",
      defendant_name: "นาย ข",
      responsible_user_id: owner.id,
      visibility: "shared",
      description: "",
      status: "scheduled",
      reminder_1_day: true,
      reminder_same_day: true,
    });

    const appt2 = createAppointmentRecord(owner, {
      case_id: null,
      title: "นัดพร้อม",
      category: "court",
      appointment_type: "นัดพร้อม",
      appointment_date: "2026-11-27",
      start_time: "09:00",
      end_time: null,
      location: "",
      court_id: db.courts[0].id,
      courtroom: "บัลลังก์ 7",
      our_role: "defendant_lawyer",
      sequence_note: "ลำดับที่ 3",
      plaintiff_name: "นาย ค",
      defendant_name: "นาย ง",
      responsible_user_id: owner.id,
      visibility: "private",
      description: "ความลับ",
      status: "scheduled",
      reminder_1_day: true,
      reminder_same_day: true,
    });

    expect(appt1.courtroom).toBe("บัลลังก์ 4");
    expect(appt2.sequence_note).toBe("ลำดับที่ 3");
    expect(formatThaiNumericDate("2026-11-27")).toBe("27/11/2569");
    expect(formatTime24("09:00", "12:00")).toBe("09:00 - 12:00 น.");
    expect(getOurRoleLabel("plaintiff_lawyer")).toBe("ทนายโจทก์");

    // Public read-only bootstrap should include shared appt1 and exclude private appt2
    const publicData = getPublicBootstrapData();
    expect(publicData.isReadOnly).toBe(true);
    expect(publicData.currentUser).toBeNull();
    expect(publicData.appointments.some((a) => a.id === appt1.id)).toBe(true);
    expect(publicData.appointments.some((a) => a.id === appt2.id)).toBe(false);
    expect(publicData.users.every((u) => u.email === "")).toBe(true);
  });
});
