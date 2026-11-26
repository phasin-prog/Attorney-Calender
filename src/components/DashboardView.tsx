"use client";

import React, { useMemo } from "react";
import { addDays, format, parseISO } from "date-fns";
import {
  Bell,
  Briefcase,
  Calendar,
  CalendarCheck,
  Clock,
  DoorOpen,
  Eye,
  FileText,
  Landmark,
  LayoutDashboard,
  MessageSquare,
  Plus,
  Scale,
  TrendingUp,
} from "lucide-react";
import {
  formatThaiDateTime,
  formatThaiShortDate,
  formatTime24,
  getBangkokToday,
  getCourtLevelLabel,
  getOurRoleLabel,
} from "@/lib/thai-date";
import type {
  AppointmentWithRelations,
  CaseWithRelations,
  Notification,
  User,
} from "@/types/domain";

interface DashboardViewProps {
  currentUser: User;
  appointments: AppointmentWithRelations[];
  cases: CaseWithRelations[];
  notifications: Notification[];
  onNavigateTab: (tab: "home" | "calendar" | "cases" | "notifications" | "settings") => void;
  onAddAppointment: () => void;
  onSelectAppointment: (appt: AppointmentWithRelations) => void;
}

export function DashboardView({
  currentUser,
  appointments,
  cases,
  notifications,
  onNavigateTab,
  onAddAppointment,
  onSelectAppointment,
}: DashboardViewProps) {
  const todayStr = getBangkokToday();
  const next7DaysStr = useMemo(
    () => format(addDays(parseISO(todayStr), 7), "yyyy-MM-dd"),
    [todayStr]
  );

  const stats = useMemo(() => {
    const activeAppts = appointments.filter(
      (a) => !a.deleted_at && a.status !== "cancelled"
    );
    const todayAppts = activeAppts.filter((a) => a.appointment_date === todayStr);
    const weekAppts = activeAppts.filter(
      (a) => a.appointment_date >= todayStr && a.appointment_date <= next7DaysStr
    );

    const courtAppts = activeAppts.filter((a) => a.category === "court").length;
    const officeAppts = activeAppts.filter((a) => a.category === "office").length;
    const personalAppts = activeAppts.filter((a) => a.category === "personal").length;

    const activeCases = cases.filter((c) => !c.deleted_at);
    const firstInstanceCount = activeCases.filter(
      (c) => (c.court_level || "first_instance") === "first_instance"
    ).length;
    const appealCount = activeCases.filter((c) => c.court_level === "appeal").length;
    const supremeCount = activeCases.filter((c) => c.court_level === "supreme").length;

    const ongoingCases = activeCases.filter((c) => c.status === "active").length;
    const pendingCases = activeCases.filter((c) => c.status === "pending").length;
    const closedCases = activeCases.filter((c) => c.status === "closed").length;

    const unreadNotifs = notifications.filter((n) => !n.is_read).length;

    return {
      totalActiveAppts: activeAppts.length,
      todayCount: todayAppts.length,
      weekCount: weekAppts.length,
      courtAppts,
      officeAppts,
      personalAppts,
      totalCases: activeCases.length,
      firstInstanceCount,
      appealCount,
      supremeCount,
      ongoingCases,
      pendingCases,
      closedCases,
      unreadNotifs,
    };
  }, [appointments, cases, notifications, todayStr, next7DaysStr]);

  const upcomingAppointments = useMemo(() => {
    return appointments
      .filter(
        (a) =>
          !a.deleted_at &&
          a.status === "scheduled" &&
          a.appointment_date >= todayStr
      )
      .sort((a, b) => {
        const d = a.appointment_date.localeCompare(b.appointment_date);
        if (d !== 0) return d;
        return (a.start_time || "99:99").localeCompare(b.start_time || "99:99");
      })
      .slice(0, 5);
  }, [appointments, todayStr]);

  const recentCaseNotes = useMemo(() => {
    const items: {
      id: string;
      caseNumber: string;
      courtName: string;
      content: string;
      author: string;
      createdAt: string;
    }[] = [];

    for (const c of cases) {
      if (c.deleted_at) continue;
      if (c.case_notes && c.case_notes.length > 0) {
        for (const n of c.case_notes) {
          items.push({
            id: n.id,
            caseNumber: c.formatted_case_number,
            courtName: c.court?.name || "-",
            content: n.content,
            author: n.created_by_name,
            createdAt: n.created_at,
          });
        }
      }
    }
    return items
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 4);
  }, [cases]);

  const maxLevelCount = Math.max(
    stats.firstInstanceCount,
    stats.appealCount,
    stats.supremeCount,
    1
  );

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <section className="rounded-2xl bg-gradient-to-r from-[#0f294a] via-[#153661] to-[#1e4980] text-white p-5 sm:p-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2.5">
            <LayoutDashboard className="w-6 h-6 text-sky-200 shrink-0" />
            <span>สวัสดี, {currentUser.full_name}</span>
          </h1>
          <p className="text-sky-100/90 text-sm sm:text-base tabular-nums">
            วันนี้ {formatThaiShortDate(todayStr)} • มีนัดหมายวันนี้{" "}
            <strong className="text-white">{stats.todayCount} นัด</strong> และใน 7 วันข้างหน้า{" "}
            <strong className="text-white">{stats.weekCount} นัด</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onAddAppointment}
            className="btn-legal px-4 bg-white text-[#0f294a] hover:bg-sky-50 font-bold inline-flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>เพิ่มนัดหมาย</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab("cases")}
            className="btn-legal px-4 bg-white/15 hover:bg-white/25 text-white border border-white/25 inline-flex items-center gap-2 cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>จัดการข้อมูลคดี</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab("calendar")}
            className="btn-legal px-4 bg-white/15 hover:bg-white/25 text-white border border-white/25 inline-flex items-center gap-2 cursor-pointer"
          >
            <Calendar className="w-4 h-4" />
            <span>ปฏิทินกลาง</span>
          </button>
        </div>
      </section>

      {/* 4 KPI Summary Cards (Gestalt Proximity & Similarity) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => onNavigateTab("home")}
          className="text-left bg-white rounded-2xl border border-slate-200 hover:border-[#0f294a]/50 hover:shadow-md transition p-5 shadow-xs cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-600">นัดหมายใน 7 วัน</span>
            <div className="w-10 h-10 rounded-xl bg-[#0f294a]/10 text-[#0f294a] flex items-center justify-center">
              <CalendarCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-bold text-[#0f294a]">{stats.weekCount}</div>
          <div className="mt-1 text-xs font-semibold text-slate-500">
            วันนี้ {stats.todayCount} นัด • ทั้งหมด {stats.totalActiveAppts} นัด
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab("cases")}
          className="text-left bg-white rounded-2xl border border-slate-200 hover:border-[#0f294a]/50 hover:shadow-md transition p-5 shadow-xs cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-600">คดีกำลังดำเนินการ</span>
            <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-900 flex items-center justify-center">
              <Briefcase className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-bold text-slate-900">{stats.ongoingCases}</div>
          <div className="mt-1 text-xs font-semibold text-slate-500">
            จากคดีทั้งหมด {stats.totalCases} คดี
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab("cases")}
          className="text-left bg-white rounded-2xl border border-slate-200 hover:border-[#0f294a]/50 hover:shadow-md transition p-5 shadow-xs cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-600">รอพิจารณา / เสร็จสิ้น</span>
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center">
              <Scale className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-bold text-slate-900">{stats.pendingCases}</div>
          <div className="mt-1 text-xs font-semibold text-slate-500">
            เสร็จสิ้นแล้ว {stats.closedCases} คดี
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab("notifications")}
          className="text-left bg-white rounded-2xl border border-slate-200 hover:border-[#0f294a]/50 hover:shadow-md transition p-5 shadow-xs cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-600">การแจ้งเตือนใหม่</span>
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-bold text-slate-900">{stats.unreadNotifs}</div>
          <div className="mt-1 text-xs font-semibold text-slate-500">
            คลิกเพื่อดูรายการแจ้งเตือน
          </div>
        </button>
      </section>

      {/* Main Grid: Upcoming Appointments (Left) + Case Breakdown & Recent Notes (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Upcoming Appointments */}
        <section className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#0f294a]" />
              <h2 className="text-lg font-bold text-[#0f294a]">
                นัดหมายที่กำลังจะมาถึง
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab("home")}
              className="text-sm font-semibold text-[#0f294a] hover:underline cursor-pointer"
            >
              ดูทั้งหมด →
            </button>
          </div>

          {upcomingAppointments.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              ไม่มีนัดหมายที่กำลังจะมาถึง
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {upcomingAppointments.map((appt) => {
                const courtName =
                  appt.court?.name ||
                  appt.case?.court?.name ||
                  appt.location ||
                  "ไม่ระบุศาล/สถานที่";
                const plaintiff =
                  appt.plaintiff_name || appt.case?.plaintiff_name || "";
                const defendant =
                  appt.defendant_name || appt.case?.defendant_name || "";
                const roleLabel = getOurRoleLabel(appt.our_role || appt.case?.our_role);

                return (
                  <button
                    key={appt.id}
                    type="button"
                    onClick={() => onSelectAppointment(appt)}
                    className="group w-full text-left p-4 hover:bg-slate-50 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1.5 min-w-0 flex-1">
                      {/* 1. ศาล - ห้องพิจารณาคดี & 2. เลขคดี */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-100 border border-slate-300 text-slate-900 text-xs sm:text-sm font-bold">
                          <Landmark className="w-3.5 h-3.5 text-[#0f294a]" />
                          {courtName}
                        </span>
                        {appt.courtroom && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-amber-100 border border-amber-300 text-amber-950 text-xs sm:text-sm font-bold">
                            <DoorOpen className="w-3.5 h-3.5" />
                            {appt.courtroom}
                          </span>
                        )}
                        {appt.case && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-[#0f294a] text-white text-xs sm:text-sm font-bold">
                            <Scale className="w-3.5 h-3.5" />
                            {appt.case.formatted_case_number}
                          </span>
                        )}
                        {roleLabel && (
                          <span className="px-2 py-0.5 rounded-md bg-sky-100 border border-sky-300 text-sky-900 text-xs font-bold">
                            {roleLabel}
                          </span>
                        )}
                      </div>

                      {/* 3. โจทก์ - จำเลย */}
                      {(plaintiff || defendant) && (
                        <div className="text-xs sm:text-sm text-slate-600 truncate">
                          <strong>โจทก์:</strong> {plaintiff || "-"} |{" "}
                          <strong>จำเลย:</strong> {defendant || "-"}
                        </div>
                      )}

                      {/* 4. นัดเกี่ยวกับอะไร & 5. วัน-เวลา */}
                      <div className="font-bold text-slate-900 text-base">
                        {appt.title}
                      </div>
                      <div className="text-sm font-semibold text-[#0f294a] tabular-nums">
                        {formatThaiShortDate(appt.appointment_date)} •{" "}
                        {formatTime24(appt.start_time)}
                      </div>
                    </div>

                    <span className="shrink-0 px-3.5 py-2 rounded-lg bg-slate-100 group-hover:bg-[#0f294a] text-[#0f294a] group-hover:text-white text-xs font-bold inline-flex items-center gap-1.5 transition">
                      <Eye className="w-3.5 h-3.5" />
                      <span>ดูรายละเอียด</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Right: Court Level Breakdown + Recent Case Notes */}
        <div className="lg:col-span-5 space-y-6">
          {/* Case Breakdown by Court Level */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#0f294a]" />
                <h2 className="text-lg font-bold text-[#0f294a]">สรุปคดีตามชั้นศาล</h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab("cases")}
                className="text-sm font-semibold text-[#0f294a] hover:underline cursor-pointer"
              >
                ไปหน้าคดี →
              </button>
            </div>

            <div className="space-y-3">
              {[
                {
                  label: getCourtLevelLabel("first_instance"),
                  count: stats.firstInstanceCount,
                  color: "bg-[#0f294a]",
                },
                {
                  label: getCourtLevelLabel("appeal"),
                  count: stats.appealCount,
                  color: "bg-amber-500",
                },
                {
                  label: getCourtLevelLabel("supreme"),
                  count: stats.supremeCount,
                  color: "bg-purple-600",
                },
              ].map((row) => (
                <div key={row.label} className="space-y-1">
                  <div className="flex items-center justify-between text-sm font-semibold">
                    <span className="text-slate-700">{row.label}</span>
                    <span className="text-slate-900">{row.count} คดี</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${row.color} transition-all`}
                      style={{ width: `${(row.count / maxLevelCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-lg bg-blue-50">
                <div className="text-lg font-bold text-blue-900">{stats.courtAppts}</div>
                <div className="text-xs font-semibold text-blue-800">นัดทางศาล</div>
              </div>
              <div className="p-2 rounded-lg bg-emerald-50">
                <div className="text-lg font-bold text-emerald-900">{stats.officeAppts}</div>
                <div className="text-xs font-semibold text-emerald-800">สำนักงาน</div>
              </div>
              <div className="p-2 rounded-lg bg-amber-50">
                <div className="text-lg font-bold text-amber-900">{stats.personalAppts}</div>
                <div className="text-xs font-semibold text-amber-800">ส่วนตัว</div>
              </div>
            </div>
          </section>

          {/* Recent Case Notes */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-[#0f294a]" />
              <h2 className="text-lg font-bold text-[#0f294a]">หมายเหตุคดีล่าสุด</h2>
            </div>

            {recentCaseNotes.length === 0 ? (
              <p className="text-sm text-slate-500">ยังไม่มีบันทึกหมายเหตุคดี</p>
            ) : (
              <div className="space-y-2.5">
                {recentCaseNotes.map((n) => (
                  <div
                    key={n.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs font-bold text-[#0f294a]">
                      <span>{n.caseNumber}</span>
                      <span className="text-slate-500 font-normal">{n.courtName}</span>
                    </div>
                    <div className="text-sm text-slate-800 line-clamp-2">{n.content}</div>
                    <div className="text-xs text-slate-500">
                      {n.author} • {formatThaiDateTime(n.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
