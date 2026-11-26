"use client";

import React, { useMemo, useState } from "react";
import { addDays, format, parseISO } from "date-fns";
import {
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Clock,
  DoorOpen,
  Eye,
  Landmark,
  Plus,
  Scale,
  User as UserIcon,
} from "lucide-react";
import {
  formatThaiShortDate,
  formatTime24,
  getBangkokToday,
  getCategoryLabel,
  getOurRoleLabel,
  getStatusLabel,
  getWorkWeekDays,
} from "@/lib/thai-date";
import type { AppointmentWithRelations, PublicHoliday } from "@/types/domain";

interface WeeklyHomeViewProps {
  appointments: AppointmentWithRelations[];
  holidays: PublicHoliday[];
  isReadOnly?: boolean;
  onAddAppointment: (defaultDate?: string) => void;
  onSelectAppointment: (appt: AppointmentWithRelations) => void;
}

export function WeeklyHomeView({
  appointments,
  holidays,
  isReadOnly = false,
  onAddAppointment,
  onSelectAppointment,
}: WeeklyHomeViewProps) {
  const todayStr = getBangkokToday();
  const [anchorDate, setAnchorDate] = useState<string>(todayStr);

  const { mondayStr, fridayStr, workingDays, skippedHolidays } = useMemo(
    () => getWorkWeekDays(anchorDate, holidays, todayStr),
    [anchorDate, holidays, todayStr]
  );

  const appointmentsByDate = useMemo(() => {
    const map = new Map<string, AppointmentWithRelations[]>();
    for (const day of workingDays) {
      map.set(day.date, []);
    }
    for (const appt of appointments) {
      if (appt.deleted_at) continue;
      const list = map.get(appt.appointment_date);
      if (list) list.push(appt);
    }
    for (const [, list] of map) {
      list.sort((a, b) => {
        const ta = a.start_time || "99:99";
        const tb = b.start_time || "99:99";
        return ta.localeCompare(tb);
      });
    }
    return map;
  }, [appointments, workingDays]);

  function handlePrevWeek() {
    setAnchorDate(format(addDays(parseISO(mondayStr), -7), "yyyy-MM-dd"));
  }

  function handleNextWeek() {
    setAnchorDate(format(addDays(parseISO(mondayStr), 7), "yyyy-MM-dd"));
  }

  function handleCurrentWeek() {
    setAnchorDate(todayStr);
  }

  function getCategoryBadgeClass(cat: AppointmentWithRelations["category"]) {
    switch (cat) {
      case "court":
        return "bg-blue-50 text-blue-900 border-blue-200";
      case "office":
        return "bg-emerald-50 text-emerald-900 border-emerald-200";
      case "personal":
        return "bg-amber-50 text-amber-900 border-amber-200";
    }
  }

  function getRoleBadgeClass(role?: string | null) {
    switch (role) {
      case "plaintiff_lawyer":
        return "bg-sky-100 text-sky-900 border-sky-300";
      case "defendant_lawyer":
        return "bg-purple-100 text-purple-900 border-purple-300";
      default:
        return "bg-slate-100 text-slate-800 border-slate-300";
    }
  }

  return (
    <div className="space-y-6">
      {/* Header & Week Navigation */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-bold text-[#0f294a]">
            รายการนัดหมายประจำสัปดาห์
          </h1>
          <p className="text-slate-600 text-base mt-1">
            วันจันทร์ – วันศุกร์ (เฉพาะวันทำการ) : {formatThaiShortDate(mondayStr)} –{" "}
            {formatThaiShortDate(fridayStr)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handlePrevWeek}
            className="btn-legal px-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>สัปดาห์ก่อนหน้า</span>
          </button>

          <button
            type="button"
            onClick={handleCurrentWeek}
            className="btn-legal px-4 bg-slate-100 border border-slate-300 hover:bg-slate-200 text-[#0f294a] cursor-pointer"
          >
            สัปดาห์ปัจจุบัน
          </button>

          <button
            type="button"
            onClick={handleNextWeek}
            className="btn-legal px-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <span>สัปดาห์ถัดไป</span>
            <ChevronRight className="w-5 h-5" />
          </button>

          {!isReadOnly && (
            <button
              type="button"
              onClick={() => onAddAppointment()}
              className="btn-legal px-5 bg-[#0f294a] hover:bg-[#173b69] text-white inline-flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-5 h-5" />
              <span>เพิ่มนัดหมาย</span>
            </button>
          )}
        </div>
      </div>

      {skippedHolidays.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-amber-900 text-base">
          <strong>วันหยุดราชการในสัปดาห์นี้ (ไม่แสดงในตารางวันทำการ):</strong>{" "}
          {skippedHolidays
            .map((h) => `${formatThaiShortDate(h.holiday_date)} (${h.name})`)
            .join(" • ")}
        </div>
      )}

      {/* Working Days List (Mon - Fri excluding Public Holidays) */}
      {workingDays.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-600 text-lg">
          สัปดาห์นี้เป็นวันหยุดราชการทั้งหมด
        </div>
      ) : (
        <div className="space-y-5">
          {workingDays.map((day) => {
            const dayAppointments = appointmentsByDate.get(day.date) || [];
            return (
              <section
                key={day.date}
                className={`rounded-2xl border overflow-hidden shadow-xs ${
                  day.isToday
                    ? "border-[#0f294a] ring-1 ring-[#0f294a]/20 bg-slate-50/70"
                    : "border-slate-200 bg-slate-50/60"
                }`}
              >
                {/* Day Header (Common Region) */}
                <div
                  className={`px-5 py-3.5 border-b flex flex-wrap items-center justify-between gap-3 ${
                    day.isToday
                      ? "bg-[#0f294a] text-white border-[#0f294a]"
                      : "bg-white text-slate-900 border-slate-200"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2.5">
                    <CalendarCheck className="w-5 h-5 shrink-0" />
                    <h2 className="text-lg font-bold">
                      {day.label}
                      {day.isToday && (
                        <span className="ml-2.5 text-sm font-semibold px-2.5 py-0.5 rounded-md bg-white text-[#0f294a]">
                          วันนี้
                        </span>
                      )}
                    </h2>
                    {dayAppointments.length > 0 && (
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                          day.isToday
                            ? "bg-white/20 text-white"
                            : "bg-[#0f294a]/10 text-[#0f294a]"
                        }`}
                      >
                        {dayAppointments.length} นัดหมาย
                      </span>
                    )}
                  </div>

                  {!isReadOnly && (
                    <button
                      type="button"
                      onClick={() => onAddAppointment(day.date)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-semibold inline-flex items-center gap-1 cursor-pointer transition ${
                        day.isToday
                          ? "bg-white/15 hover:bg-white/25 text-white"
                          : "bg-slate-100 border border-slate-300 hover:bg-slate-200 text-slate-800"
                      }`}
                    >
                      <Plus className="w-4 h-4" />
                      <span>เพิ่มนัดวันนี้</span>
                    </button>
                  )}
                </div>

                {dayAppointments.length === 0 ? (
                  <div className="px-5 py-6 bg-white text-slate-500 text-base">
                    ไม่มีนัดหมาย
                  </div>
                ) : (
                  <div className="p-3 sm:p-4 space-y-3">
                    {dayAppointments.map((appt, index) => {
                      const courtName =
                        appt.court?.name ||
                        appt.case?.court?.name ||
                        appt.location ||
                        "ไม่ระบุศาล/สถานที่";
                      const plaintiff =
                        appt.plaintiff_name || appt.case?.plaintiff_name || "";
                      const defendant =
                        appt.defendant_name || appt.case?.defendant_name || "";
                      const ourRole = appt.our_role || appt.case?.our_role || null;
                      const roleLabel = getOurRoleLabel(ourRole);

                      return (
                        <button
                          key={appt.id}
                          type="button"
                          onClick={() => onSelectAppointment(appt)}
                          className={`group w-full text-left rounded-xl bg-white border border-slate-200 hover:border-[#0f294a]/50 hover:shadow-md transition p-4 sm:p-5 cursor-pointer flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                            appt.status === "cancelled" ? "opacity-60" : ""
                          }`}
                        >
                          <div className="space-y-3 flex-1 min-w-0">
                            {/* 1. ศาล - ห้องพิจารณาคดี & 2. เลขคดี (Top Gestalt Priority) */}
                            <div className="flex flex-wrap items-center gap-2">
                              {dayAppointments.length > 1 && (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#0f294a]/10 text-[#0f294a] text-xs font-bold tabular-nums shrink-0">
                                  {index + 1}
                                </span>
                              )}

                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 border border-slate-300 text-slate-900 font-bold text-sm sm:text-base">
                                <Landmark className="w-4 h-4 text-[#0f294a] shrink-0" />
                                <span>{courtName}</span>
                              </span>

                              {appt.courtroom && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-100 border border-amber-300 text-amber-950 font-bold text-sm sm:text-base">
                                  <DoorOpen className="w-4 h-4 shrink-0" />
                                  <span>{appt.courtroom}</span>
                                </span>
                              )}

                              {appt.case && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#0f294a] text-white font-bold text-sm sm:text-base tabular-nums">
                                  <Scale className="w-4 h-4 shrink-0" />
                                  <span>เลขคดี {appt.case.formatted_case_number}</span>
                                </span>
                              )}

                              {roleLabel && (
                                <span
                                  className={`inline-flex items-center px-2.5 py-1 rounded-lg border text-sm font-bold ${getRoleBadgeClass(
                                    ourRole
                                  )}`}
                                >
                                  {roleLabel}
                                </span>
                              )}

                              {appt.sequence_note && (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-sm font-bold">
                                  {appt.sequence_note}
                                </span>
                              )}
                            </div>

                            {/* 3. โจทก์ - จำเลย */}
                            {(plaintiff || defendant) && (
                              <div className="px-3.5 py-2 rounded-lg bg-slate-50 border border-slate-200/80 text-sm sm:text-base text-slate-800 flex flex-wrap items-center gap-x-4 gap-y-1">
                                <span>
                                  <strong className="text-slate-600">โจทก์:</strong>{" "}
                                  <span className="font-semibold">{plaintiff || "-"}</span>
                                </span>
                                <span className="text-slate-300 hidden sm:inline">|</span>
                                <span>
                                  <strong className="text-slate-600">จำเลย:</strong>{" "}
                                  <span className="font-semibold">{defendant || "-"}</span>
                                </span>
                              </div>
                            )}

                            {/* 4. นัดเกี่ยวกับอะไร */}
                            <div className="flex flex-wrap items-center gap-2.5">
                              <span className="text-lg font-bold text-slate-900">
                                {appt.title}
                              </span>
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-md border text-xs sm:text-sm font-semibold ${getCategoryBadgeClass(
                                  appt.category
                                )}`}
                              >
                                {getCategoryLabel(appt.category)} : {appt.appointment_type}
                              </span>
                              {appt.status !== "scheduled" && (
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs sm:text-sm font-semibold border ${
                                    appt.status === "completed"
                                      ? "bg-green-50 text-green-800 border-green-200"
                                      : "bg-red-50 text-red-800 border-red-200"
                                  }`}
                                >
                                  {getStatusLabel(appt.status)}
                                </span>
                              )}
                            </div>

                            {/* 5. นัดวัน-เวลาไหน (24 ชม. ไม่มีเวลาสิ้นสุด) & ผู้รับผิดชอบ */}
                            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm sm:text-base text-slate-700">
                              <span className="inline-flex items-center gap-1.5 font-bold text-[#0f294a] tabular-nums">
                                <Clock className="w-4 h-4 text-slate-500" />
                                {formatThaiShortDate(appt.appointment_date)} •{" "}
                                {formatTime24(appt.start_time)}
                              </span>

                              {appt.responsible_user && (
                                <span className="inline-flex items-center gap-1.5 text-slate-600">
                                  <UserIcon className="w-4 h-4 text-slate-400" />
                                  {appt.responsible_user.full_name}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Visual "ดูรายละเอียด" Action Pill */}
                          <div className="shrink-0 flex items-center justify-end">
                            <span className="px-4 py-2.5 rounded-xl bg-slate-100 group-hover:bg-[#0f294a] text-[#0f294a] group-hover:text-white font-semibold text-sm inline-flex items-center gap-2 transition">
                              <Eye className="w-4 h-4" />
                              <span>ดูรายละเอียด</span>
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
