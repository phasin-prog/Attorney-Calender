"use client";

import React, { useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { Download, FileSpreadsheet, Printer } from "lucide-react";
import { exportAppointmentsToExcel, exportAppointmentsToPdf } from "@/lib/export-utils";
import {
  formatThaiDate,
  formatTime24,
  getBangkokToday,
  getCategoryLabel,
  getOurRoleLabel,
  getStatusLabel,
  THAI_MONTHS,
} from "@/lib/thai-date";
import { SearchableSelect } from "@/components/SearchableSelect";
import { ThaiDateInput } from "@/components/ThaiDateInput";
import type { AppointmentWithRelations, Court, User } from "@/types/domain";

interface CalendarViewProps {
  appointments: AppointmentWithRelations[];
  users: User[];
  courts: Court[];
  isReadOnly?: boolean;
  onAddAppointment: (defaultDate?: string) => void;
  onSelectAppointment: (appt: AppointmentWithRelations) => void;
}

export function CalendarView({
  appointments,
  users,
  courts,
  isReadOnly = false,
  onAddAppointment,
  onSelectAppointment,
}: CalendarViewProps) {
  const calendarRef = useRef<FullCalendar | null>(null);
  const [viewMode, setViewMode] = useState<"dayGridMonth" | "timeGridWeek" | "timeGridDay">(
    "dayGridMonth"
  );
  const [selectedDayForPrint, setSelectedDayForPrint] = useState(getBangkokToday());

  // Filters
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterUser, setFilterUser] = useState<string>("all");
  const [filterCourt, setFilterCourt] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const filteredAppointments = useMemo(() => {
    return appointments.filter((a) => {
      if (a.deleted_at) return false;
      if (filterCategory !== "all" && a.category !== filterCategory) return false;
      if (filterUser !== "all" && a.responsible_user_id !== filterUser) return false;
      if (filterCourt !== "all" && a.court_id !== filterCourt) return false;
      if (filterStatus !== "all" && a.status !== filterStatus) return false;
      return true;
    });
  }, [appointments, filterCategory, filterUser, filterCourt, filterStatus]);

  const events = useMemo(() => {
    return filteredAppointments.map((a) => {
      const colorMap = {
        court: "#0f294a",
        office: "#047857",
        personal: "#b45309",
      };
      const start = a.start_time
        ? `${a.appointment_date}T${a.start_time}:00`
        : a.appointment_date;
      return {
        id: a.id,
        title: a.case
          ? `[${a.case.formatted_case_number}] ${a.title}`
          : a.title,
        start,
        allDay: !a.start_time,
        backgroundColor: a.status === "cancelled" ? "#94a3b8" : colorMap[a.category],
        borderColor: a.status === "cancelled" ? "#94a3b8" : colorMap[a.category],
        extendedProps: { appointment: a },
      };
    });
  }, [filteredAppointments]);

  const dailyList = useMemo(() => {
    return filteredAppointments
      .filter((a) => a.appointment_date === selectedDayForPrint)
      .sort((a, b) => (a.start_time || "99:99").localeCompare(b.start_time || "99:99"));
  }, [filteredAppointments, selectedDayForPrint]);

  function changeView(next: "dayGridMonth" | "timeGridWeek" | "timeGridDay") {
    setViewMode(next);
    const api = calendarRef.current?.getApi();
    if (api) api.changeView(next);
  }

  return (
    <div className="space-y-5">
      {/* Toolbar & Export Actions */}
      <div className="no-print bg-white rounded-xl border border-slate-200 p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0f294a]">ปฏิทินนัดหมายกลาง</h1>
          <p className="text-slate-600 text-base">
            ดูตารางนัดหมายรายเดือน รายสัปดาห์ รายวัน พร้อมตัวกรองและส่งออกเอกสาร
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex rounded-xl border border-slate-300 overflow-hidden bg-white">
            <button
              type="button"
              onClick={() => changeView("dayGridMonth")}
              className={`px-4 py-2.5 text-sm font-semibold cursor-pointer ${
                viewMode === "dayGridMonth"
                  ? "bg-[#0f294a] text-white"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              รายเดือน
            </button>
            <button
              type="button"
              onClick={() => changeView("timeGridWeek")}
              className={`px-4 py-2.5 text-sm font-semibold cursor-pointer border-l border-slate-300 ${
                viewMode === "timeGridWeek"
                  ? "bg-[#0f294a] text-white"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              รายสัปดาห์
            </button>
            <button
              type="button"
              onClick={() => changeView("timeGridDay")}
              className={`px-4 py-2.5 text-sm font-semibold cursor-pointer border-l border-slate-300 ${
                viewMode === "timeGridDay"
                  ? "bg-[#0f294a] text-white"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              รายวัน
            </button>
          </div>

          <button
            type="button"
            onClick={() => exportAppointmentsToExcel(filteredAppointments)}
            className="btn-legal px-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 inline-flex items-center gap-2 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>Excel</span>
          </button>

          <button
            type="button"
            onClick={() => exportAppointmentsToPdf(filteredAppointments)}
            className="btn-legal px-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 inline-flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4 text-red-700" />
            <span>PDF</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="btn-legal px-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 inline-flex items-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-[#0f294a]" />
            <span>พิมพ์ตาราง</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="no-print bg-white rounded-xl border border-slate-200 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">
            ประเภทนัดหมาย
          </label>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="input-legal w-full px-3 border border-slate-300 bg-white"
          >
            <option value="all">ทุกประเภท</option>
            <option value="court">นัดหมายทางศาล</option>
            <option value="office">นัดหมายสำนักงาน</option>
            <option value="personal">นัดหมายส่วนตัว</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">
            ผู้รับผิดชอบ
          </label>
          <select
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            className="input-legal w-full px-3 border border-slate-300 bg-white"
          >
            <option value="all">ทุกคนในสำนักงาน</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">
            ศาล
          </label>
          <SearchableSelect
            value={filterCourt}
            onChange={setFilterCourt}
            placeholder="เลือกศาล..."
            searchPlaceholder="ค้นหาชื่อศาล..."
            allowClearOption={{ value: "all", label: "ทุกศาล" }}
            options={courts
              .filter((c) => c.is_active)
              .map((c) => ({
                value: c.id,
                label: c.name,
                searchText: `${c.name} ${c.province || ""}`,
              }))}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">
            สถานะนัดหมาย
          </label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input-legal w-full px-3 border border-slate-300 bg-white"
          >
            <option value="all">ทุกสถานะ</option>
            <option value="scheduled">กำหนดการ</option>
            <option value="completed">เสร็จสิ้น</option>
            <option value="cancelled">ยกเลิก</option>
          </select>
        </div>
      </div>

      {/* FullCalendar Container */}
      <div className="no-print bg-white rounded-xl border border-slate-200 p-4">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          locale="th"
          firstDay={1}
          height="auto"
          dayMaxEvents={4}
          slotLabelFormat={{
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }}
          eventTimeFormat={{
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }}
          titleFormat={(arg) => {
            const d = arg.date.marker;
            return `${THAI_MONTHS[d.getUTCMonth()]} พ.ศ. ${d.getUTCFullYear() + 543}`;
          }}
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "",
          }}
          buttonText={{
            today: "วันนี้",
            month: "เดือน",
            week: "สัปดาห์",
            day: "วัน",
          }}
          events={events}
          dateClick={(arg) => {
            setSelectedDayForPrint(arg.dateStr);
            if (!isReadOnly) {
              onAddAppointment(arg.dateStr);
            }
          }}
          eventClick={(arg) => {
            const appt = arg.event.extendedProps.appointment as AppointmentWithRelations;
            if (appt) onSelectAppointment(appt);
          }}
        />
      </div>

      {/* Printable Daily Schedule Section */}
      <div className="print-container bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-[#0f294a]">
              รายละเอียดนัดหมายประจำวัน: {formatThaiDate(selectedDayForPrint)}
            </h2>
          </div>
          <div className="no-print flex items-center gap-2">
            <label className="text-sm font-semibold text-slate-700">เลือกวัน:</label>
            <ThaiDateInput
              value={selectedDayForPrint}
              onChange={setSelectedDayForPrint}
              showDayPreview={false}
              showTodayButton={false}
            />
          </div>
        </div>

        {dailyList.length === 0 ? (
          <p className="text-slate-500">ไม่มีนัดหมายในวันที่เลือก</p>
        ) : (
          <>
            {/* Mobile Card List (< 640px) */}
            <div className="sm:hidden space-y-3">
              {dailyList.map((a) => {
                const courtName = a.court?.name || a.case?.court?.name || a.location || "-";
                const roleLabel = getOurRoleLabel(a.our_role || a.case?.our_role);
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => onSelectAppointment(a)}
                    className="w-full text-left p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-100 space-y-1.5 cursor-pointer"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      <span className="font-bold text-[#0f294a] text-sm">
                        {courtName} {a.courtroom ? `(${a.courtroom})` : ""}
                      </span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-[#0f294a] text-white">
                        {a.case?.formatted_case_number || "-"}
                      </span>
                    </div>
                    <div className="font-bold text-slate-900 text-base">{a.title}</div>
                    <div className="text-xs text-slate-600 flex flex-wrap gap-2">
                      <span className="font-bold text-[#0f294a]">
                        {formatTime24(a.start_time)}
                      </span>
                      {roleLabel && <span>• {roleLabel}</span>}
                      {a.sequence_note && <span className="text-rose-700">• {a.sequence_note}</span>}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Desktop Table (>= 640px) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-300 bg-slate-50">
                  <th className="py-2.5 px-3 font-semibold">ศาล / ห้องพิจารณาคดี</th>
                  <th className="py-2.5 px-3 font-semibold">เลขคดี</th>
                  <th className="py-2.5 px-3 font-semibold">โจทก์ - จำเลย / ความเกี่ยวข้อง</th>
                  <th className="py-2.5 px-3 font-semibold">นัดเกี่ยวกับอะไร</th>
                  <th className="py-2.5 px-3 font-semibold">เวลา (24 ชม.)</th>
                  <th className="py-2.5 px-3 font-semibold">ผู้รับผิดชอบ</th>
                  <th className="py-2.5 px-3 font-semibold">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {dailyList.map((a) => {
                  const courtName = a.court?.name || a.case?.court?.name || a.location || "-";
                  const roleLabel = getOurRoleLabel(a.our_role || a.case?.our_role);
                  const plaintiff = a.plaintiff_name || a.case?.plaintiff_name || "";
                  const defendant = a.defendant_name || a.case?.defendant_name || "";
                  return (
                    <tr
                      key={a.id}
                      onClick={() => onSelectAppointment(a)}
                      className="hover:bg-slate-50 cursor-pointer"
                    >
                      <td className="py-2.5 px-3">
                        <div className="font-semibold">{courtName}</div>
                        {a.courtroom && (
                          <div className="text-xs font-bold text-amber-800">{a.courtroom}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-[#0f294a]">
                        {a.case?.formatted_case_number || "-"}
                      </td>
                      <td className="py-2.5 px-3 text-sm">
                        {(plaintiff || defendant) && (
                          <div>
                            {plaintiff || "-"} / {defendant || "-"}
                          </div>
                        )}
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {roleLabel && (
                            <span className="text-xs font-semibold text-sky-800">{roleLabel}</span>
                          )}
                          {a.sequence_note && (
                            <span className="text-xs text-rose-700 font-semibold">
                              • {a.sequence_note}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold">{a.title}</div>
                        <div className="text-xs text-slate-500">
                          {getCategoryLabel(a.category)} ({a.appointment_type})
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-semibold whitespace-nowrap">
                        {formatTime24(a.start_time)}
                      </td>
                      <td className="py-2.5 px-3">
                        {a.responsible_user?.full_name || "-"}
                      </td>
                      <td className="py-2.5 px-3">{getStatusLabel(a.status)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>
    </div>
  );
}
