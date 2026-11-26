"use client";

import React, { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  Bell,
  Calendar,
  Eye,
  FileText,
  Home,
  LayoutDashboard,
  LogIn,
  LogOut,
  Plus,
  Scale,
  Settings,
  Wifi,
  WifiOff,
} from "lucide-react";
import { AppointmentModal } from "@/components/AppointmentModal";
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

const DashboardView = dynamic(
  () => import("@/components/DashboardView").then((m) => m.DashboardView),
  { loading: () => <div className="p-8 text-center text-slate-500">กำลังโหลดแดชบอร์ด...</div> }
);
const CalendarView = dynamic(
  () => import("@/components/CalendarView").then((m) => m.CalendarView),
  { loading: () => <div className="p-8 text-center text-slate-500">กำลังโหลดปฏิทิน...</div> }
);
const CasesView = dynamic(
  () => import("@/components/CasesView").then((m) => m.CasesView),
  { loading: () => <div className="p-8 text-center text-slate-500">กำลังโหลดข้อมูลคดี...</div> }
);
const NotificationsView = dynamic(
  () => import("@/components/NotificationsView").then((m) => m.NotificationsView),
  { loading: () => <div className="p-8 text-center text-slate-500">กำลังโหลดการแจ้งเตือน...</div> }
);
const SettingsView = dynamic(
  () => import("@/components/SettingsView").then((m) => m.SettingsView),
  { loading: () => <div className="p-8 text-center text-slate-500">กำลังโหลดตั้งค่า...</div> }
);
const LoginView = dynamic(
  () => import("@/components/LoginView").then((m) => m.LoginView),
  { ssr: false }
);

interface BootstrapData {
  currentUser: User | null;
  isReadOnly?: boolean;
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

type NavTab = "dashboard" | "home" | "calendar" | "cases" | "notifications" | "settings";
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
  const [activeTab, setActiveTab] = useState<NavTab>("home");
  const [connStatus, setConnStatus] = useState<ConnectionStatus>("Connecting");
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  // Appointment Modal State
  const [apptModalOpen, setApptModalOpen] = useState(false);
  const [editingAppt, setEditingAppt] = useState<AppointmentWithRelations | null>(null);
  const [defaultApptDate, setDefaultApptDate] = useState<string | undefined>(undefined);
  const [defaultApptCase, setDefaultApptCase] = useState<CaseWithRelations | null>(null);

  const loadBootstrap = useCallback(async (scope: "full" | "dynamic" = "full") => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setConnStatus("Offline");
      setLoading(false);
      return;
    }
    try {
      const url = scope === "dynamic" ? "/api/bootstrap?scope=dynamic" : "/api/bootstrap";
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        setConnStatus("Offline");
        return;
      }
      const json = (await res.json()) as Partial<BootstrapData>;
      if (scope === "dynamic") {
        setData((prev) =>
          prev
            ? {
                ...prev,
                currentUser: json.currentUser ?? prev.currentUser,
                isReadOnly: json.isReadOnly ?? prev.isReadOnly,
                cases: json.cases ?? prev.cases,
                appointments: json.appointments ?? prev.appointments,
                notifications: json.notifications ?? prev.notifications,
              }
            : (json as BootstrapData)
        );
      } else {
        setData(json as BootstrapData);
      }
      setConnStatus("Connected");
    } catch {
      setConnStatus("Offline");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBootstrap("full");

    const handleOnline = () => {
      setConnStatus("Connecting");
      loadBootstrap("dynamic");
    };
    const handleOffline = () => setConnStatus("Offline");
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        loadBootstrap("dynamic");
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    document.addEventListener("visibilitychange", handleVisibility);

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        loadBootstrap("dynamic");
      }
    }, 60000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      document.removeEventListener("visibilitychange", handleVisibility);
      clearInterval(interval);
    };
  }, [loadBootstrap]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    if (
      activeTab === "dashboard" ||
      activeTab === "cases" ||
      activeTab === "notifications" ||
      activeTab === "settings"
    ) {
      setActiveTab("home");
    }
    await loadBootstrap("full");
  }

  function handleSaveStatusChange(s: "saving" | "saved" | "failed") {
    if (s === "saving") setConnStatus("Saving");
    if (s === "saved") {
      setConnStatus("Saved");
      setTimeout(() => setConnStatus("Connected"), 2000);
    }
    if (s === "failed") setConnStatus("Save Failed");
  }

  const isReadOnly = !data?.currentUser || Boolean(data?.isReadOnly);

  function openNewAppointment(dateStr?: string, linkedCase?: CaseWithRelations | null) {
    if (isReadOnly) {
      setLoginModalOpen(true);
      return;
    }
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

  function handleAppointmentSaved(savedAppt?: AppointmentWithRelations) {
    if (!savedAppt) {
      loadBootstrap("dynamic");
      return;
    }
    setData((prev) => {
      if (!prev) return prev;
      const exists = prev.appointments.some((a) => a.id === savedAppt.id);
      const nextAppts = exists
        ? prev.appointments.map((a) => (a.id === savedAppt.id ? savedAppt : a))
        : [...prev.appointments, savedAppt];
      return { ...prev, appointments: nextAppts };
    });
  }

  function handleAppointmentDeleted(deletedId: string) {
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        appointments: prev.appointments.filter((a) => a.id !== deletedId),
      };
    });
  }

  function handleCaseSaved(savedCase?: CaseWithRelations) {
    if (!savedCase) {
      loadBootstrap("dynamic");
      return;
    }
    setData((prev) => {
      if (!prev) return prev;
      const exists = prev.cases.some((c) => c.id === savedCase.id);
      const nextCases = exists
        ? prev.cases.map((c) => (c.id === savedCase.id ? savedCase : c))
        : [savedCase, ...prev.cases];
      return { ...prev, cases: nextCases };
    });
  }

  function handleCaseDeleted(deletedId: string) {
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        cases: prev.cases.filter((c) => c.id !== deletedId),
      };
    });
  }

  if (loading || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-[#0f294a] text-xl font-semibold">
        กำลังโหลดระบบ Lawyer Calendar...
      </div>
    );
  }

  const unreadCount = data.notifications.filter((n) => !n.is_read).length;

  const navItems: { id: NavTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    ...(!isReadOnly
      ? [
          {
            id: "dashboard" as NavTab,
            label: "แดชบอร์ด",
            icon: <LayoutDashboard className="w-5 h-5" />,
          },
        ]
      : []),
    { id: "home", label: "หน้าหลัก", icon: <Home className="w-5 h-5" /> },
    { id: "calendar", label: "ปฏิทินนัดหมาย", icon: <Calendar className="w-5 h-5" /> },
    ...(!isReadOnly
      ? [
          {
            id: "cases" as NavTab,
            label: "ข้อมูลคดี",
            icon: <FileText className="w-5 h-5" />,
          },
          {
            id: "notifications" as NavTab,
            label: "การแจ้งเตือน",
            icon: <Bell className="w-5 h-5" />,
            badge: unreadCount,
          },
          { id: "settings" as NavTab, label: "ตั้งค่า", icon: <Settings className="w-5 h-5" /> },
        ]
      : []),
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
        <div className="w-full max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3 flex flex-wrap items-center justify-between gap-2.5 sm:gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#0f294a] text-white flex items-center justify-center shrink-0">
              <Scale className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-base sm:text-lg text-[#0f294a] leading-tight truncate">
                Lawyer Calendar
              </div>
              <div className="text-xs sm:text-sm text-slate-600 truncate">
                {data.currentUser ? data.currentUser.full_name : "ผู้เยี่ยมชม (โหมดดูอย่างเดียว)"}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {renderStatusBadge()}

            {isReadOnly ? (
              <>
                <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-slate-100 text-slate-700 border border-slate-300">
                  <Eye className="w-4 h-4 text-slate-500" />
                  <span>ดูอย่างเดียว (Read-Only)</span>
                </span>
                <button
                  type="button"
                  onClick={() => setLoginModalOpen(true)}
                  className="btn-legal px-3 sm:px-4 bg-[#0f294a] hover:bg-[#173b69] text-white text-sm sm:text-base inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>เข้าสู่ระบบ</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => openNewAppointment()}
                  className="btn-legal px-3 sm:px-4 bg-[#0f294a] hover:bg-[#173b69] text-white text-sm sm:text-base inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>เพิ่มนัดหมาย</span>
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="btn-legal px-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 inline-flex items-center gap-1.5 cursor-pointer"
                  title="ออกจากระบบ"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">ออกจากระบบ</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Main Navigation */}
        <nav className="w-full max-w-[1440px] mx-auto px-2 sm:px-6 lg:px-8 flex overflow-x-auto gap-1 border-t border-slate-100">
          {navItems.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`px-3 sm:px-4 py-2.5 sm:py-3.5 font-semibold text-sm sm:text-base inline-flex items-center gap-1.5 sm:gap-2 border-b-2 whitespace-nowrap cursor-pointer transition ${
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
      <main className="flex-1 w-full max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        {activeTab === "dashboard" && !isReadOnly && data.currentUser && (
          <DashboardView
            currentUser={data.currentUser}
            appointments={data.appointments}
            cases={data.cases}
            notifications={data.notifications}
            onNavigateTab={setActiveTab}
            onAddAppointment={() => openNewAppointment()}
            onSelectAppointment={openEditAppointment}
          />
        )}

        {activeTab === "home" && (
          <WeeklyHomeView
            appointments={data.appointments}
            holidays={data.public_holidays}
            isReadOnly={isReadOnly}
            onAddAppointment={(dateStr) => openNewAppointment(dateStr)}
            onSelectAppointment={openEditAppointment}
          />
        )}

        {activeTab === "calendar" && (
          <CalendarView
            appointments={data.appointments}
            users={data.users}
            courts={data.courts}
            isReadOnly={isReadOnly}
            onAddAppointment={(dateStr) => openNewAppointment(dateStr)}
            onSelectAppointment={openEditAppointment}
          />
        )}

        {activeTab === "cases" && !isReadOnly && data.currentUser && (
          <CasesView
            cases={data.cases}
            appointments={data.appointments}
            courts={data.courts}
            caseCategories={data.case_categories}
            users={data.users}
            currentUser={data.currentUser}
            isReadOnly={isReadOnly}
            onRefresh={() => loadBootstrap("dynamic")}
            onCaseSaved={handleCaseSaved}
            onCaseDeleted={handleCaseDeleted}
            onAddAppointmentForCase={(c) => openNewAppointment(undefined, c)}
            onSelectAppointment={openEditAppointment}
            onSaveStatusChange={handleSaveStatusChange}
          />
        )}

        {activeTab === "notifications" && !isReadOnly && (
          <NotificationsView
            notifications={data.notifications}
            onRefresh={() => loadBootstrap("dynamic")}
          />
        )}

        {activeTab === "settings" && !isReadOnly && data.currentUser && (
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
            onRefresh={() => loadBootstrap("full")}
          />
        )}
      </main>

      {apptModalOpen && (
        <AppointmentModal
          initialAppointment={editingAppt}
          defaultDate={defaultApptDate}
          defaultCase={defaultApptCase}
          currentUser={data.currentUser}
          isReadOnly={isReadOnly}
          users={data.users}
          courts={data.courts}
          cases={data.cases}
          appointmentTypes={data.appointment_types}
          onClose={() => setApptModalOpen(false)}
          onSaved={handleAppointmentSaved}
          onDeleted={handleAppointmentDeleted}
          onRequestLogin={() => {
            setApptModalOpen(false);
            setLoginModalOpen(true);
          }}
          onSaveStatusChange={handleSaveStatusChange}
        />
      )}

      {loginModalOpen && (
        <LoginView
          asModal
          onClose={() => setLoginModalOpen(false)}
          onSuccess={async () => {
            setLoginModalOpen(false);
            await loadBootstrap("full");
            setActiveTab("dashboard");
          }}
        />
      )}
    </div>
  );
}
