"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Bell,
  Calendar,
  FileText,
  Home,
  LogOut,
  Plus,
  Scale,
  Settings,
  Wifi,
  WifiOff,
} from "lucide-react";
import { AppointmentModal } from "@/components/AppointmentModal";
import { CalendarView } from "@/components/CalendarView";
import { CasesView } from "@/components/CasesView";
import { LoginView } from "@/components/LoginView";
import { NotificationsView } from "@/components/NotificationsView";
import { SettingsView } from "@/components/SettingsView";
import { WeeklyHomeView } from "@/components/WeeklyHomeView";
import type {
  AppointmentTypeItem,
  AppointmentWithRelations,
  AuditLog,
  CaseCategory,
  CaseWithRelations,
  Court,
  Notification,
  PublicHoliday,
  User,
} from "@/types/domain";

interface BootstrapData {
  currentUser: User;
  users: User[];
  courts: Court[];
  case_categories: CaseCategory[];
  appointment_types: AppointmentTypeItem[];
  public_holidays: PublicHoliday[];
  cases: CaseWithRelations[];
  deletedCases: CaseWithRelations[];
  appointments: AppointmentWithRelations[];
  deletedAppointments: AppointmentWithRelations[];
  notifications: Notification[];
  audit_logs: AuditLog[];
}

type NavTab = "home" | "calendar" | "cases" | "notifications" | "settings";
type ConnectionStatus =
  | "Connected"
  | "Connecting"
  | "Offline"
  | "Saving"
  | "Saved"
  | "Save Failed";

export default function LawyerCalendarApp() {
  const [data, setData] = useState<BootstrapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [unauthenticated, setUnauthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<NavTab>("home");
  const [connStatus, setConnStatus] = useState<ConnectionStatus>("Connecting");

  // Appointment Modal State
  const [apptModalOpen, setApptModalOpen] = useState(false);
  const [editingAppt, setEditingAppt] = useState<AppointmentWithRelations | null>(null);
  const [defaultApptDate, setDefaultApptDate] = useState<string | undefined>(undefined);
  const [defaultApptCase, setDefaultApptCase] = useState<CaseWithRelations | null>(null);

  const loadBootstrap = useCallback(async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setConnStatus("Offline");
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/bootstrap", { cache: "no-store" });
      if (res.status === 401) {
        setUnauthenticated(true);
        setData(null);
        setConnStatus("Connected");
        return;
      }
      if (!res.ok) {
        setConnStatus("Offline");
        return;
      }
      const json = (await res.json()) as BootstrapData;
      setData(json);
      setUnauthenticated(false);
      setConnStatus("Connected");
    } catch {
      setConnStatus("Offline");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBootstrap();

    const handleOnline = () => {
      setConnStatus("Connecting");
      loadBootstrap();
    };
    const handleOffline = () => setConnStatus("Offline");
    const handleFocus = () => loadBootstrap();

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("focus", handleFocus);

    const interval = setInterval(loadBootstrap, 15000);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("focus", handleFocus);
      clearInterval(interval);
    };
  }, [loadBootstrap]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setData(null);
    setUnauthenticated(true);
  }

  function handleSaveStatusChange(s: "saving" | "saved" | "failed") {
    if (s === "saving") setConnStatus("Saving");
    if (s === "saved") {
      setConnStatus("Saved");
      setTimeout(() => setConnStatus("Connected"), 2500);
    }
    if (s === "failed") setConnStatus("Save Failed");
  }

  function openNewAppointment(dateStr?: string, linkedCase?: CaseWithRelations | null) {
    setEditingAppt(null);
    setDefaultApptDate(dateStr);
    setDefaultApptCase(linkedCase || null);
    setApptModalOpen(true);
  }

  function openEditAppointment(appt: AppointmentWithRelations) {
    setEditingAppt(appt);
    setDefaultApptDate(undefined);
    setDefaultApptCase(null);
    setApptModalOpen(true);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-[#0f294a] text-xl font-semibold">
        กำลังโหลดระบบ Lawyer Calendar...
      </div>
    );
  }

  if (unauthenticated || !data) {
    return <LoginView onSuccess={loadBootstrap} />;
  }

  const unreadCount = data.notifications.filter((n) => !n.is_read).length;

  const navItems: { id: NavTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: "home", label: "หน้าหลัก", icon: <Home className="w-5 h-5" /> },
    { id: "calendar", label: "ปฏิทินนัดหมาย", icon: <Calendar className="w-5 h-5" /> },
    { id: "cases", label: "ข้อมูลคดี", icon: <FileText className="w-5 h-5" /> },
    {
      id: "notifications",
      label: "การแจ้งเตือน",
      icon: <Bell className="w-5 h-5" />,
      badge: unreadCount,
    },
    { id: "settings", label: "ตั้งค่า", icon: <Settings className="w-5 h-5" /> },
  ];

  function renderStatusBadge() {
    const isError = connStatus === "Offline" || connStatus === "Save Failed";
    const isSuccess = connStatus === "Connected" || connStatus === "Saved";
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-semibold border ${
          isError
            ? "bg-red-50 text-red-800 border-red-200"
            : isSuccess
            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
            : "bg-amber-50 text-amber-800 border-amber-200"
        }`}
      >
        {connStatus === "Offline" ? (
          <WifiOff className="w-4 h-4" />
        ) : (
          <Wifi className="w-4 h-4" />
        )}
        <span>{connStatus}</span>
      </span>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      {/* Top Header */}
      <header className="no-print bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0f294a] text-white flex items-center justify-center">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-lg text-[#0f294a] leading-tight">
                Lawyer Calendar
              </div>
              <div className="text-xs sm:text-sm text-slate-600">
                {data.currentUser.full_name}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {renderStatusBadge()}

            <button
              type="button"
              onClick={() => openNewAppointment()}
              className="btn-legal px-4 bg-[#0f294a] hover:bg-[#173b69] text-white inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-5 h-5" />
              <span>เพิ่มนัดหมาย</span>
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="btn-legal px-3.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 inline-flex items-center gap-1.5 cursor-pointer"
              title="ออกจากระบบ"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">ออกจากระบบ</span>
            </button>
          </div>
        </div>

        {/* 5-Item Main Navigation */}
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 flex overflow-x-auto gap-1 border-t border-slate-100">
          {navItems.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`px-4 py-3.5 font-semibold text-base inline-flex items-center gap-2 border-b-2 whitespace-nowrap cursor-pointer transition ${
                  active
                    ? "border-[#0f294a] text-[#0f294a] bg-slate-50/70"
                    : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-xs font-bold">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {activeTab === "home" && (
          <WeeklyHomeView
            appointments={data.appointments}
            holidays={data.public_holidays}
            onAddAppointment={(dateStr) => openNewAppointment(dateStr)}
            onSelectAppointment={openEditAppointment}
          />
        )}

        {activeTab === "calendar" && (
          <CalendarView
            appointments={data.appointments}
            users={data.users}
            courts={data.courts}
            onAddAppointment={(dateStr) => openNewAppointment(dateStr)}
            onSelectAppointment={openEditAppointment}
          />
        )}

        {activeTab === "cases" && (
          <CasesView
            cases={data.cases}
            appointments={data.appointments}
            courts={data.courts}
            caseCategories={data.case_categories}
            users={data.users}
            currentUser={data.currentUser}
            onRefresh={loadBootstrap}
            onAddAppointmentForCase={(c) => openNewAppointment(undefined, c)}
            onSelectAppointment={openEditAppointment}
            onSaveStatusChange={handleSaveStatusChange}
          />
        )}

        {activeTab === "notifications" && (
          <NotificationsView
            notifications={data.notifications}
            onRefresh={loadBootstrap}
          />
        )}

        {activeTab === "settings" && (
          <SettingsView
            currentUser={data.currentUser}
            users={data.users}
            courts={data.courts}
            caseCategories={data.case_categories}
            appointmentTypes={data.appointment_types}
            holidays={data.public_holidays}
            deletedAppointments={data.deletedAppointments}
            deletedCases={data.deletedCases}
            auditLogs={data.audit_logs}
            onRefresh={loadBootstrap}
          />
        )}
      </main>

      {apptModalOpen && (
        <AppointmentModal
          initialAppointment={editingAppt}
          defaultDate={defaultApptDate}
          defaultCase={defaultApptCase}
          currentUser={data.currentUser}
          users={data.users}
          courts={data.courts}
          cases={data.cases}
          appointmentTypes={data.appointment_types}
          onClose={() => setApptModalOpen(false)}
          onSaved={loadBootstrap}
          onSaveStatusChange={handleSaveStatusChange}
        />
      )}
    </div>
  );
}
