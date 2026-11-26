import ExcelJS from "exceljs";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  formatThaiNumericDate,
  formatThaiShortDate,
  formatTime24,
  getCategoryLabel,
  getOurRoleLabel,
  getStatusLabel,
} from "@/lib/thai-date";
import type { AppointmentWithRelations } from "@/types/domain";

export async function exportAppointmentsToExcel(
  appointments: AppointmentWithRelations[],
  filename = "lawyer-appointments.xlsx"
) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("ตารางนัดหมาย");

  sheet.columns = [
    { header: "ศาล", key: "court", width: 26 },
    { header: "ห้องพิจารณาคดี", key: "courtroom", width: 16 },
    { header: "เลขคดี", key: "caseNumber", width: 18 },
    { header: "โจทก์ / จำเลย", key: "parties", width: 36 },
    { header: "ความเกี่ยวข้อง", key: "ourRole", width: 16 },
    { header: "ลำดับที่", key: "sequenceNote", width: 16 },
    { header: "นัดเกี่ยวกับอะไร", key: "title", width: 32 },
    { header: "กลุ่มนัดหมาย", key: "category", width: 20 },
    { header: "ประเภทนัดหมาย", key: "type", width: 22 },
    { header: "วันที่ (พ.ศ.)", key: "date", width: 18 },
    { header: "เวลา (24 ชม.)", key: "time", width: 16 },
    { header: "ผู้รับผิดชอบ", key: "owner", width: 24 },
    { header: "สถานะ", key: "status", width: 14 },
  ];

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0F294A" },
  };

  for (const a of appointments) {
    const plaintiff = a.plaintiff_name || a.case?.plaintiff_name || "";
    const defendant = a.defendant_name || a.case?.defendant_name || "";
    const parties = plaintiff || defendant ? `${plaintiff || "-"} / ${defendant || "-"}` : "-";
    sheet.addRow({
      caseNumber: a.case?.formatted_case_number || "-",
      court: a.court?.name || a.case?.court?.name || a.location || "-",
      courtroom: a.courtroom || "-",
      date: formatThaiShortDate(a.appointment_date),
      time: formatTime24(a.start_time),
      ourRole: getOurRoleLabel(a.our_role || a.case?.our_role) || "-",
      sequenceNote: a.sequence_note || "-",
      parties,
      category: getCategoryLabel(a.category),
      type: a.appointment_type,
      title: a.title,
      owner: a.responsible_user?.full_name || "-",
      status: getStatusLabel(a.status),
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportAppointmentsToPdf(
  appointments: AppointmentWithRelations[],
  title = "Lawyer Calendar - Schedule"
) {
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(14);
  doc.text(title, 14, 16);

  autoTable(doc, {
    startY: 24,
    head: [
      [
        "Case No.",
        "Court / Room",
        "Date (B.E.)",
        "Time (24h)",
        "Title",
        "Responsible",
        "Status",
      ],
    ],
    body: appointments.map((a) => [
      a.case?.formatted_case_number || "-",
      [a.court?.name || a.location, a.courtroom].filter(Boolean).join(" / ") || "-",
      formatThaiNumericDate(a.appointment_date),
      a.start_time ? `${a.start_time}${a.end_time ? `-${a.end_time}` : ""}` : "-",
      a.title,
      a.responsible_user?.full_name || "-",
      a.status,
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [15, 41, 74] },
  });

  doc.save("lawyer-appointments.pdf");
}
