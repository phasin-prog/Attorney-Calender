"use client";

import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarPlus,
  Plus,
  Scale,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  formatThaiShortDate,
  getCaseStatusLabel,
  getCategoryLabel,
  getStatusLabel,
} from "@/lib/thai-date";
import type {
  AppointmentWithRelations,
  CaseCategory,
  CaseStatus,
  CaseWithRelations,
  Court,
  User,
} from "@/types/domain";

interface CasesViewProps {
  cases: CaseWithRelations[];
  appointments: AppointmentWithRelations[];
  courts: Court[];
  caseCategories: CaseCategory[];
  users: User[];
  currentUser: User;
  onRefresh: () => Promise<void>;
  onAddAppointmentForCase: (c: CaseWithRelations) => void;
  onSelectAppointment: (appt: AppointmentWithRelations) => void;
  onSaveStatusChange: (s: "saving" | "saved" | "failed") => void;
}

export function CasesView({
  cases,
  appointments,
  courts,
  caseCategories,
  users,
  currentUser,
  onRefresh,
  onAddAppointmentForCase,
  onSelectAppointment,
  onSaveStatusChange,
}: CasesViewProps) {
  const [query, setQuery] = useState("");
  const [filterCourt, setFilterCourt] = useState("all");
  const [filterCat, setFilterCat] = useState("all");
  const [filterYear, setFilterYear] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const [selectedCase, setSelectedCase] = useState<CaseWithRelations | null>(null);
  const [editingCase, setEditingCase] = useState<CaseWithRelations | null>(null);
  const [showCaseForm, setShowCaseForm] = useState(false);

  const filteredCases = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cases.filter((c) => {
      if (filterCourt !== "all" && c.court_id !== filterCourt) return false;
      if (filterCat !== "all" && c.category_id !== filterCat) return false;
      if (filterYear.trim() && String(c.case_year) !== filterYear.trim()) return false;
      if (filterStatus !== "all" && c.status !== filterStatus) return false;
      if (!q) return true;
      return (
        c.black_case_number.toLowerCase().includes(q) ||
        c.formatted_case_number.toLowerCase().includes(q) ||
        c.plaintiff_name.toLowerCase().includes(q) ||
        c.defendant_name.toLowerCase().includes(q) ||
        (c.court?.name || "").toLowerCase().includes(q) ||
        (c.category?.abbreviation || "").toLowerCase().includes(q) ||
        String(c.case_year).includes(q)
      );
    });
  }, [cases, query, filterCourt, filterCat, filterYear, filterStatus]);

  const caseAppointments = useMemo(() => {
    if (!selectedCase) return [];
    return appointments
      .filter((a) => a.case_id === selectedCase.id && !a.deleted_at)
      .sort((a, b) => b.appointment_date.localeCompare(a.appointment_date));
  }, [appointments, selectedCase]);

  return (
    <div className="space-y-5">
      {/* Header & Search */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#0f294a]">ระบบข้อมูลคดี</h1>
            <p className="text-slate-600 text-base">
              ค้นหาคดี ตรวจสอบข้อมูลคู่ความ และเชื่อมโยงประวัติการนัดหมาย
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingCase(null);
              setShowCaseForm(true);
            }}
            className="btn-legal px-5 bg-[#0f294a] hover:bg-[#173b69] text-white inline-flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            <span>เพิ่มคดีใหม่</span>
          </button>
        </div>

        {/* Global Case Search */}
        <div className="relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-4" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหาคดี เลขคดีดำ ชื่อโจทก์ หรือชื่อจำเลย..."
            className="input-legal w-full pl-12 pr-4 border border-slate-300 focus:border-[#0f294a] focus:outline-none"
          />
        </div>

        {/* Advanced Search Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <select
            value={filterCourt}
            onChange={(e) => setFilterCourt(e.target.value)}
            className="input-legal px-3 border border-slate-300 bg-white"
          >
            <option value="all">ศาลทั้งหมด</option>
            {courts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value)}
            className="input-legal px-3 border border-slate-300 bg-white"
          >
            <option value="all">อักษรย่อทั้งหมด</option>
            {caseCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.abbreviation} ({cat.description})
              </option>
            ))}
          </select>

          <input
            type="text"
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            placeholder="ปีคดี (พ.ศ.) เช่น 2569"
            className="input-legal px-3 border border-slate-300"
          />

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input-legal px-3 border border-slate-300 bg-white"
          >
            <option value="all">สถานะคดีทั้งหมด</option>
            <option value="active">กำลังดำเนินการ</option>
            <option value="pending">รอพิจารณา</option>
            <option value="closed">เสร็จสิ้นแล้ว</option>
          </select>
        </div>
      </div>

      {/* Case List & Detail Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 font-bold text-[#0f294a]">
            รายการคดี ({filteredCases.length} คดี)
          </div>

          {filteredCases.length === 0 ? (
            <div className="p-8 text-center text-slate-500">ไม่พบข้อมูลคดีที่ค้นหา</div>
          ) : (
            <div className="divide-y divide-slate-200">
              {filteredCases.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCase(c)}
                  className={`w-full text-left p-4 hover:bg-slate-50 transition cursor-pointer ${
                    selectedCase?.id === c.id ? "bg-blue-50/60" : ""
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-lg font-bold text-[#0f294a]">
                      {c.formatted_case_number}
                    </span>
                    <span className="text-sm font-semibold px-2.5 py-0.5 rounded-md bg-slate-100 border border-slate-300 text-slate-800">
                      {getCaseStatusLabel(c.status)}
                    </span>
                  </div>
                  <div className="text-base text-slate-700 mt-1">
                    {c.court?.name || "-"}
                  </div>
                  <div className="text-sm text-slate-600 mt-1">
                    <strong>โจทก์:</strong> {c.plaintiff_name} |{" "}
                    <strong>จำเลย:</strong> {c.defendant_name}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Case Detail Panel */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-5">
          {!selectedCase ? (
            <div className="py-16 text-center text-slate-500 space-y-2">
              <Scale className="w-10 h-10 mx-auto text-slate-300" />
              <p>เลือกรายการคดีทางซ้ายเพื่อดูรายละเอียดและประวัตินัดหมาย</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-[#0f294a]">
                    เลขคดีดำ: {selectedCase.formatted_case_number}
                  </h2>
                  <p className="text-slate-600">{selectedCase.court?.name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingCase(selectedCase);
                    setShowCaseForm(true);
                  }}
                  className="px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-sm font-semibold cursor-pointer"
                >
                  แก้ไขข้อมูลคดี
                </button>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-base">
                <div>
                  <strong>โจทก์:</strong> {selectedCase.plaintiff_name}
                </div>
                <div>
                  <strong>จำเลย:</strong> {selectedCase.defendant_name}
                </div>
                <div>
                  <strong>ผู้รับผิดชอบ:</strong>{" "}
                  {selectedCase.responsible_user?.full_name || "-"}
                </div>
                <div>
                  <strong>สถานะคดี:</strong> {getCaseStatusLabel(selectedCase.status)}
                </div>
                {selectedCase.notes && (
                  <div>
                    <strong>หมายเหตุ:</strong> {selectedCase.notes}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => onAddAppointmentForCase(selectedCase)}
                className="btn-legal w-full bg-[#0f294a] hover:bg-[#173b69] text-white inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <CalendarPlus className="w-5 h-5" />
                <span>เพิ่มนัดหมายจากคดีนี้</span>
              </button>

              <div className="pt-3 border-t border-slate-200">
                <h3 className="font-bold text-slate-800 mb-2">
                  ประวัตินัดหมายทั้งหมด ({caseAppointments.length})
                </h3>
                {caseAppointments.length === 0 ? (
                  <p className="text-slate-500 text-sm">ยังไม่มีนัดหมายในคดีนี้</p>
                ) : (
                  <div className="space-y-2">
                    {caseAppointments.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => onSelectAppointment(a)}
                        className="w-full text-left p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer"
                      >
                        <div className="font-semibold text-[#0f294a]">
                          {formatThaiShortDate(a.appointment_date)}{" "}
                          {a.start_time ? `${a.start_time} น.` : ""} — {a.title}
                        </div>
                        <div className="text-sm text-slate-600">
                          {getCategoryLabel(a.category)} ({a.appointment_type}) •{" "}
                          {getStatusLabel(a.status)}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {showCaseForm && (
        <CaseFormModal
          initialCase={editingCase}
          courts={courts}
          caseCategories={caseCategories}
          users={users}
          currentUser={currentUser}
          onClose={() => setShowCaseForm(false)}
          onOpenExisting={(existing) => {
            setShowCaseForm(false);
            setSelectedCase(existing);
          }}
          onSaved={async () => {
            await onRefresh();
            setShowCaseForm(false);
          }}
          onSaveStatusChange={onSaveStatusChange}
        />
      )}
    </div>
  );
}

function CaseFormModal({
  initialCase,
  courts,
  caseCategories,
  users,
  currentUser,
  onClose,
  onOpenExisting,
  onSaved,
  onSaveStatusChange,
}: {
  initialCase: CaseWithRelations | null;
  courts: Court[];
  caseCategories: CaseCategory[];
  users: User[];
  currentUser: User;
  onClose: () => void;
  onOpenExisting: (c: CaseWithRelations) => void;
  onSaved: () => Promise<void>;
  onSaveStatusChange: (s: "saving" | "saved" | "failed") => void;
}) {
  const isEditing = Boolean(initialCase);
  const [courtId, setCourtId] = useState(
    initialCase?.court_id || courts.find((c) => c.is_active)?.id || ""
  );
  const [categoryId, setCategoryId] = useState(
    initialCase?.category_id || caseCategories.find((c) => c.is_active)?.id || ""
  );
  const [blackCaseNumber, setBlackCaseNumber] = useState(
    initialCase?.black_case_number || ""
  );
  const [caseYear, setCaseYear] = useState(initialCase?.case_year || 2569);
  const [plaintiffName, setPlaintiffName] = useState(initialCase?.plaintiff_name || "");
  const [defendantName, setDefendantName] = useState(initialCase?.defendant_name || "");
  const [responsibleUserId, setResponsibleUserId] = useState(
    initialCase?.responsible_user_id || currentUser.id
  );
  const [status, setStatus] = useState<CaseStatus>(initialCase?.status || "active");
  const [notes, setNotes] = useState(initialCase?.notes || "");
  const [error, setError] = useState<string | null>(null);
  const [duplicateCase, setDuplicateCase] = useState<CaseWithRelations | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setDuplicateCase(null);
    onSaveStatusChange("saving");

    try {
      const url = isEditing ? `/api/cases/${initialCase!.id}` : "/api/cases";
      const res = await fetch(url, {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          court_id: courtId,
          category_id: categoryId,
          black_case_number: blackCaseNumber,
          case_year: Number(caseYear),
          plaintiff_name: plaintiffName,
          defendant_name: defendantName,
          responsible_user_id: responsibleUserId,
          status,
          notes,
          expected_updated_at: initialCase?.updated_at,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        onSaveStatusChange("failed");
        if (data?.data?.duplicateCase) {
          setDuplicateCase(data.data.duplicateCase);
        }
        setError(data.error || "บันทึกข้อมูลคดีไม่สำเร็จ");
        return;
      }
      onSaveStatusChange("saved");
      await onSaved();
    } catch {
      onSaveStatusChange("failed");
      setError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!initialCase) return;
    setSubmitting(true);
    onSaveStatusChange("saving");
    try {
      const res = await fetch(`/api/cases/${initialCase.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        onSaveStatusChange("failed");
        setError(data.error || "ไม่สามารถลบคดีได้");
        return;
      }
      onSaveStatusChange("saved");
      await onSaved();
    } catch {
      onSaveStatusChange("failed");
      setError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-2xl overflow-hidden">
        <div className="px-6 py-4 bg-[#0f294a] text-white flex items-center justify-between">
          <h2 className="text-xl font-bold">
            {isEditing ? "แก้ไขข้อมูลคดี" : "เพิ่มข้อมูลคดีใหม่"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/15 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
              {duplicateCase && (
                <button
                  type="button"
                  onClick={() => onOpenExisting(duplicateCase)}
                  className="btn-legal px-4 bg-[#0f294a] text-white text-sm cursor-pointer"
                >
                  เปิดดูข้อมูลคดีเดิม ({duplicateCase.formatted_case_number})
                </button>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold mb-1.5">ศาล</label>
              <select
                value={courtId}
                onChange={(e) => setCourtId(e.target.value)}
                className="input-legal w-full px-3 border border-slate-300 bg-white"
              >
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
              <label className="block font-semibold mb-1.5">อักษรย่อประเภทคดี</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="input-legal w-full px-3 border border-slate-300 bg-white"
              >
                {caseCategories
                  .filter((c) => c.is_active)
                  .map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.abbreviation} ({cat.description})
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold mb-1.5">หมายเลขคดีดำ</label>
              <input
                type="text"
                required
                value={blackCaseNumber}
                onChange={(e) => setBlackCaseNumber(e.target.value)}
                placeholder="เช่น 123"
                className="input-legal w-full px-4 border border-slate-300"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1.5">ปีคดี (พ.ศ.)</label>
              <input
                type="number"
                required
                value={caseYear}
                onChange={(e) => setCaseYear(Number(e.target.value))}
                className="input-legal w-full px-4 border border-slate-300"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1.5">ชื่อโจทก์</label>
              <input
                type="text"
                required
                value={plaintiffName}
                onChange={(e) => setPlaintiffName(e.target.value)}
                className="input-legal w-full px-4 border border-slate-300"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1.5">ชื่อจำเลย</label>
              <input
                type="text"
                required
                value={defendantName}
                onChange={(e) => setDefendantName(e.target.value)}
                className="input-legal w-full px-4 border border-slate-300"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1.5">ผู้รับผิดชอบคดี</label>
              <select
                value={responsibleUserId}
                onChange={(e) => setResponsibleUserId(e.target.value)}
                className="input-legal w-full px-3 border border-slate-300 bg-white"
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
              <label className="block font-semibold mb-1.5">สถานะคดี</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as CaseStatus)}
                className="input-legal w-full px-3 border border-slate-300 bg-white"
              >
                <option value="active">กำลังดำเนินการ</option>
                <option value="pending">รอพิจารณา</option>
                <option value="closed">เสร็จสิ้นแล้ว</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold mb-1.5">หมายเหตุ</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-3.5 rounded-xl border border-slate-300"
            />
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
            {isEditing ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={submitting}
                className="btn-legal px-4 bg-red-50 text-red-700 border border-red-200 inline-flex items-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>ลบคดี</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="btn-legal px-5 bg-white border border-slate-300 text-slate-700 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="btn-legal px-6 bg-[#0f294a] text-white cursor-pointer disabled:opacity-60"
              >
                {submitting ? "กำลังบันทึก..." : "บันทึกข้อมูลคดี"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
