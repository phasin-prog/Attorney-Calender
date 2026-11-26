import { addDays, format, parseISO, startOfWeek } from "date-fns";
import type { CaseParty, CourtLevel, OurRole, PublicHoliday } from "@/types/domain";

const THAI_DAYS = [
  "วันอาทิตย์",
  "วันจันทร์",
  "วันอังคาร",
  "วันพุธ",
  "วันพฤหัสบดี",
  "วันศุกร์",
  "วันเสาร์",
];

const THAI_MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

const THAI_SHORT_MONTHS = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
];

export function getBangkokToday(): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date());
}

export function formatThaiDate(dateStr: string): string {
  const date = parseISO(dateStr);
  const dayName = THAI_DAYS[date.getDay()];
  const dayNum = date.getDate();
  const monthName = THAI_MONTHS[date.getMonth()];
  const buddhistYear = date.getFullYear() + 543;
  return `${dayName}ที่ ${dayNum} ${monthName} พ.ศ. ${buddhistYear}`;
}

export function formatThaiShortDate(dateStr: string): string {
  const date = parseISO(dateStr);
  const dayNum = date.getDate();
  const monthName = THAI_SHORT_MONTHS[date.getMonth()];
  const buddhistYear = date.getFullYear() + 543;
  return `${dayNum} ${monthName} ${buddhistYear}`;
}

export function formatThaiMonthYear(dateStr: string): string {
  const date = parseISO(dateStr);
  const monthName = THAI_MONTHS[date.getMonth()];
  const buddhistYear = date.getFullYear() + 543;
  return `${monthName} พ.ศ. ${buddhistYear}`;
}

export function formatThaiDateTime(isoStr: string): string {
  const d = new Date(isoStr);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  const dateStr = `${map.year}-${map.month}-${map.day}`;
  return `${formatThaiShortDate(dateStr)} ${map.hour}:${map.minute} น.`;
}

export function formatCaseNumber(
  abbreviation: string | undefined,
  blackNumber: string,
  caseYear: number
): string {
  const abbr = abbreviation?.trim() || "";
  return `${abbr} ${blackNumber}/${caseYear}`.trim();
}

export interface WorkWeekDay {
  date: string; // YYYY-MM-DD
  label: string;
  isToday: boolean;
}

/**
 * Returns Monday-Friday of the week containing `anchorDateStr`,
 * excluding any active Thai public holidays (per PRD Change Request).
 */
export function getWorkWeekDays(
  anchorDateStr: string,
  holidays: PublicHoliday[],
  todayStr: string = getBangkokToday()
): {
  mondayStr: string;
  fridayStr: string;
  workingDays: WorkWeekDay[];
  skippedHolidays: PublicHoliday[];
} {
  const anchor = parseISO(anchorDateStr);
  const monday = startOfWeek(anchor, { weekStartsOn: 1 });
  const mondayStr = format(monday, "yyyy-MM-dd");
  const fridayStr = format(addDays(monday, 4), "yyyy-MM-dd");

  const activeHolidayMap = new Map<string, PublicHoliday>();
  for (const h of holidays) {
    if (h.is_active) {
      activeHolidayMap.set(h.holiday_date, h);
    }
  }

  const workingDays: WorkWeekDay[] = [];
  const skippedHolidays: PublicHoliday[] = [];

  for (let i = 0; i < 5; i++) {
    const d = addDays(monday, i);
    const dateStr = format(d, "yyyy-MM-dd");
    const holiday = activeHolidayMap.get(dateStr);
    if (holiday) {
      skippedHolidays.push(holiday);
      continue;
    }
    workingDays.push({
      date: dateStr,
      label: formatThaiDate(dateStr),
      isToday: dateStr === todayStr,
    });
  }

  return { mondayStr, fridayStr, workingDays, skippedHolidays };
}

export function getCategoryLabel(category: "court" | "office" | "personal"): string {
  switch (category) {
    case "court":
      return "นัดหมายทางศาล";
    case "office":
      return "นัดหมายสำนักงาน";
    case "personal":
      return "นัดหมายส่วนตัว";
  }
}

export function getStatusLabel(status: "scheduled" | "completed" | "cancelled"): string {
  switch (status) {
    case "scheduled":
      return "กำหนดการ";
    case "completed":
      return "เสร็จสิ้น";
    case "cancelled":
      return "ยกเลิก";
  }
}

export function getCaseStatusLabel(status: "active" | "pending" | "closed"): string {
  switch (status) {
    case "active":
      return "กำลังดำเนินการ";
    case "pending":
      return "รอพิจารณา";
    case "closed":
      return "เสร็จสิ้นแล้ว";
  }
}

export function getOurRoleLabel(role?: OurRole | null): string {
  switch (role) {
    case "plaintiff_lawyer":
      return "ทนายโจทก์";
    case "defendant_lawyer":
      return "ทนายจำเลย";
    case "other":
      return "อื่น ๆ";
    default:
      return "";
  }
}

export function formatThaiNumericDate(dateStr: string): string {
  if (!dateStr) return "-";
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return dateStr;
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y + 543}`;
}

export function formatTime24(startTime: string | null | undefined, endTime?: string | null): string {
  if (!startTime) return "ไม่ระบุเวลา";
  const s = startTime.slice(0, 5);
  if (endTime) {
    return `${s} - ${endTime.slice(0, 5)} น.`;
  }
  return `${s} น.`;
}

export function getCourtLevelLabel(level?: CourtLevel | null): string {
  switch (level) {
    case "appeal":
      return "ชั้นอุทธรณ์";
    case "supreme":
      return "ชั้นฎีกา";
    case "first_instance":
    default:
      return "ศาลชั้นต้น";
  }
}

export function formatPartiesSummary(
  parties?: CaseParty[] | null,
  fallbackName?: string
): string {
  if (parties && parties.length > 0) {
    return [...parties]
      .sort((a, b) => a.order - b.order)
      .map((p) => `${p.order}. ${p.name}`)
      .join(", ");
  }
  return fallbackName?.trim() || "-";
}

export { THAI_MONTHS, THAI_SHORT_MONTHS };
