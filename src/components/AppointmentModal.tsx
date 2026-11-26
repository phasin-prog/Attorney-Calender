"use client";

import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  Clock,
  DoorOpen,
  Edit3,
  FileText,
  Landmark,
  LogIn,
  Scale,
  Search,
  Trash2,
  User as UserIcon,
  Users,
  X,
} from "lucide-react";
import {
  formatThaiDate,
  formatTime24,
  getBangkokToday,
  getCategoryLabel,
  getOurRoleLabel,
  getStatusLabel,
} from "@/lib/thai-date";
import { SearchableSelect } from "@/components/SearchableSelect";
import { ThaiDateInput } from "@/components/ThaiDateInput";
import { Time24Input } from "@/components/Time24Input";
import type {
  AppointmentCategory,
  AppointmentStatus,
  AppointmentTypeItem,
  AppointmentVisibility,
  AppointmentWithRelations,
  CaseWithRelations,
  Court,
  OurRole,
  User,
} from "@/types/domain";

interface AppointmentModalProps {
  initialAppointment: AppointmentWithRelations | null;
  defaultDate?: string;
  defaultCase?: CaseWithRelations | null;
  currentUser: User | null;
  isReadOnly?: boolean;
  users: User[];
  courts: Court[];
  cases: CaseWithRelations[];
  appointmentTypes: AppointmentTypeItem[];
  onClose: () => void;
  onSaved: (saved?: AppointmentWithRelations) => void;
  onDeleted?: (deletedId: string) => void;
  onRequestLogin?: () => void;
  onSaveStatusChange: (status: "saving" | "saved" | "failed") => void;
}

export function AppointmentModal({
  initialAppointment,
  defaultDate,
  defaultCase,
  currentUser,
  isReadOnly = false,
  users,
  courts,
  cases,
  appointmentTypes,
  onClose,
  onSaved,
  onDeleted,
  onRequestLogin,
  onSaveStatusChange,
}: AppointmentModalProps) {
  const hasExisting = Boolean(initialAppointment);
  const isMasked = Boolean(initialAppointment?.is_masked_private);

  // View-first UX: always open existing appointment in View mode first; user clicks "แก้ไขนัดหมาย" to edit
  const [viewMode, setViewMode] = useState<boolean>(hasExisting);

  // 1. Court & Courtroom
  const [courtId, setCourtId] = useState<string>(
    initialAppointment?.court_id || defaultCase?.court_id || ""
  );
  const [courtroom, setCourtroom] = useState<string>(
    initialAppointment?.courtroom || ""
  );

  // 2. Case Linking
  const [selectedCaseId, setSelectedCaseId] = useState<string>(
    initialAppointment?.case_id || defaultCase?.id || ""
  );
  const [caseQuery, setCaseQuery] = useState("");

  // 3. Plaintiff - Defendant, Our Role, Sequence Note
  const [plaintiffName, setPlaintiffName] = useState<string>(
    initialAppointment?.plaintiff_name ||
      initialAppointment?.case?.plaintiff_name ||
      defaultCase?.plaintiff_name ||
      ""
  );
  const [defendantName, setDefendantName] = useState<string>(
    initialAppointment?.defendant_name ||
      initialAppointment?.case?.defendant_name ||
      defaultCase?.defendant_name ||
      ""
  );
  const [ourRole, setOurRole] = useState<OurRole | "">(
    initialAppointment?.our_role ||
      initialAppointment?.case?.our_role ||
      defaultCase?.our_role ||
      "plaintiff_lawyer"
  );
  const [sequenceNote, setSequenceNote] = useState<string>(
    initialAppointment?.sequence_note || ""
  );

  // 4. What the appointment is about
  const [title, setTitle] = useState(initialAppointment?.title || "");
  const [category, setCategory] = useState<AppointmentCategory>(
    initialAppointment?.category || "court"
  );

  const availableTypes = useMemo(
    () => appointmentTypes.filter((t) => t.is_active && t.category === category),
    [appointmentTypes, category]
  );

  const [appointmentType, setAppointmentType] = useState(
    initialAppointment?.appointment_type ||
      appointmentTypes.find((t) => t.is_active && t.category === "court")?.name ||
      "นัดสืบพยาน"
  );

  // 5. Date (พ.ศ.) & Start Time (24h, no end time)
  const [appointmentDate, setAppointmentDate] = useState(
    initialAppointment?.appointment_date || defaultDate || getBangkokToday()
  );
  const [startTime, setStartTime] = useState(initialAppointment?.start_time || "");

  const [location, setLocation] = useState(
    initialAppointment?.location || defaultCase?.court?.name || ""
  );
  const [responsibleUserId, setResponsibleUserId] = useState(
    initialAppointment?.responsible_user_id ||
      currentUser?.id ||
      users.find((u) => u.is_active)?.id ||
      ""
  );
  const [visibility, setVisibility] = useState<AppointmentVisibility>(
    initialAppointment?.visibility || "shared"
  );
  const [status, setStatus] = useState<AppointmentStatus>(
    initialAppointment?.status || "scheduled"
  );
  const [description, setDescription] = useState(initialAppointment?.description || "");
  const [reminder1Day, setReminder1Day] = useState(
    initialAppointment?.reminder_1_day ?? true
  );
  const [reminderSameDay, setReminderSameDay] = useState(
    initialAppointment?.reminder_same_day ?? true
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCase = useMemo(
    () => cases.find((c) => c.id === selectedCaseId) || null,
    [cases, selectedCaseId]
  );

  const matchingCases = useMemo(() => {
    const q = caseQuery.trim().toLowerCase();
    if (!q) return [];
    return cases
      .filter(
        (c) =>
          c.black_case_number.toLowerCase().includes(q) ||
          c.formatted_case_number.toLowerCase().includes(q) ||
          c.plaintiff_name.toLowerCase().includes(q) ||
          c.defendant_name.toLowerCase().includes(q) ||
          (c.court?.name || "").toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [cases, caseQuery]);

  function handleCategoryChange(nextCat: AppointmentCategory) {
    setCategory(nextCat);
    const first = appointmentTypes.find((t) => t.is_active && t.category === nextCat);
    if (first) setAppointmentType(first.name);
  }

  function handlePickCase(c: CaseWithRelations) {
    setSelectedCaseId(c.id);
    setCaseQuery("");
    if (c.court_id) setCourtId(c.court_id);
    if (c.court?.name && !location) setLocation(c.court.name);
    if (c.plaintiff_name) setPlaintiffName(c.plaintiff_name);
    if (c.defendant_name) setDefendantName(c.defendant_name);
    if (c.our_role) setOurRole(c.our_role);
  }

  async function submitForm() {
    if (isReadOnly) return;
    setSubmitting(true);
    setError(null);
    onSaveStatusChange("saving");

    try {
      const payload = {
        title,
        appointment_date: appointmentDate,
        category,
        appointment_type: appointmentType,
        start_time: startTime || null,
        end_time: null,
        case_id: selectedCaseId || null,
        court_id: courtId || null,
        courtroom,
        our_role: ourRole || null,
        sequence_note: sequenceNote,
        plaintiff_name: plaintiffName,
        defendant_name: defendantName,
        location,
        responsible_user_id: responsibleUserId,
        visibility,
        status,
        description,
        reminder_1_day: reminder1Day,
        reminder_same_day: reminderSameDay,
        expected_updated_at: initialAppointment?.updated_at,
        force_duplicate: true,
      };

      const url = hasExisting
        ? `/api/appointments/${initialAppointment!.id}`
        : "/api/appointments";
      const res = await fetch(url, {
        method: hasExisting ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        onSaveStatusChange("failed");
        setError(data.error || "บันทึกข้อมูลไม่สำเร็จ");
        return;
      }

      onSaveStatusChange("saved");
      onSaved(data.appointment as AppointmentWithRelations);
      onClose();
    } catch {
      onSaveStatusChange("failed");
      setError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ ข้อมูลยังไม่ได้ถูกบันทึก");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!initialAppointment || isReadOnly) return;
    setSubmitting(true);
    onSaveStatusChange("saving");
    try {
      const res = await fetch(`/api/appointments/${initialAppointment.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "ลบนัดหมายไม่สำเร็จ");
        onSaveStatusChange("failed");
        return;
      }
      onSaveStatusChange("saved");
      if (onDeleted) {
        onDeleted(initialAppointment.id);
      } else {
        onSaved();
      }
      onClose();
    } catch {
      onSaveStatusChange("failed");
      setError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setSubmitting(false);
    }
  }

  // Masked Private Appointment
  if (isMasked && initialAppointment) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[2px] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden">
          <div className="px-6 py-4 bg-[#0f294a] text-white flex items-center justify-between">
            <h2 className="text-xl font-bold">นัดหมายส่วนตัว</h2>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/15 cursor-pointer"
              aria-label="ปิดหน้าต่าง"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-lg text-slate-700">
              นัดหมายนี้เป็น <strong>นัดหมายส่วนตัว</strong> ของ{" "}
              {initialAppointment.responsible_user?.full_name}
            </p>
            <p className="text-slate-600">
              {formatThaiDate(initialAppointment.appointment_date)} •{" "}
              {formatTime24(initialAppointment.start_time)}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="btn-legal px-6 bg-[#0f294a] text-white cursor-pointer"
            >
              ปิด
            </button>
          </div>
        </div>
      </div>
    );
  }

  // VIEW MODE (Always shown first when clicking an existing appointment, whether logged in or not)
  if (viewMode && initialAppointment) {
    const courtName =
      initialAppointment.court?.name ||
      initialAppointment.case?.court?.name ||
      initialAppointment.location ||
      "ไม่ระบุศาล/สถานที่";
    const dispCaseNo = initialAppointment.case?.formatted_case_number || "ไม่ได้ระบุเลขคดี";
    const dispPlaintiff =
      initialAppointment.plaintiff_name || initialAppointment.case?.plaintiff_name || "-";
    const dispDefendant =
      initialAppointment.defendant_name || initialAppointment.case?.defendant_name || "-";
    const dispRole = getOurRoleLabel(
      initialAppointment.our_role || initialAppointment.case?.our_role
    );

    return (
      <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[2px] flex items-end sm:items-center justify-center p-2 sm:p-4 overflow-y-auto">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl my-2 sm:my-6 overflow-hidden">
          {/* Header */}
          <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-[#0f294a] text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <FileText className="w-5 h-5 text-sky-200" />
              <h2 className="text-lg sm:text-xl font-bold">รายละเอียดนัดหมาย</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/15 cursor-pointer"
              aria-label="ปิดหน้าต่าง"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 sm:p-6 space-y-4 max-h-[calc(100dvh-9rem)] overflow-y-auto bg-slate-50/50">
            {/* Gestalt Group 1: ศาล - ห้องพิจารณาคดี & เลขคดี */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
              {/* 1. ศาล - ห้องพิจารณาคดี */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-[#0f294a]/10 text-[#0f294a] flex items-center justify-center shrink-0">
                    <Landmark className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      ศาล - ห้องพิจารณาคดี
                    </div>
                    <div className="text-lg font-bold text-[#0f294a]">
                      {courtName}
                      {initialAppointment.courtroom && (
                        <span className="ml-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-amber-100 border border-amber-300 text-amber-950 text-sm font-bold">
                          <DoorOpen className="w-3.5 h-3.5" />
                          {initialAppointment.courtroom}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {initialAppointment.status !== "scheduled" && (
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold border ${
                      initialAppointment.status === "completed"
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : "bg-red-50 text-red-800 border-red-200"
                    }`}
                  >
                    {getStatusLabel(initialAppointment.status)}
                  </span>
                )}
              </div>

              {/* 2. เลขคดี */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                    <Scale className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-500">เลขคดี</div>
                    <div className="text-lg font-bold text-slate-900">{dispCaseNo}</div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {dispRole && (
                    <span className="px-3 py-1 rounded-lg bg-sky-100 border border-sky-300 text-sky-900 text-sm font-bold">
                      {dispRole}
                    </span>
                  )}
                  {initialAppointment.sequence_note && (
                    <span className="px-3 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-sm font-bold">
                      {initialAppointment.sequence_note}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Gestalt Group 2: โจทก์ - จำเลย */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-2">
                <Users className="w-4 h-4" />
                <span>โจทก์ - จำเลย</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
                  <div className="text-xs text-slate-500 font-semibold">โจทก์</div>
                  <div className="text-base font-bold text-slate-900 mt-0.5">
                    {dispPlaintiff}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
                  <div className="text-xs text-slate-500 font-semibold">จำเลย</div>
                  <div className="text-base font-bold text-slate-900 mt-0.5">
                    {dispDefendant}
                  </div>
                </div>
              </div>
            </div>

            {/* Gestalt Group 3: นัดเกี่ยวกับอะไร */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-2">
              <div className="text-xs font-semibold text-slate-500">นัดเกี่ยวกับอะไร</div>
              <div className="text-xl font-bold text-slate-900">
                {initialAppointment.title}
              </div>
              <div className="inline-flex items-center px-2.5 py-1 rounded-md bg-blue-50 border border-blue-200 text-blue-900 text-sm font-semibold">
                {getCategoryLabel(initialAppointment.category)} :{" "}
                {initialAppointment.appointment_type}
              </div>
              {initialAppointment.description && (
                <div className="mt-2 p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-sm sm:text-base whitespace-pre-wrap">
                  {initialAppointment.description}
                </div>
              )}
            </div>

            {/* Gestalt Group 4: นัดวัน-เวลาไหน & ผู้รับผิดชอบ */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2 text-[#0f294a]">
                  <Calendar className="w-5 h-5 shrink-0" />
                  <div>
                    <div className="text-xs text-slate-500 font-semibold">วันนัดหมาย</div>
                    <div className="font-bold text-base">
                      {formatThaiDate(initialAppointment.appointment_date)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[#0f294a]">
                  <Clock className="w-5 h-5 shrink-0" />
                  <div>
                    <div className="text-xs text-slate-500 font-semibold">เวลา (24 ชม.)</div>
                    <div className="font-bold text-base">
                      {formatTime24(initialAppointment.start_time)}
                    </div>
                  </div>
                </div>
              </div>

              {initialAppointment.responsible_user && (
                <div className="flex items-center gap-2 text-slate-700">
                  <UserIcon className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-semibold">
                    ผู้รับผิดชอบ: {initialAppointment.responsible_user.full_name}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            {isReadOnly ? (
              onRequestLogin ? (
                <button
                  type="button"
                  onClick={onRequestLogin}
                  className="btn-legal px-5 bg-[#0f294a] hover:bg-[#173b69] text-white inline-flex items-center gap-2 cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>เข้าสู่ระบบเพื่อแก้ไข</span>
                </button>
              ) : (
                <div />
              )
            ) : (
              <button
                type="button"
                onClick={() => setViewMode(false)}
                className="btn-legal px-5 bg-[#0f294a] hover:bg-[#173b69] text-white inline-flex items-center gap-2 cursor-pointer"
              >
                <Edit3 className="w-4 h-4" />
                <span>แก้ไขนัดหมาย</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="btn-legal px-5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 cursor-pointer"
            >
              ปิด
            </button>
          </div>
        </div>
      </div>
    );
  }

  // CREATE / EDIT FORM MODE
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[2px] flex items-end sm:items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl my-2 sm:my-6 overflow-hidden">
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-[#0f294a] text-white flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-bold">
            {hasExisting ? "แก้ไขนัดหมาย" : "เพิ่มนัดหมายใหม่"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/15 cursor-pointer"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitForm();
          }}
          className="p-4 sm:p-6 space-y-4 sm:space-y-5 max-h-[calc(100dvh-7rem)] overflow-y-auto bg-slate-50/40"
        >
          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. ศาล - ห้องพิจารณาคดี & เลขคดี */}
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-bold text-[#0f294a] text-base border-b border-slate-100 pb-2">
              1. ศาล - ห้องพิจารณาคดี และเลขคดี
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-800 mb-1.5">ศาล</label>
                <SearchableSelect
                  value={courtId}
                  onChange={(id) => {
                    setCourtId(id);
                    const c = courts.find((ct) => ct.id === id);
                    if (c && !location) setLocation(c.name);
                  }}
                  placeholder="เลือกศาล..."
                  searchPlaceholder="ค้นหาชื่อศาล..."
                  allowClearOption={{ value: "", label: "-- ไม่ระบุศาล --" }}
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
                <label className="block font-semibold text-slate-800 mb-1.5">
                  ห้องพิจารณาคดี / บัลลังก์
                </label>
                <input
                  type="text"
                  value={courtroom}
                  onChange={(e) => setCourtroom(e.target.value)}
                  className="input-legal w-full px-4 bg-white border border-slate-300 focus:border-[#0f294a] focus:outline-none"
                  placeholder="เช่น บัลลังก์ 4 หรือ ห้องพิจารณา 302"
                />
              </div>
            </div>

            {/* Case Linking */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-semibold text-slate-800">
                  เชื่อมโยงเลขคดี (ไม่บังคับ)
                </label>
                {selectedCase && (
                  <button
                    type="button"
                    onClick={() => setSelectedCaseId("")}
                    className="text-sm text-red-700 hover:underline cursor-pointer"
                  >
                    ยกเลิกการเชื่อมโยงคดี
                  </button>
                )}
              </div>

              {selectedCase ? (
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-300 text-sm sm:text-base">
                  <div className="font-bold text-[#0f294a]">
                    เลขคดี: {selectedCase.formatted_case_number} — {selectedCase.court?.name}
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    value={caseQuery}
                    onChange={(e) => setCaseQuery(e.target.value)}
                    placeholder="ค้นหาเลขคดีดำ ชื่อโจทก์ ชื่อจำเลย..."
                    className="input-legal w-full pl-11 pr-4 bg-white border border-slate-300 focus:border-[#0f294a] focus:outline-none"
                  />
                  {matchingCases.length > 0 && (
                    <div className="mt-1.5 bg-white border border-slate-300 rounded-xl shadow-lg divide-y divide-slate-200 max-h-52 overflow-y-auto">
                      {matchingCases.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handlePickCase(c)}
                          className="w-full text-left px-4 py-2.5 hover:bg-slate-50 cursor-pointer"
                        >
                          <div className="font-bold text-[#0f294a]">
                            {c.formatted_case_number} ({c.court?.name})
                          </div>
                          <div className="text-sm text-slate-600">
                            โจทก์: {c.plaintiff_name} / จำเลย: {c.defendant_name}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 2. โจทก์ - จำเลย & ความเกี่ยวข้อง */}
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-bold text-[#0f294a] text-base border-b border-slate-100 pb-2">
              2. โจทก์ - จำเลย ความเกี่ยวข้อง และลำดับที่
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-800 mb-1.5">โจทก์</label>
                <input
                  type="text"
                  value={plaintiffName}
                  onChange={(e) => setPlaintiffName(e.target.value)}
                  className="input-legal w-full px-4 bg-white border border-slate-300 focus:border-[#0f294a] focus:outline-none"
                  placeholder="ระบุชื่อโจทก์"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1.5">จำเลย</label>
                <input
                  type="text"
                  value={defendantName}
                  onChange={(e) => setDefendantName(e.target.value)}
                  className="input-legal w-full px-4 bg-white border border-slate-300 focus:border-[#0f294a] focus:outline-none"
                  placeholder="ระบุชื่อจำเลย"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1.5">
                  ความเกี่ยวข้องของเรา
                </label>
                <select
                  value={ourRole}
                  onChange={(e) => setOurRole(e.target.value as OurRole | "")}
                  className="input-legal w-full px-4 border border-slate-300 bg-white focus:border-[#0f294a] focus:outline-none"
                >
                  <option value="plaintiff_lawyer">ทนายโจทก์</option>
                  <option value="defendant_lawyer">ทนายจำเลย</option>
                  <option value="other">อื่น ๆ</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1.5">
                  Note ลำดับที่เท่าไหร่
                </label>
                <input
                  type="text"
                  value={sequenceNote}
                  onChange={(e) => setSequenceNote(e.target.value)}
                  className="input-legal w-full px-4 bg-white border border-slate-300 focus:border-[#0f294a] focus:outline-none"
                  placeholder="เช่น ลำดับที่ 2, จำเลยที่ 3"
                />
              </div>
            </div>
          </div>

          {/* 3. นัดเกี่ยวกับอะไร & นัดวัน-เวลาไหน */}
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-bold text-[#0f294a] text-base border-b border-slate-100 pb-2">
              3. นัดเกี่ยวกับอะไร และวัน-เวลานัดหมาย
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-800 mb-1.5">
                  นัดเกี่ยวกับอะไร (ชื่อนัดหมาย) <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="input-legal w-full px-4 border border-slate-300 focus:border-[#0f294a] focus:outline-none"
                  placeholder="เช่น สืบพยานโจทก์ปากที่ 1 หรือ นัดชี้สองสถาน"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1.5">
                  กลุ่มนัดหมาย <span className="text-red-600">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) =>
                    handleCategoryChange(e.target.value as AppointmentCategory)
                  }
                  className="input-legal w-full px-4 border border-slate-300 bg-white focus:border-[#0f294a] focus:outline-none"
                >
                  <option value="court">นัดหมายทางศาล</option>
                  <option value="office">นัดหมายสำนักงาน</option>
                  <option value="personal">นัดหมายส่วนตัว</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1.5">
                  ประเภทนัดหมาย <span className="text-red-600">*</span>
                </label>
                <select
                  value={appointmentType}
                  onChange={(e) => setAppointmentType(e.target.value)}
                  className="input-legal w-full px-4 border border-slate-300 bg-white focus:border-[#0f294a] focus:outline-none"
                >
                  {availableTypes.map((t) => (
                    <option key={t.id} value={t.name}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1.5">
                  วันที่นัดหมาย (พ.ศ.) <span className="text-red-600">*</span>
                </label>
                <ThaiDateInput value={appointmentDate} onChange={setAppointmentDate} />
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1.5">
                  เวลานัดหมาย (ระบบ 24 ชั่วโมง)
                </label>
                <Time24Input value={startTime} onChange={setStartTime} showPresets />
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1.5">
                  ผู้รับผิดชอบ
                </label>
                <select
                  value={responsibleUserId}
                  onChange={(e) => setResponsibleUserId(e.target.value)}
                  className="input-legal w-full px-4 border border-slate-300 bg-white focus:border-[#0f294a] focus:outline-none"
                >
                  {users
                    .filter((u) => u.is_active)
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.full_name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1.5">
                  สถานที่เพิ่มเติม (กรณีไม่ใช่อาคารศาล)
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="input-legal w-full px-4 border border-slate-300 focus:border-[#0f294a] focus:outline-none"
                  placeholder="เช่น ห้องประชุม 1 หรือ สำนักงาน"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1.5">
                  การมองเห็นในปฏิทินกลาง
                </label>
                <select
                  value={visibility}
                  onChange={(e) =>
                    setVisibility(e.target.value as AppointmentVisibility)
                  }
                  className="input-legal w-full px-4 border border-slate-300 bg-white focus:border-[#0f294a] focus:outline-none"
                >
                  <option value="shared">Shared (ทุกคนเห็นรายละเอียด)</option>
                  <option value="private">Private (เฉพาะเจ้าของและผู้ดูแลระบบ)</option>
                </select>
              </div>

              {hasExisting && (
                <div>
                  <label className="block font-semibold text-slate-800 mb-1.5">
                    สถานะนัดหมาย
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as AppointmentStatus)}
                    className="input-legal w-full px-4 border border-slate-300 bg-white focus:border-[#0f294a] focus:outline-none"
                  >
                    <option value="scheduled">กำหนดการ (Scheduled)</option>
                    <option value="completed">เสร็จสิ้น (Completed)</option>
                    <option value="cancelled">ยกเลิก (Cancelled)</option>
                  </select>
                </div>
              )}
            </div>

            <div>
              <label className="block font-semibold text-slate-800 mb-1.5">
                รายละเอียดเพิ่มเติม
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3.5 rounded-xl border border-slate-300 focus:border-[#0f294a] focus:outline-none text-base"
                placeholder="บันทึกหมายเหตุ เอกสารที่ต้องเตรียม..."
              />
            </div>

            <div className="flex flex-wrap gap-6 pt-1">
              <label className="inline-flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={reminder1Day}
                  onChange={(e) => setReminder1Day(e.target.checked)}
                  className="w-5 h-5 accent-[#0f294a]"
                />
                <span>แจ้งเตือนล่วงหน้า 1 วัน</span>
              </label>
              <label className="inline-flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={reminderSameDay}
                  onChange={(e) => setReminderSameDay(e.target.checked)}
                  className="w-5 h-5 accent-[#0f294a]"
                />
                <span>แจ้งเตือนเช้าวันนัด (07:00 น.)</span>
              </label>
            </div>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
            {hasExisting ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={submitting}
                className="btn-legal px-4 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 inline-flex items-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>ลบนัดหมาย</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => (hasExisting ? setViewMode(true) : onClose())}
                className="btn-legal px-5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 cursor-pointer"
              >
                {hasExisting ? "กลับไปหน้าดูรายละเอียด" : "ยกเลิก"}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="btn-legal px-6 bg-[#0f294a] hover:bg-[#173b69] text-white cursor-pointer disabled:opacity-60"
              >
                {submitting ? "กำลังบันทึก..." : "บันทึกนัดหมาย"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
