"use client";

import React, { useMemo, useState } from "react";
import { addDays, format, parseISO } from "date-fns";
import {
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Plus,
  Scale,
  User as UserIcon,
} from "lucide-react";
import {
  formatThaiShortDate,
  getBangkokToday,
  getCategoryLabel,
  getStatusLabel,
  getWorkWeekDays,
} from "@/lib/thai-date";
import type { AppointmentWithRelations, PublicHoliday } from "@/types/domain";

interface WeeklyHomeViewProps {
  appointments: AppointmentWithRelations[];
  holidays: PublicHoliday[];
  onAddAppointment: (defaultDate?: string) => void;
  onSelectAppointment: (appt: AppointmentWithRelations) => void;
}

export function WeeklyHomeView({
  appointments,
  holidays,
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

  return (
    <div className="space-y-6">
      {/* Header & Week Navigation */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
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

          <button
            type="button"
            onClick={() => onAddAppointment()}
            className="btn-legal px-5 bg-[#0f294a] hover:bg-[#173b69] text-white inline-flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            <span>เพิ่มนัดหมาย</span>
          </button>
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
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-600 text-lg">
          สัปดาห์นี้เป็นวันหยุดราชการทั้งหมด
        </div>
      ) : (
        <div className="space-y-4">
          {workingDays.map((day) => {
            const dayAppointments = appointmentsByDate.get(day.date) || [];
            return (
              <section
                key={day.date}
                className={`bg-white rounded-xl border overflow-hidden ${
                  day.isToday ? "border-[#0f294a] ring-1 ring-[#0f294a]/20" : "border-slate-200"
                }`}
              >
                <div
                  className={`px-5 py-3.5 border-b flex items-center justify-between gap-3 ${
                    day.isToday
                      ? "bg-[#0f294a] text-white border-[#0f294a]"
                      : "bg-slate-50 text-slate-900 border-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <CalendarCheck className="w-5 h-5 shrink-0" />
                    <h2 className="text-lg font-bold">
                      {day.label}
                      {day.isToday && (
                        <span className="ml-2.5 text-sm font-semibold px-2.5 py-0.5 rounded-md bg-white text-[#0f294a]">
                          วันนี้
                        </span>
                      )}
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={() => onAddAppointment(day.date)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold inline-flex items-center gap-1 cursor-pointer transition ${
                      day.isToday
                        ? "bg-white/15 hover:bg-white/25 text-white"
                        : "bg-white border border-slate-300 hover:bg-slate-100 text-slate-800"
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                    <span>เพิ่มนัดวันนี้</span>
                  </button>
                </div>

                {dayAppointments.length === 0 ? (
                  <div className="px-5 py-6 text-slate-500 text-base">
                    ไม่มีนัดหมาย
                  </div>
                ) : (
                  <div className="divide-y divide-slate-200">
                    {dayAppointments.map((appt) => (
                      <button
                        key={appt.id}
                        type="button"
                        onClick={() => onSelectAppointment(appt)}
                        className={`w-full text-left px-5 py-4 hover:bg-slate-50 transition flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer ${
                          appt.status === "cancelled" ? "opacity-60" : ""
                        }`}
                      >
                        <div className="space-y-1.5 flex-1">
                          <div className="flex flex-wrap items-center gap-2.5">
                            {/* 1. Start Time */}
                            <span className="inline-flex items-center gap-1.5 font-bold text-[#0f294a] text-lg min-w-[105px]">
                              <Clock className="w-4 h-4 text-slate-500" />
                              {appt.start_time ? `${appt.start_time} น.` : "ไม่ระบุเวลา"}
                            </span>

                            {/* 2. Appointment Category & Type */}
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-md border text-sm font-semibold ${getCategoryBadgeClass(
                                appt.category
                              )}`}
                            >
                              {getCategoryLabel(appt.category)} : {appt.appointment_type}
                            </span>

                            {appt.status !== "scheduled" && (
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-semibold border ${
                                  appt.status === "completed"
                                    ? "bg-green-50 text-green-800 border-green-200"
                                    : "bg-red-50 text-red-800 border-red-200"
                                }`}
                              >
                                {getStatusLabel(appt.status)}
                              </span>
                            )}
                          </div>

                          {/* 3. Title */}
                          <div className="text-lg font-bold text-slate-900">
                            {appt.title}
                          </div>

                          {/* 4. Black Case Number, 5. Court/Location, 6. Plaintiff & Defendant */}
                          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-base text-slate-700">
                            {appt.case && (
                              <span className="inline-flex items-center gap-1.5 font-semibold text-[#0f294a]">
                                <Scale className="w-4 h-4" />
                                เลขคดีดำ: {appt.case.formatted_case_number}
                              </span>
                            )}

                            {(appt.location || appt.court?.name) && (
                              <span className="inline-flex items-center gap-1.5">
                                <MapPin className="w-4 h-4 text-slate-500" />
                                {appt.location || appt.court?.name}
                              </span>
                            )}

                            {appt.responsible_user && (
                              <span className="inline-flex items-center gap-1.5 text-slate-600">
                                <UserIcon className="w-4 h-4 text-slate-400" />
                                {appt.responsible_user.full_name}
                              </span>
                            )}
                          </div>

                          {appt.case && (
                            <div className="text-sm sm:text-base text-slate-600">
                              <span className="font-semibold">โจทก์:</span>{" "}
                              {appt.case.plaintiff_name}{" "}
                              <span className="mx-1.5 text-slate-400">|</span>
                              <span className="font-semibold">จำเลย:</span>{" "}
                              {appt.case.defendant_name}
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
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
