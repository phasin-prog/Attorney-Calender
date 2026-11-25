import ExcelJS from "exceljs";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatThaiShortDate, getCategoryLabel, getStatusLabel } from "@/lib/thai-date";
import type { AppointmentWithRelations } from "@/types/domain";

export async function exportAppointmentsToExcel(
  appointments: AppointmentWithRelations[],
  filename = "lawyer-appointments.xlsx"
) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("ตารางนัดหมาย");

  sheet.columns = [
    { header: "วันที่", key: "date", width: 18 },
    { header: "เวลา", key: "time", width: 16 },
    { header: "กลุ่มนัดหมาย", key: "category", width: 20 },
    { header: "ประเภทนัดหมาย", key: "type", width: 22 },
    { header: "ชื่อนัดหมาย", key: "title", width: 32 },
    { header: "หมายเลขคดีดำ", key: "caseNumber", width: 18 },
    { header: "โจทก์ / จำเลย", key: "parties", width: 36 },
    { header: "ศาล / สถานที่", key: "location", width: 28 },
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
    const timeRange = a.start_time
      ? a.end_time
        ? `${a.start_time} - ${a.end_time}`
        : `${a.start_time} น.`
      : "ไม่ระบุเวลา";
    const parties = a.case
      ? `${a.case.plaintiff_name} / ${a.case.defendant_name}`
      : "-";
    sheet.addRow({
      date: formatThaiShortDate(a.appointment_date),
      time: timeRange,
      category: getCategoryLabel(a.category),
      type: a.appointment_type,
      title: a.title,
      caseNumber: a.case?.formatted_case_number || "-",
      parties,
      location: a.location || a.court?.name || "-",
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
    head: [["Date", "Time", "Type", "Title", "Case No.", "Location", "Responsible", "Status"]],
    body: appointments.map((a) => [
      a.appointment_date,
      a.start_time ? `${a.start_time}${a.end_time ? `-${a.end_time}` : ""}` : "-",
      a.category.toUpperCase(),
      a.title,
      a.case?.formatted_case_number || "-",
      a.location || a.court?.name || "-",
      a.responsible_user?.full_name || "-",
      a.status,
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [15, 41, 74] },
  });

  doc.save("lawyer-appointments.pdf");
}
