"use client";

import React, { useState } from "react";
import { RotateCcw } from "lucide-react";
import { formatThaiDateTime, formatThaiShortDate } from "@/lib/thai-date";
import type {
  AppointmentCategory,
  AppointmentTypeItem,
  AppointmentWithRelations,
  AuditLog,
  CaseCategory,
  CaseWithRelations,
  Court,
  PublicHoliday,
  User,
} from "@/types/domain";

interface SettingsViewProps {
  currentUser: User;
  users: User[];
  courts: Court[];
  caseCategories: CaseCategory[];
  appointmentTypes: AppointmentTypeItem[];
  holidays: PublicHoliday[];
  deletedAppointments: AppointmentWithRelations[];
  deletedCases: CaseWithRelations[];
  auditLogs: AuditLog[];
  onRefresh: () => Promise<void>;
}

type SettingsTab =
  | "holidays"
  | "courts"
  | "categories"
  | "types"
  | "users"
  | "restore"
  | "audit";

export function SettingsView({
  currentUser,
  users,
  courts,
  caseCategories,
  appointmentTypes,
  holidays,
  deletedAppointments,
  deletedCases,
  auditLogs,
  onRefresh,
}: SettingsViewProps) {
  const [tab, setTab] = useState<SettingsTab>("holidays");
  const [error, setError] = useState<string | null>(null);

  // Holiday form
  const [holidayDate, setHolidayDate] = useState("");
  const [holidayName, setHolidayName] = useState("");
  const [holidayType, setHolidayType] = useState("national");

  // Court form
  const [courtName, setCourtName] = useState("");
  const [courtProvince, setCourtProvince] = useState("");

  // Case category form
  const [catAbbr, setCatAbbr] = useState("");
  const [catDesc, setCatDesc] = useState("");

  // Appointment type form
  const [apptCat, setApptCat] = useState<AppointmentCategory>("court");
  const [apptTypeName, setApptTypeName] = useState("");

  // User form
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState<"admin" | "staff">("staff");
  const [userPassword, setUserPassword] = useState("123456");

  const isAdmin = currentUser.role === "admin";

  async function postSetting(
    entity: "court" | "case_category" | "appointment_type" | "public_holiday" | "user",
    payload: Record<string, unknown>,
    id?: string
  ) {
    setError(null);
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity, id, payload }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "บันทึกการตั้งค่าไม่สำเร็จ");
      return false;
    }
    await onRefresh();
    return true;
  }

  async function restoreItem(kind: "appointment" | "case", id: string) {
    setError(null);
    const url =
      kind === "appointment" ? `/api/appointments/${id}` : `/api/cases/${id}`;
    const res = await fetch(url, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "กู้คืนข้อมูลไม่สำเร็จ");
      return;
    }
    await onRefresh();
  }

  const tabs: { id: SettingsTab; label: string }[] = [
    { id: "holidays", label: "วันหยุดราชการ" },
    { id: "courts", label: "ข้อมูลศาล" },
    { id: "categories", label: "อักษรย่อคดี" },
    { id: "types", label: "ประเภทนัดหมาย" },
    { id: "users", label: "ผู้ใช้งาน (5 บัญชี)" },
    { id: "restore", label: "กู้คืนข้อมูลที่ลบ" },
    { id: "audit", label: "ประวัติ Audit Log" },
  ];

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h1 className="text-2xl font-bold text-[#0f294a]">ตั้งค่าระบบและข้อมูลพื้นฐาน</h1>
        <p className="text-slate-600 text-base mt-1">
          จัดการวันหยุดราชการ ศาล อักษรย่อประเภทคดี ผู้ใช้งาน และตรวจสอบประวัติการแก้ไข
        </p>

        <div className="flex flex-wrap gap-2 mt-4">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setError(null);
                setTab(t.id);
              }}
              className={`px-4 py-2.5 rounded-xl font-semibold text-sm sm:text-base cursor-pointer transition ${
                tab === t.id
                  ? "bg-[#0f294a] text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800">
          {error}
        </div>
      )}

      {/* 1. Public Holidays */}
      {tab === "holidays" && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-5">
          <h2 className="text-xl font-bold text-[#0f294a]">
            จัดการวันหยุดราชการไทย (ไม่แสดงในตารางสัปดาห์หน้าแรก)
          </h2>

          {isAdmin ? (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const ok = await postSetting("public_holiday", {
                  holiday_date: holidayDate,
                  name: holidayName,
                  holiday_type: holidayType,
                  is_active: true,
                });
                if (ok) {
                  setHolidayDate("");
                  setHolidayName("");
                }
              }}
              className="grid grid-cols-1 sm:grid-cols-4 gap-3"
            >
              <input
                type="date"
                required
                value={holidayDate}
                onChange={(e) => setHolidayDate(e.target.value)}
                className="input-legal px-3 border border-slate-300"
              />
              <input
                type="text"
                required
                value={holidayName}
                onChange={(e) => setHolidayName(e.target.value)}
                placeholder="ชื่อวันหยุดราชการ"
                className="input-legal px-3 border border-slate-300 sm:col-span-2"
              />
              <button
                type="submit"
                className="btn-legal bg-[#0f294a] text-white cursor-pointer"
              >
                เพิ่มวันหยุด
              </button>
            </form>
          ) : (
            <p className="text-sm text-amber-800 bg-amber-50 p-3 rounded-lg border border-amber-200">
              เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่สามารถเพิ่มหรือแก้ไขวันหยุดราชการได้
            </p>
          )}

          <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl">
            {holidays.map((h) => (
              <div
                key={h.id}
                className="p-4 flex items-center justify-between gap-3"
              >
                <div>
                  <div className="font-bold text-slate-900">
                    {formatThaiShortDate(h.holiday_date)} — {h.name}
                  </div>
                  <div className="text-sm text-slate-600">
                    สถานะ: {h.is_active ? "ใช้งาน (ซ่อนจากวันทำการ)" : "ยกเลิกแล้ว"}
                  </div>
                </div>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() =>
                      postSetting(
                        "public_holiday",
                        {
                          holiday_date: h.holiday_date,
                          name: h.name,
                          holiday_type: h.holiday_type,
                          is_active: !h.is_active,
                        },
                        h.id
                      )
                    }
                    className="px-3.5 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-sm font-semibold cursor-pointer"
                  >
                    {h.is_active ? "ยกเลิกวันหยุด" : "เปิดใช้งาน"}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Courts */}
      {tab === "courts" && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-5">
          <h2 className="text-xl font-bold text-[#0f294a]">จัดการรายชื่อศาล</h2>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const ok = await postSetting("court", {
                name: courtName,
                province: courtProvince,
                is_active: true,
              });
              if (ok) {
                setCourtName("");
                setCourtProvince("");
              }
            }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-3"
          >
            <input
              type="text"
              required
              value={courtName}
              onChange={(e) => setCourtName(e.target.value)}
              placeholder="ชื่อศาล เช่น ศาลจังหวัดปทุมธานี"
              className="input-legal px-3 border border-slate-300"
            />
            <input
              type="text"
              value={courtProvince}
              onChange={(e) => setCourtProvince(e.target.value)}
              placeholder="จังหวัด"
              className="input-legal px-3 border border-slate-300"
            />
            <button
              type="submit"
              className="btn-legal bg-[#0f294a] text-white cursor-pointer"
            >
              เพิ่มศาลใหม่
            </button>
          </form>

          <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl">
            {courts.map((c) => (
              <div key={c.id} className="p-4 flex items-center justify-between gap-3">
                <div>
                  <div className="font-bold">{c.name}</div>
                  <div className="text-sm text-slate-600">{c.province || "-"}</div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    postSetting(
                      "court",
                      { name: c.name, province: c.province, is_active: !c.is_active },
                      c.id
                    )
                  }
                  className="px-3.5 py-2 rounded-lg border border-slate-300 text-sm font-semibold cursor-pointer"
                >
                  {c.is_active ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Case Categories */}
      {tab === "categories" && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-5">
          <h2 className="text-xl font-bold text-[#0f294a]">อักษรย่อประเภทคดี</h2>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const ok = await postSetting("case_category", {
                abbreviation: catAbbr,
                description: catDesc,
                is_active: true,
              });
              if (ok) {
                setCatAbbr("");
                setCatDesc("");
              }
            }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-3"
          >
            <input
              type="text"
              required
              value={catAbbr}
              onChange={(e) => setCatAbbr(e.target.value)}
              placeholder="อักษรย่อ เช่น ยช."
              className="input-legal px-3 border border-slate-300"
            />
            <input
              type="text"
              value={catDesc}
              onChange={(e) => setCatDesc(e.target.value)}
              placeholder="คำอธิบาย"
              className="input-legal px-3 border border-slate-300"
            />
            <button
              type="submit"
              className="btn-legal bg-[#0f294a] text-white cursor-pointer"
            >
              เพิ่มอักษรย่อ
            </button>
          </form>

          <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl">
            {caseCategories.map((cat) => (
              <div key={cat.id} className="p-4 flex items-center justify-between">
                <div>
                  <span className="font-bold text-lg text-[#0f294a] mr-2">
                    {cat.abbreviation}
                  </span>
                  <span className="text-slate-700">{cat.description}</span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    postSetting(
                      "case_category",
                      {
                        abbreviation: cat.abbreviation,
                        description: cat.description,
                        is_active: !cat.is_active,
                      },
                      cat.id
                    )
                  }
                  className="px-3.5 py-2 rounded-lg border border-slate-300 text-sm font-semibold cursor-pointer"
                >
                  {cat.is_active ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Appointment Types */}
      {tab === "types" && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-5">
          <h2 className="text-xl font-bold text-[#0f294a]">ประเภทนัดหมาย</h2>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const ok = await postSetting("appointment_type", {
                category: apptCat,
                name: apptTypeName,
                is_active: true,
              });
              if (ok) setApptTypeName("");
            }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-3"
          >
            <select
              value={apptCat}
              onChange={(e) => setApptCat(e.target.value as AppointmentCategory)}
              className="input-legal px-3 border border-slate-300 bg-white"
            >
              <option value="court">นัดหมายทางศาล</option>
              <option value="office">นัดหมายสำนักงาน</option>
              <option value="personal">นัดหมายส่วนตัว</option>
            </select>
            <input
              type="text"
              required
              value={apptTypeName}
              onChange={(e) => setApptTypeName(e.target.value)}
              placeholder="ชื่อประเภทนัดหมาย"
              className="input-legal px-3 border border-slate-300"
            />
            <button
              type="submit"
              className="btn-legal bg-[#0f294a] text-white cursor-pointer"
            >
              เพิ่มประเภทนัดหมาย
            </button>
          </form>

          <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl">
            {appointmentTypes.map((t) => (
              <div key={t.id} className="p-3.5 flex items-center justify-between">
                <div>
                  <span className="font-bold mr-2">{t.name}</span>
                  <span className="text-sm text-slate-500">({t.category})</span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    postSetting(
                      "appointment_type",
                      { category: t.category, name: t.name, is_active: !t.is_active },
                      t.id
                    )
                  }
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm cursor-pointer"
                >
                  {t.is_active ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Users (5 Accounts) */}
      {tab === "users" && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-5">
          <h2 className="text-xl font-bold text-[#0f294a]">
            จัดการผู้ใช้งาน (รองรับสูงสุด 5 บัญชี)
          </h2>

          {isAdmin && users.length < 5 && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const ok = await postSetting("user", {
                  full_name: userName,
                  email: userEmail,
                  role: userRole,
                  password: userPassword,
                  is_active: true,
                });
                if (ok) {
                  setUserName("");
                  setUserEmail("");
                }
              }}
              className="grid grid-cols-1 sm:grid-cols-4 gap-3"
            >
              <input
                type="text"
                required
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="ชื่อ-นามสกุล"
                className="input-legal px-3 border border-slate-300"
              />
              <input
                type="email"
                required
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="อีเมล"
                className="input-legal px-3 border border-slate-300"
              />
              <select
                value={userRole}
                onChange={(e) => setUserRole(e.target.value as "admin" | "staff")}
                className="input-legal px-3 border border-slate-300 bg-white"
              >
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
              <button
                type="submit"
                className="btn-legal bg-[#0f294a] text-white cursor-pointer"
              >
                เพิ่มบัญชี
              </button>
            </form>
          )}

          <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl">
            {users.map((u) => (
              <div key={u.id} className="p-4 flex items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-slate-900">{u.full_name}</div>
                  <div className="text-sm text-slate-600">
                    {u.email} • บทบาท: {u.role === "admin" ? "ผู้ดูแลระบบ" : "ผู้ใช้งานสำนักงาน"}
                  </div>
                </div>
                {isAdmin && u.id !== currentUser.id && (
                  <button
                    type="button"
                    onClick={() =>
                      postSetting(
                        "user",
                        {
                          full_name: u.full_name,
                          email: u.email,
                          role: u.role,
                          is_active: !u.is_active,
                        },
                        u.id
                      )
                    }
                    className="px-3.5 py-2 rounded-lg border border-slate-300 text-sm font-semibold cursor-pointer"
                  >
                    {u.is_active ? "ระงับบัญชี" : "เปิดใช้งาน"}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. Soft Delete Restore */}
      {tab === "restore" && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-5">
          <h2 className="text-xl font-bold text-[#0f294a]">กู้คืนข้อมูลที่ถูกลบ (Soft Delete)</h2>

          <div className="space-y-3">
            <h3 className="font-bold text-slate-800">
              นัดหมายที่ถูกลบ ({deletedAppointments.length})
            </h3>
            {deletedAppointments.length === 0 ? (
              <p className="text-slate-500">ไม่มีนัดหมายที่ถูกลบ</p>
            ) : (
              deletedAppointments.map((a) => (
                <div
                  key={a.id}
                  className="p-4 rounded-xl border border-slate-200 flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="font-bold">{a.title}</div>
                    <div className="text-sm text-slate-600">
                      วันที่ {formatThaiShortDate(a.appointment_date)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => restoreItem("appointment", a.id)}
                    className="btn-legal px-4 bg-[#0f294a] text-white inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>กู้คืน</span>
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="space-y-3 pt-4 border-t border-slate-200">
            <h3 className="font-bold text-slate-800">
              คดีที่ถูกลบ ({deletedCases.length})
            </h3>
            {deletedCases.length === 0 ? (
              <p className="text-slate-500">ไม่มีคดีที่ถูกลบ</p>
            ) : (
              deletedCases.map((c) => (
                <div
                  key={c.id}
                  className="p-4 rounded-xl border border-slate-200 flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="font-bold">{c.formatted_case_number}</div>
                    <div className="text-sm text-slate-600">
                      {c.plaintiff_name} / {c.defendant_name}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => restoreItem("case", c.id)}
                    className="btn-legal px-4 bg-[#0f294a] text-white inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>กู้คืน</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 7. Read-only Audit Logs */}
      {tab === "audit" && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h2 className="text-xl font-bold text-[#0f294a]">
            ประวัติการเปลี่ยนแปลงข้อมูล (Audit Log — อ่านอย่างเดียว)
          </h2>
          <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl max-h-[560px] overflow-y-auto">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-3.5 text-sm sm:text-base">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold text-[#0f294a]">
                    [{log.action}] {log.entity_type}
                  </span>
                  <span className="text-slate-500 text-sm">
                    {formatThaiDateTime(log.created_at)}
                  </span>
                </div>
                <div className="text-slate-700">
                  ผู้ดำเนินการ: {log.user_name || log.user_id}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
