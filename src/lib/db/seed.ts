import { addDays, format, parseISO, startOfWeek } from "date-fns";
import courts277 from "@/lib/db/courts-277.json";
import { getBangkokToday } from "@/lib/thai-date";
import type { DatabaseState } from "@/types/domain";

export function createInitialSeed(): DatabaseState {
  const todayStr = getBangkokToday();
  const monday = startOfWeek(parseISO(todayStr), { weekStartsOn: 1 });
  const d0 = format(monday, "yyyy-MM-dd"); // Monday
  const d1 = format(addDays(monday, 1), "yyyy-MM-dd"); // Tuesday
  const d2 = format(addDays(monday, 2), "yyyy-MM-dd"); // Wednesday
  const d3 = format(addDays(monday, 3), "yyyy-MM-dd"); // Thursday
  const d4 = format(addDays(monday, 4), "yyyy-MM-dd"); // Friday
  const nowIso = new Date().toISOString();

  const u1 = "00000000-0000-0000-0000-000000000001";
  const u2 = "00000000-0000-0000-0000-000000000002";
  const u3 = "00000000-0000-0000-0000-000000000003";
  const u4 = "00000000-0000-0000-0000-000000000004";
  const u5 = "00000000-0000-0000-0000-000000000005";

  const c1 = "10000000-0000-0000-0000-000000000001";
  const c2 = "10000000-0000-0000-0000-000000000002";
  const c3 = "10000000-0000-0000-0000-000000000003";
  const c4 = "10000000-0000-0000-0000-000000000004";
  const c5 = "10000000-0000-0000-0000-000000000005";

  const catCivil = "20000000-0000-0000-0000-000000000001";
  const catConsumer = "20000000-0000-0000-0000-000000000002";
  const catCriminal = "20000000-0000-0000-0000-000000000003";
  const catLabor = "20000000-0000-0000-0000-000000000004";

  const case1 = "30000000-0000-0000-0000-000000000001";
  const case2 = "30000000-0000-0000-0000-000000000002";
  const case3 = "30000000-0000-0000-0000-000000000003";
  const case4 = "30000000-0000-0000-0000-000000000004";

  const appt1 = "40000000-0000-0000-0000-000000000001";
  const appt2 = "40000000-0000-0000-0000-000000000002";
  const appt3 = "40000000-0000-0000-0000-000000000003";
  const appt4 = "40000000-0000-0000-0000-000000000004";
  const appt5 = "40000000-0000-0000-0000-000000000005";

  return {
    users: [
      {
        id: u1,
        full_name: "ทนายสมชาย วัฒนากูล",
        email: "somchai@lawfirm.th",
        role: "admin",
        is_active: true,
        created_at: nowIso,
      },
      {
        id: u2,
        full_name: "ทนายวิภาวี ศรีสุวรรณ",
        email: "wipawee@lawfirm.th",
        role: "staff",
        is_active: true,
        created_at: nowIso,
      },
      {
        id: u3,
        full_name: "ทนายธนกร พิทักษ์ธรรม",
        email: "thanakorn@lawfirm.th",
        role: "staff",
        is_active: true,
        created_at: nowIso,
      },
      {
        id: u4,
        full_name: "ทนายนภัสสร กิตติคุณ",
        email: "napassorn@lawfirm.th",
        role: "staff",
        is_active: true,
        created_at: nowIso,
      },
      {
        id: u5,
        full_name: "กมลวรรณ สุขใจ (เจ้าหน้าที่สำนักงาน)",
        email: "kamonwan@lawfirm.th",
        role: "staff",
        is_active: true,
        created_at: nowIso,
      },
    ],
    passwords: {
      "somchai@lawfirm.th": "123456",
      "wipawee@lawfirm.th": "123456",
      "thanakorn@lawfirm.th": "123456",
      "napassorn@lawfirm.th": "123456",
      "kamonwan@lawfirm.th": "123456",
    },
    courts: (() => {
      const base = [
        { id: c1, name: "ศาลแพ่ง", province: "กรุงเทพมหานคร", is_active: true, created_at: nowIso },
        { id: c2, name: "ศาลอาญา", province: "กรุงเทพมหานคร", is_active: true, created_at: nowIso },
        { id: c3, name: "ศาลจังหวัดนนทบุรี", province: "นนทบุรี", is_active: true, created_at: nowIso },
        { id: c4, name: "ศาลแขวงพระนครเหนือ", province: "กรุงเทพมหานคร", is_active: true, created_at: nowIso },
        { id: c5, name: "ศาลแรงงานกลาง", province: "กรุงเทพมหานคร", is_active: true, created_at: nowIso },
      ];
      const existingNames = new Set(base.map((b) => b.name));
      const extra = (courts277 as Array<{ num: number; name: string; province: string }>)
        .filter((c) => c.name && !existingNames.has(c.name))
        .map((c) => ({
          id: `10000000-0000-0000-0001-${String(c.num).padStart(12, "0")}`,
          name: c.name,
          province: c.province || "",
          is_active: true,
          created_at: nowIso,
        }));
      return [...base, ...extra];
    })(),
    case_categories: [
      { id: catCivil, abbreviation: "พ.", description: "คดีแพ่ง", is_active: true },
      { id: catConsumer, abbreviation: "ผบ.", description: "คดีผู้บริโภค", is_active: true },
      { id: catCriminal, abbreviation: "อ.", description: "คดีอาญา", is_active: true },
      { id: catLabor, abbreviation: "ร.", description: "คดีแรงงาน", is_active: true },
    ],
    appointment_types: [
      { id: "50000000-0000-0000-0000-000000000001", category: "court", name: "นัดสืบพยาน", is_active: true, created_at: nowIso },
      { id: "50000000-0000-0000-0000-000000000002", category: "court", name: "นัดไต่สวน", is_active: true, created_at: nowIso },
      { id: "50000000-0000-0000-0000-000000000003", category: "court", name: "นัดฟังคำพิพากษา", is_active: true, created_at: nowIso },
      { id: "50000000-0000-0000-0000-000000000004", category: "court", name: "นัดพร้อม", is_active: true, created_at: nowIso },
      { id: "50000000-0000-0000-0000-000000000005", category: "court", name: "นัดตรวจพยานหลักฐาน", is_active: true, created_at: nowIso },
      { id: "50000000-0000-0000-0000-000000000006", category: "court", name: "นัดอื่น ๆ", is_active: true, created_at: nowIso },
      { id: "50000000-0000-0000-0000-000000000007", category: "office", name: "นัดพบลูกความ", is_active: true, created_at: nowIso },
      { id: "50000000-0000-0000-0000-000000000008", category: "office", name: "นัดปรึกษาคดี", is_active: true, created_at: nowIso },
      { id: "50000000-0000-0000-0000-000000000009", category: "office", name: "นัดประชุม", is_active: true, created_at: nowIso },
      { id: "50000000-0000-0000-0000-000000000010", category: "office", name: "นัดจัดเตรียมเอกสาร", is_active: true, created_at: nowIso },
      { id: "50000000-0000-0000-0000-000000000011", category: "office", name: "นัดอื่น ๆ", is_active: true, created_at: nowIso },
      { id: "50000000-0000-0000-0000-000000000012", category: "personal", name: "นัดหมายส่วนตัวของทนายความ", is_active: true, created_at: nowIso },
      { id: "50000000-0000-0000-0000-000000000013", category: "personal", name: "นัดหมายส่วนตัวอื่น ๆ", is_active: true, created_at: nowIso },
    ],
    public_holidays: [
      { id: "60000000-0000-0000-0000-000000000001", holiday_date: "2026-01-01", name: "วันขึ้นปีใหม่", holiday_type: "national", is_active: true, created_at: nowIso },
      { id: "60000000-0000-0000-0000-000000000002", holiday_date: "2026-04-06", name: "วันจักรี", holiday_type: "national", is_active: true, created_at: nowIso },
      { id: "60000000-0000-0000-0000-000000000003", holiday_date: "2026-04-13", name: "วันสงกรานต์", holiday_type: "national", is_active: true, created_at: nowIso },
      { id: "60000000-0000-0000-0000-000000000004", holiday_date: "2026-05-01", name: "วันแรงงานแห่งชาติ", holiday_type: "national", is_active: true, created_at: nowIso },
      { id: "60000000-0000-0000-0000-000000000005", holiday_date: "2026-08-12", name: "วันแม่แห่งชาติ", holiday_type: "national", is_active: true, created_at: nowIso },
      { id: "60000000-0000-0000-0000-000000000006", holiday_date: "2026-10-13", name: "วันนวมินทรมหาราช", holiday_type: "national", is_active: true, created_at: nowIso },
      { id: "60000000-0000-0000-0000-000000000007", holiday_date: "2026-10-23", name: "วันปิยมหาราช", holiday_type: "national", is_active: true, created_at: nowIso },
      { id: "60000000-0000-0000-0000-000000000008", holiday_date: "2026-12-07", name: "ชดเชยวันชาติ / วันพ่อแห่งชาติ", holiday_type: "national", is_active: true, created_at: nowIso },
      { id: "60000000-0000-0000-0000-000000000009", holiday_date: "2026-12-10", name: "วันรัฐธรรมนูญ", holiday_type: "national", is_active: true, created_at: nowIso },
      { id: "60000000-0000-0000-0000-000000000010", holiday_date: "2026-12-31", name: "วันสิ้นปี", holiday_type: "national", is_active: true, created_at: nowIso },
    ],
    cases: [
      {
        id: case1,
        court_id: c1,
        category_id: catConsumer,
        black_case_number: "123",
        case_year: 2569,
        plaintiff_name: "บริษัท สยามเจริญรุ่งเรือง จำกัด",
        defendant_name: "นายวิชัย มั่นคง",
        responsible_user_id: u1,
        status: "active",
        notes: "คดีผิดสัญญาซื้อขาย เตรียมพยานเอกสารใบส่งของและใบแจ้งหนี้",
        created_by: u1,
        updated_by: u1,
        created_at: nowIso,
        updated_at: nowIso,
        deleted_at: null,
      },
      {
        id: case2,
        court_id: c2,
        category_id: catCriminal,
        black_case_number: "458",
        case_year: 2569,
        plaintiff_name: "พนักงานอัยการ สำนักงานอัยการสูงสุด",
        defendant_name: "นายเอกชัย ใจกล้า",
        responsible_user_id: u2,
        status: "active",
        notes: "นัดตรวจพยานหลักฐานและกำหนดวันสืบพยาน",
        created_by: u2,
        updated_by: u2,
        created_at: nowIso,
        updated_at: nowIso,
        deleted_at: null,
      },
      {
        id: case3,
        court_id: c3,
        category_id: catCivil,
        black_case_number: "89",
        case_year: 2569,
        plaintiff_name: "นางสาวสุนิสา รักดี",
        defendant_name: "บริษัท อสังหานนท์ จำกัด",
        responsible_user_id: u3,
        status: "pending",
        notes: "รอฟังคำพิพากษาศาลชั้นต้น",
        created_by: u3,
        updated_by: u3,
        created_at: nowIso,
        updated_at: nowIso,
        deleted_at: null,
      },
      {
        id: case4,
        court_id: c5,
        category_id: catLabor,
        black_case_number: "312",
        case_year: 2569,
        plaintiff_name: "นายประเสริฐ ขยันยิ่ง",
        defendant_name: "บริษัท โลจิสติกส์ไทย จำกัด",
        responsible_user_id: u4,
        status: "active",
        notes: "คดีเลิกจ้างไม่เป็นธรรม",
        created_by: u4,
        updated_by: u4,
        created_at: nowIso,
        updated_at: nowIso,
        deleted_at: null,
      },
    ],
    appointments: [
      {
        id: appt1,
        case_id: case1,
        title: "สืบพยานโจทก์ปากที่ 1–2",
        category: "court",
        appointment_type: "นัดสืบพยาน",
        appointment_date: d0,
        start_time: "09:00",
        end_time: "12:00",
        location: "ห้องพิจารณาคดี 402 ศาลแพ่ง",
        court_id: c1,
        responsible_user_id: u1,
        visibility: "shared",
        description: "เตรียมแฟ้มพยานหลักฐานชุดจริงและบัญชีพยาน",
        status: "scheduled",
        reminder_1_day: true,
        reminder_same_day: true,
        created_by: u1,
        updated_by: u1,
        created_at: nowIso,
        updated_at: nowIso,
        deleted_at: null,
      },
      {
        id: appt2,
        case_id: case2,
        title: "ตรวจพยานหลักฐานคดีอาญา",
        category: "court",
        appointment_type: "นัดตรวจพยานหลักฐาน",
        appointment_date: d2,
        start_time: "09:30",
        end_time: "11:30",
        location: "ห้องพิจารณาคดี 805 ศาลอาญา",
        court_id: c2,
        responsible_user_id: u2,
        visibility: "shared",
        description: "ตรวจสอบบัญชีระบุพยานร่วมกับพนักงานอัยการ",
        status: "scheduled",
        reminder_1_day: true,
        reminder_same_day: true,
        created_by: u2,
        updated_by: u2,
        created_at: nowIso,
        updated_at: nowIso,
        deleted_at: null,
      },
      {
        id: appt3,
        case_id: case4,
        title: "พบลูกความเตรียมคำเบิกความ",
        category: "office",
        appointment_type: "นัดพบลูกความ",
        appointment_date: d2,
        start_time: "14:00",
        end_time: "15:30",
        location: "ห้องประชุม 1 สำนักงานกฎหมาย",
        court_id: null,
        responsible_user_id: u4,
        visibility: "shared",
        description: "ซักซ้อมข้อเท็จจริงก่อนวันนัดไต่สวน",
        status: "scheduled",
        reminder_1_day: true,
        reminder_same_day: true,
        created_by: u4,
        updated_by: u4,
        created_at: nowIso,
        updated_at: nowIso,
        deleted_at: null,
      },
      {
        id: appt4,
        case_id: case3,
        title: "ฟังคำพิพากษาศาลชั้นต้น",
        category: "court",
        appointment_type: "นัดฟังคำพิพากษา",
        appointment_date: d4,
        start_time: "10:00",
        end_time: "11:00",
        location: "ศาลจังหวัดนนทบุรี",
        court_id: c3,
        responsible_user_id: u3,
        visibility: "shared",
        description: "แจ้งผลคำพิพากษาให้ลูกความทราบทันทีหลังเสร็จสิ้น",
        status: "scheduled",
        reminder_1_day: true,
        reminder_same_day: true,
        created_by: u3,
        updated_by: u3,
        created_at: nowIso,
        updated_at: nowIso,
        deleted_at: null,
      },
      {
        id: appt5,
        case_id: null,
        title: "ประชุมสรุปงานประจำสัปดาห์",
        category: "office",
        appointment_type: "นัดประชุม",
        appointment_date: d1,
        start_time: "16:00",
        end_time: "17:00",
        location: "ห้องประชุมใหญ่ สำนักงาน",
        court_id: null,
        responsible_user_id: u1,
        visibility: "shared",
        description: "ติดตามความคืบหน้าคดีทุกทีม",
        status: "scheduled",
        reminder_1_day: true,
        reminder_same_day: true,
        created_by: u5,
        updated_by: u5,
        created_at: nowIso,
        updated_at: nowIso,
        deleted_at: null,
      },
    ],
    appointment_reminders: [],
    notifications: [
      {
        id: "70000000-0000-0000-0000-000000000001",
        user_id: u1,
        appointment_id: appt2,
        title: "มีนัดหมายใหม่ในสำนักงาน",
        message: "ทนายวิภาวี เพิ่มนัด \"ตรวจพยานหลักฐานคดีอาญา\" (อ. 458/2569)",
        is_read: false,
        created_at: nowIso,
      },
      {
        id: "70000000-0000-0000-0000-000000000002",
        user_id: u1,
        appointment_id: appt4,
        title: "แจ้งเตือนนัดหมายล่วงหน้า",
        message: "นัดฟังคำพิพากษาศาลชั้นต้น (พ. 89/2569) ในสัปดาห์นี้",
        is_read: false,
        created_at: nowIso,
      },
    ],
    audit_logs: [
      {
        id: "80000000-0000-0000-0000-000000000001",
        user_id: u1,
        user_name: "ทนายสมชาย วัฒนากูล",
        entity_type: "case",
        entity_id: case1,
        action: "CREATE",
        old_data: null,
        new_data: { black_case_number: "123", case_year: 2569 },
        created_at: nowIso,
      },
    ],
  };
}
