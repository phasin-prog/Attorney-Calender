"use client";

import React, { useMemo, useState } from "react";
import { AlertTriangle, Search, Trash2, X } from "lucide-react";
import { getBangkokToday } from "@/lib/thai-date";
import type {
  AppointmentCategory,
  AppointmentStatus,
  AppointmentTypeItem,
  AppointmentVisibility,
  AppointmentWithRelations,
  CaseWithRelations,
  Court,
  User,
} from "@/types/domain";

interface AppointmentModalProps {
  initialAppointment: AppointmentWithRelations | null;
  defaultDate?: string;
  defaultCase?: CaseWithRelations | null;
  currentUser: User;
  users: User[];
  courts: Court[];
  cases: CaseWithRelations[];
  appointmentTypes: AppointmentTypeItem[];
  onClose: () => void;
  onSaved: () => Promise<void>;
  onSaveStatusChange: (status: "saving" | "saved" | "failed") => void;
}

export function AppointmentModal({
  initialAppointment,
  defaultDate,
  defaultCase,
  currentUser,
  users,
  courts,
  cases,
  appointmentTypes,
  onClose,
  onSaved,
  onSaveStatusChange,
}: AppointmentModalProps) {
  const isEditing = Boolean(initialAppointment);
  const isMasked = Boolean(initialAppointment?.is_masked_private);

  const [title, setTitle] = useState(initialAppointment?.title || "");
  const [appointmentDate, setAppointmentDate] = useState(
    initialAppointment?.appointment_date || defaultDate || getBangkokToday()
  );
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

  const [startTime, setStartTime] = useState(initialAppointment?.start_time || "");
  const [endTime, setEndTime] = useState(initialAppointment?.end_time || "");
  const [selectedCaseId, setSelectedCaseId] = useState<string>(
    initialAppointment?.case_id || defaultCase?.id || ""
  );
  const [caseQuery, setCaseQuery] = useState("");
  const [courtId, setCourtId] = useState<string>(
    initialAppointment?.court_id || defaultCase?.court_id || ""
  );
  const [location, setLocation] = useState(
    initialAppointment?.location || defaultCase?.court?.name || ""
  );
  const [responsibleUserId, setResponsibleUserId] = useState(
    initialAppointment?.responsible_user_id || currentUser.id
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
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

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
  }

  async function submitForm(forceDuplicate = false) {
    setSubmitting(true);
    setError(null);
    setDuplicateWarning(null);
    onSaveStatusChange("saving");

    try {
      const payload = {
        title,
        appointment_date: appointmentDate,
        category,
        appointment_type: appointmentType,
        start_time: startTime || null,
        end_time: endTime || null,
        case_id: selectedCaseId || null,
        court_id: courtId || null,
        location,
        responsible_user_id: responsibleUserId,
        visibility,
        status,
        description,
        reminder_1_day: reminder1Day,
        reminder_same_day: reminderSameDay,
        expected_updated_at: initialAppointment?.updated_at,
        force_duplicate: forceDuplicate,
      };

      const url = isEditing
        ? `/api/appointments/${initialAppointment!.id}`
        : "/api/appointments";
      const res = await fetch(url, {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        onSaveStatusChange("failed");
        if (data?.data?.duplicateAppointment) {
          setDuplicateWarning(
            `พบนัดหมายที่คล้ายกัน: "${data.data.duplicateAppointment.title}" ในวันที่ ${data.data.duplicateAppointment.appointment_date} ต้องการบันทึกซ้ำหรือไม่?`
          );
          return;
        }
        setError(data.error || "บันทึกข้อมูลไม่สำเร็จ");
        return;
      }

      onSaveStatusChange("saved");
      await onSaved();
      onClose();
    } catch {
      onSaveStatusChange("failed");
      setError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ ข้อมูลยังไม่ได้ถูกบันทึก");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!initialAppointment) return;
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
      await onSaved();
      onClose();
    } catch {
      onSaveStatusChange("failed");
      setError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-3xl my-6 overflow-hidden">
        <div className="px-6 py-4 bg-[#0f294a] text-white flex items-center justify-between">
          <h2 className="text-xl font-bold">
            {isEditing ? "รายละเอียด / แก้ไขนัดหมาย" : "เพิ่มนัดหมายใหม่ (หน้าเดียว)"}
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

        {isMasked ? (
          <div className="p-6 space-y-4">
            <p className="text-lg text-slate-700">
              นัดหมายนี้เป็น <strong>นัดหมายส่วนตัว</strong> ของ{" "}
              {initialAppointment?.responsible_user?.full_name}
            </p>
            <p className="text-slate-600">
              ช่วงเวลา: {initialAppointment?.appointment_date}{" "}
              {initialAppointment?.start_time || "ไม่ระบุเวลา"}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="btn-legal px-6 bg-[#0f294a] text-white cursor-pointer"
            >
              ปิด
            </button>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitForm(false);
            }}
            className="p-6 space-y-5 max-h-[82vh] overflow-y-auto"
          >
            {error && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {duplicateWarning && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 space-y-3">
                <p className="font-semibold">{duplicateWarning}</p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => submitForm(true)}
                    className="btn-legal px-4 bg-[#0f294a] text-white cursor-pointer"
                  >
                    ยืนยันบันทึกนัดหมายนี้
                  </button>
                  <button
                    type="button"
                    onClick={() => setDuplicateWarning(null)}
                    className="btn-legal px-4 bg-white border border-slate-300 text-slate-700 cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                </div>
              </div>
            )}

            {/* Required Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-800 mb-1.5">
                  ชื่อนัดหมาย <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="input-legal w-full px-4 border border-slate-300 focus:border-[#0f294a] focus:outline-none"
                  placeholder="เช่น สืบพยานโจทก์ปากที่ 1 หรือ พบลูกความ"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1.5">
                  วันที่นัดหมาย <span className="text-red-600">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={appointmentDate}
                  onChange={(e) => setAppointmentDate(e.target.value)}
                  className="input-legal w-full px-4 border border-slate-300 focus:border-[#0f294a] focus:outline-none"
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
                  เวลาเริ่มต้น (ไม่บังคับ)
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="input-legal w-full px-4 border border-slate-300 focus:border-[#0f294a] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1.5">
                  เวลาสิ้นสุด (ไม่บังคับ)
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="input-legal w-full px-4 border border-slate-300 focus:border-[#0f294a] focus:outline-none"
                />
              </div>
            </div>

            {/* Case Linking */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-800">
                  เชื่อมโยงข้อมูลคดี (ไม่บังคับ)
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
                <div className="p-3 rounded-lg bg-white border border-slate-300 text-sm sm:text-base">
                  <div className="font-bold text-[#0f294a]">
                    {selectedCase.formatted_case_number} — {selectedCase.court?.name}
                  </div>
                  <div className="text-slate-700">
                    โจทก์: {selectedCase.plaintiff_name} | จำเลย:{" "}
                    {selectedCase.defendant_name}
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    value={caseQuery}
                    onChange={(e) => setCaseQuery(e.target.value)}
                    placeholder="ค้นหาเลขคดีดำ ชื่อโจทก์ ชื่อจำเลย หรือชื่อศาล..."
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

            {/* Location & Visibility */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-800 mb-1.5">
                  ศาล (ถ้ามี)
                </label>
                <select
                  value={courtId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setCourtId(id);
                    const c = courts.find((ct) => ct.id === id);
                    if (c && !location) setLocation(c.name);
                  }}
                  className="input-legal w-full px-4 border border-slate-300 bg-white focus:border-[#0f294a] focus:outline-none"
                >
                  <option value="">-- ไม่ระบุศาล --</option>
                  {courts
                    .filter((c) => c.is_active)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1.5">
                  สถานที่ / ห้องพิจารณาคดี
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="input-legal w-full px-4 border border-slate-300 focus:border-[#0f294a] focus:outline-none"
                  placeholder="เช่น ห้องพิจารณาคดี 402 หรือ ห้องประชุม 1"
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
                  <option value="shared">Shared (ทุกคนในสำนักงานเห็นรายละเอียด)</option>
                  <option value="private">Private (เฉพาะเจ้าของและผู้ดูแลระบบ)</option>
                </select>
              </div>

              {isEditing && (
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

            <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              {isEditing ? (
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
                  onClick={onClose}
                  className="btn-legal px-5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 cursor-pointer"
                >
                  ยกเลิก
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
        )}
      </div>
    </div>
  );
}
