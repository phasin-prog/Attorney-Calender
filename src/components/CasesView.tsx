"use client";

import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarCheck,
  CalendarPlus,
  MessageSquarePlus,
  Phone,
  Plus,
  Scale,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  formatPartiesSummary,
  formatThaiDateTime,
  formatThaiShortDate,
  formatTime24,
  getCaseStatusLabel,
  getCategoryLabel,
  getCourtLevelLabel,
  getOurRoleLabel,
  getStatusLabel,
} from "@/lib/thai-date";
import { SearchableSelect } from "@/components/SearchableSelect";
import type {
  AppointmentWithRelations,
  CaseCategory,
  CaseNoteEntry,
  CaseParty,
  CaseStatus,
  CaseWithRelations,
  Court,
  CourtLevel,
  OurRole,
  User,
} from "@/types/domain";

interface CasesViewProps {
  cases: CaseWithRelations[];
  appointments: AppointmentWithRelations[];
  courts: Court[];
  caseCategories: CaseCategory[];
  users: User[];
  currentUser: User | null;
  isReadOnly?: boolean;
  onRefresh: () => Promise<void>;
  onCaseSaved?: (saved: CaseWithRelations) => void;
  onCaseDeleted?: (deletedId: string) => void;
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
  isReadOnly = false,
  onRefresh,
  onCaseSaved,
  onCaseDeleted,
  onAddAppointmentForCase,
  onSelectAppointment,
  onSaveStatusChange,
}: CasesViewProps) {
  const [query, setQuery] = useState("");
  const [filterCourt, setFilterCourt] = useState("all");
  const [filterCat, setFilterCat] = useState("all");
  const [filterYear, setFilterYear] = useState("");
  const [filterCourtLevel, setFilterCourtLevel] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [editingCase, setEditingCase] = useState<CaseWithRelations | null>(null);
  const [showCaseForm, setShowCaseForm] = useState(false);

  // Quick Note input state
  const [newNoteText, setNewNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  const selectedCase = useMemo(
    () => cases.find((c) => c.id === selectedCaseId) || null,
    [cases, selectedCaseId]
  );

  // Precompute appointment counts per case_id
  const appointmentStatsByCase = useMemo(() => {
    const map = new Map<
      string,
      { activeCount: number; completed: number; scheduled: number; cancelled: number }
    >();
    for (const a of appointments) {
      if (a.deleted_at || !a.case_id) continue;
      const cur = map.get(a.case_id) || {
        activeCount: 0,
        completed: 0,
        scheduled: 0,
        cancelled: 0,
      };
      if (a.status === "cancelled") {
        cur.cancelled += 1;
      } else {
        cur.activeCount += 1;
        if (a.status === "completed") cur.completed += 1;
        else cur.scheduled += 1;
      }
      map.set(a.case_id, cur);
    }
    return map;
  }, [appointments]);

  // Active courts and categories (abbreviation ONLY, no full description in label)
  const activeCourtsOptions = useMemo(
    () =>
      courts
        .filter((c) => c.is_active)
        .map((c) => ({
          value: c.id,
          label: c.name,
          searchText: `${c.name} ${c.province || ""}`,
        })),
    [courts]
  );

  const activeCategoryOptions = useMemo(
    () =>
      caseCategories
        .filter((cat) => cat.is_active)
        .map((cat) => ({
          value: cat.id,
          label: cat.abbreviation,
          searchText: cat.abbreviation,
        })),
    [caseCategories]
  );

  const filteredCases = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cases.filter((c) => {
      if (filterCourt !== "all" && c.court_id !== filterCourt) return false;
      if (filterCat !== "all" && c.category_id !== filterCat) return false;
      if (filterYear.trim() && String(c.case_year) !== filterYear.trim()) return false;
      if (
        filterCourtLevel !== "all" &&
        (c.court_level || "first_instance") !== filterCourtLevel
      ) {
        return false;
      }
      if (filterStatus !== "all" && c.status !== filterStatus) return false;
      if (!q) return true;
      return (
        c.black_case_number.toLowerCase().includes(q) ||
        c.formatted_case_number.toLowerCase().includes(q) ||
        c.plaintiff_name.toLowerCase().includes(q) ||
        c.defendant_name.toLowerCase().includes(q) ||
        (c.client_phone || "").toLowerCase().includes(q) ||
        (c.client_contact_name || "").toLowerCase().includes(q) ||
        (c.court?.name || "").toLowerCase().includes(q) ||
        (c.category?.abbreviation || "").toLowerCase().includes(q) ||
        String(c.case_year).includes(q)
      );
    });
  }, [
    cases,
    query,
    filterCourt,
    filterCat,
    filterYear,
    filterCourtLevel,
    filterStatus,
  ]);

  const caseAppointments = useMemo(() => {
    if (!selectedCase) return [];
    return appointments
      .filter((a) => a.case_id === selectedCase.id && !a.deleted_at)
      .sort((a, b) => b.appointment_date.localeCompare(a.appointment_date));
  }, [appointments, selectedCase]);

  const selectedStats = selectedCase
    ? appointmentStatsByCase.get(selectedCase.id) || {
        activeCount: 0,
        completed: 0,
        scheduled: 0,
        cancelled: 0,
      }
    : null;

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCase || !newNoteText.trim() || isReadOnly) return;
    setSavingNote(true);
    setNoteError(null);
    onSaveStatusChange("saving");

    try {
      const res = await fetch(`/api/cases/${selectedCase.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newNoteText.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        onSaveStatusChange("failed");
        setNoteError(data.error || "เพิ่มหมายเหตุไม่สำเร็จ");
        return;
      }
      onSaveStatusChange("saved");
      setNewNoteText("");
      if (onCaseSaved && data.case) {
        onCaseSaved(data.case as CaseWithRelations);
      } else {
        await onRefresh();
      }
    } catch {
      onSaveStatusChange("failed");
      setNoteError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setSavingNote(false);
    }
  }

  function getCourtLevelBadgeClass(level?: CourtLevel) {
    switch (level) {
      case "appeal":
        return "bg-amber-100 text-amber-950 border-amber-300";
      case "supreme":
        return "bg-purple-100 text-purple-950 border-purple-300";
      case "first_instance":
      default:
        return "bg-sky-100 text-sky-950 border-sky-300";
    }
  }

  const selectedNoteEntries: CaseNoteEntry[] = useMemo(() => {
    if (!selectedCase) return [];
    if (selectedCase.case_notes && selectedCase.case_notes.length > 0) {
      return selectedCase.case_notes;
    }
    if (selectedCase.notes?.trim()) {
      return [
        {
          id: "legacy",
          content: selectedCase.notes,
          created_by: selectedCase.created_by,
          created_by_name: "บันทึกเดิม",
          created_at: selectedCase.created_at,
        },
      ];
    }
    return [];
  }, [selectedCase]);

  return (
    <div className="space-y-5">
      {/* Header & Search */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#0f294a]">ระบบข้อมูลคดี</h1>
            <p className="text-slate-600 text-base">
              ค้นหาคดี ตรวจสอบคู่ความแบบมีลำดับ ชั้นศาล จำนวนนัดหมาย และบันทึกหมายเหตุคดี
            </p>
          </div>
          {!isReadOnly && (
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
          )}
        </div>

        {/* Global Case Search */}
        <div className="relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-4" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหาคดี เลขคดีดำ ชื่อโจทก์ ชื่อจำเลย เบอร์โทรลูกความ หรือชื่อศาล..."
            className="input-legal w-full pl-12 pr-4 border border-slate-300 focus:border-[#0f294a] focus:outline-none"
          />
        </div>

        {/* Advanced Search Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <SearchableSelect
            value={filterCourt}
            onChange={setFilterCourt}
            placeholder="เลือกศาล..."
            searchPlaceholder="ค้นหาชื่อศาล..."
            allowClearOption={{ value: "all", label: "ศาลทั้งหมด" }}
            options={activeCourtsOptions}
          />

          <SearchableSelect
            value={filterCat}
            onChange={setFilterCat}
            placeholder="อักษรย่อ..."
            searchPlaceholder="พิมพ์อักษรย่อ..."
            allowClearOption={{ value: "all", label: "อักษรย่อทั้งหมด" }}
            options={activeCategoryOptions}
          />

          <input
            type="text"
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            placeholder="ปีคดี (พ.ศ.) เช่น 2569"
            className="input-legal px-3 border border-slate-300"
          />

          <select
            value={filterCourtLevel}
            onChange={(e) => setFilterCourtLevel(e.target.value)}
            className="input-legal px-3 border border-slate-300 bg-white"
          >
            <option value="all">ทุกชั้นศาล</option>
            <option value="first_instance">ศาลชั้นต้น</option>
            <option value="appeal">ชั้นอุทธรณ์</option>
            <option value="supreme">ชั้นฎีกา</option>
          </select>

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
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 font-bold text-[#0f294a]">
            รายการคดี ({filteredCases.length} คดี)
          </div>

          {filteredCases.length === 0 ? (
            <div className="p-8 text-center text-slate-500">ไม่พบข้อมูลคดีที่ค้นหา</div>
          ) : (
            <div className="divide-y divide-slate-200">
              {filteredCases.map((c) => {
                const stats = appointmentStatsByCase.get(c.id);
                const apptCount = stats?.activeCount ?? 0;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setSelectedCaseId(c.id);
                      setNoteError(null);
                    }}
                    className={`w-full text-left p-4 hover:bg-slate-50 transition cursor-pointer ${
                      selectedCase?.id === c.id ? "bg-blue-50/70" : ""
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-lg font-bold text-[#0f294a]">
                        {c.formatted_case_number}
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`text-xs font-bold px-2.5 py-0.5 rounded-md border ${getCourtLevelBadgeClass(
                            c.court_level
                          )}`}
                        >
                          {getCourtLevelLabel(c.court_level)}
                        </span>
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-slate-100 border border-slate-300 text-slate-800">
                          {getCaseStatusLabel(c.status)}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-md bg-[#0f294a]/10 text-[#0f294a]">
                          <CalendarCheck className="w-3.5 h-3.5" />
                          นัดแล้ว {apptCount} ครั้ง
                        </span>
                      </div>
                    </div>

                    <div className="text-base font-semibold text-slate-800 mt-1">
                      {c.court?.name || "-"}
                    </div>

                    <div className="text-sm text-slate-600 mt-1 space-y-0.5">
                      <div>
                        <strong>โจทก์:</strong>{" "}
                        {formatPartiesSummary(c.plaintiffs, c.plaintiff_name)}
                      </div>
                      <div>
                        <strong>จำเลย:</strong>{" "}
                        {formatPartiesSummary(c.defendants, c.defendant_name)}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Case Detail Panel */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
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
                  <p className="text-slate-700 font-semibold">{selectedCase.court?.name}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-md border ${getCourtLevelBadgeClass(
                        selectedCase.court_level
                      )}`}
                    >
                      {getCourtLevelLabel(selectedCase.court_level)}
                    </span>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 border border-slate-300 text-slate-800">
                      {getCaseStatusLabel(selectedCase.status)}
                    </span>
                    {selectedCase.our_role && (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-blue-50 border border-blue-200 text-blue-900">
                        {getOurRoleLabel(selectedCase.our_role)}
                      </span>
                    )}
                  </div>
                </div>
                {!isReadOnly && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCase(selectedCase);
                      setShowCaseForm(true);
                    }}
                    className="px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-sm font-semibold cursor-pointer shrink-0"
                  >
                    แก้ไขข้อมูลคดี
                  </button>
                )}
              </div>

              {/* Ordered Plaintiffs & Defendants */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-sm sm:text-base">
                <div>
                  <strong className="text-slate-700">โจทก์ (ตามลำดับ):</strong>
                  {selectedCase.plaintiffs && selectedCase.plaintiffs.length > 0 ? (
                    <ul className="mt-1 space-y-0.5 pl-1">
                      {[...selectedCase.plaintiffs]
                        .sort((a, b) => a.order - b.order)
                        .map((p, i) => (
                          <li key={i} className="text-slate-900 font-medium">
                            {p.order}. {p.name}
                          </li>
                        ))}
                    </ul>
                  ) : (
                    <div className="text-slate-900 mt-0.5">
                      1. {selectedCase.plaintiff_name}
                    </div>
                  )}
                </div>

                <div>
                  <strong className="text-slate-700">จำเลย (ตามลำดับ):</strong>
                  {selectedCase.defendants && selectedCase.defendants.length > 0 ? (
                    <ul className="mt-1 space-y-0.5 pl-1">
                      {[...selectedCase.defendants]
                        .sort((a, b) => a.order - b.order)
                        .map((d, i) => (
                          <li key={i} className="text-slate-900 font-medium">
                            {d.order}. {d.name}
                          </li>
                        ))}
                    </ul>
                  ) : (
                    <div className="text-slate-900 mt-0.5">
                      1. {selectedCase.defendant_name}
                    </div>
                  )}
                </div>

                <div>
                  <strong className="text-slate-700">ผู้รับผิดชอบ:</strong>{" "}
                  {selectedCase.responsible_user?.full_name || "-"}
                </div>

                {!isReadOnly && (selectedCase.client_phone || selectedCase.client_contact_name) && (
                  <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center gap-2">
                    <Phone className="w-4 h-4 text-[#0f294a]" />
                    <strong className="text-slate-700">ลูกความ:</strong>
                    {selectedCase.client_contact_name && (
                      <span>{selectedCase.client_contact_name}</span>
                    )}
                    {selectedCase.client_phone && (
                      <a
                        href={`tel:${selectedCase.client_phone}`}
                        className="font-bold text-[#0f294a] underline hover:text-blue-700"
                      >
                        {selectedCase.client_phone}
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* Appointment Count Summary */}
              {selectedStats && (
                <div className="p-3.5 rounded-xl bg-[#0f294a]/5 border border-[#0f294a]/20 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-bold text-[#0f294a]">
                    <CalendarCheck className="w-5 h-5" />
                    <span>มีกำหนดนัดมาแล้ว {selectedStats.activeCount} ครั้ง</span>
                  </div>
                  <div className="text-xs font-semibold text-slate-600">
                    เสร็จสิ้น {selectedStats.completed} • กำหนดการ {selectedStats.scheduled}
                    {selectedStats.cancelled > 0 && ` • ยกเลิก ${selectedStats.cancelled}`}
                  </div>
                </div>
              )}

              {!isReadOnly && (
                <button
                  type="button"
                  onClick={() => onAddAppointmentForCase(selectedCase)}
                  className="btn-legal w-full bg-[#0f294a] hover:bg-[#173b69] text-white inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CalendarPlus className="w-5 h-5" />
                  <span>เพิ่มนัดหมายจากคดีนี้</span>
                </button>
              )}

              {/* Multi-entry Case Notes Timeline */}
              <div className="pt-3 border-t border-slate-200 space-y-3">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <MessageSquarePlus className="w-4 h-4 text-[#0f294a]" />
                  <span>หมายเหตุคดี ({selectedNoteEntries.length})</span>
                </h3>

                {!isReadOnly && (
                  <form onSubmit={handleAddNote} className="space-y-2">
                    {noteError && (
                      <div className="text-xs text-red-700 font-semibold">{noteError}</div>
                    )}
                    <textarea
                      rows={2}
                      value={newNoteText}
                      onChange={(e) => setNewNoteText(e.target.value)}
                      placeholder="พิมพ์หมายเหตุเพิ่มเติม (บันทึกได้หลายครั้ง)..."
                      className="w-full p-2.5 rounded-xl border border-slate-300 text-sm focus:border-[#0f294a] focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={savingNote || !newNoteText.trim()}
                      className="px-4 py-2 rounded-lg bg-[#0f294a] hover:bg-[#173b69] text-white text-sm font-semibold cursor-pointer disabled:opacity-50"
                    >
                      {savingNote ? "กำลังเพิ่ม..." : "+ เพิ่มหมายเหตุ"}
                    </button>
                  </form>
                )}

                {selectedNoteEntries.length === 0 ? (
                  <p className="text-slate-500 text-sm">ยังไม่มีหมายเหตุ</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {selectedNoteEntries.map((n) => (
                      <div
                        key={n.id}
                        className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-sm space-y-1"
                      >
                        <div className="text-slate-800 whitespace-pre-wrap">{n.content}</div>
                        <div className="text-xs text-slate-500">
                          {n.created_by_name} • {formatThaiDateTime(n.created_at)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Appointments History */}
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
                          {formatTime24(a.start_time)} — {a.title}
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

      {showCaseForm && currentUser && (
        <CaseFormModal
          initialCase={editingCase}
          courtOptions={activeCourtsOptions}
          categoryOptions={activeCategoryOptions}
          users={users}
          currentUser={currentUser}
          onClose={() => setShowCaseForm(false)}
          onOpenExisting={(existing) => {
            setShowCaseForm(false);
            setSelectedCaseId(existing.id);
          }}
          onSaved={(saved) => {
            if (onCaseSaved && saved) {
              onCaseSaved(saved);
              setSelectedCaseId(saved.id);
            } else {
              onRefresh();
            }
            setShowCaseForm(false);
          }}
          onDeleted={(deletedId) => {
            if (onCaseDeleted) {
              onCaseDeleted(deletedId);
            } else {
              onRefresh();
            }
            setSelectedCaseId(null);
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
  courtOptions,
  categoryOptions,
  users,
  currentUser,
  onClose,
  onOpenExisting,
  onSaved,
  onDeleted,
  onSaveStatusChange,
}: {
  initialCase: CaseWithRelations | null;
  courtOptions: { value: string; label: string; searchText?: string }[];
  categoryOptions: { value: string; label: string; searchText?: string }[];
  users: User[];
  currentUser: User;
  onClose: () => void;
  onOpenExisting: (c: CaseWithRelations) => void;
  onSaved: (saved?: CaseWithRelations) => void;
  onDeleted: (deletedId: string) => void;
  onSaveStatusChange: (s: "saving" | "saved" | "failed") => void;
}) {
  const isEditing = Boolean(initialCase);
  const [courtId, setCourtId] = useState(initialCase?.court_id || "");
  const [categoryId, setCategoryId] = useState(initialCase?.category_id || "");
  const [blackCaseNumber, setBlackCaseNumber] = useState(
    initialCase?.black_case_number || ""
  );
  const [caseYear, setCaseYear] = useState(initialCase?.case_year || 2569);

  const [plaintiffs, setPlaintiffs] = useState<CaseParty[]>(() => {
    if (initialCase?.plaintiffs && initialCase.plaintiffs.length > 0) {
      return initialCase.plaintiffs;
    }
    return [{ order: 1, name: initialCase?.plaintiff_name || "" }];
  });
  const [defendants, setDefendants] = useState<CaseParty[]>(() => {
    if (initialCase?.defendants && initialCase.defendants.length > 0) {
      return initialCase.defendants;
    }
    return [{ order: 1, name: initialCase?.defendant_name || "" }];
  });

  const [ourRole, setOurRole] = useState<OurRole>(
    initialCase?.our_role || "plaintiff_lawyer"
  );
  const [courtLevel, setCourtLevel] = useState<CourtLevel>(
    initialCase?.court_level || "first_instance"
  );
  const [responsibleUserId, setResponsibleUserId] = useState(
    initialCase?.responsible_user_id || currentUser.id
  );
  const [status, setStatus] = useState<CaseStatus>(initialCase?.status || "active");
  const [clientContactName, setClientContactName] = useState(
    initialCase?.client_contact_name || ""
  );
  const [clientPhone, setClientPhone] = useState(initialCase?.client_phone || "");
  const [initialNote, setInitialNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [duplicateCase, setDuplicateCase] = useState<CaseWithRelations | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function updatePartyRow(
    list: CaseParty[],
    setter: React.Dispatch<React.SetStateAction<CaseParty[]>>,
    idx: number,
    patch: Partial<CaseParty>
  ) {
    setter(list.map((item, i) => (i === idx ? { ...item, ...patch } : item)));
  }

  function addPartyRow(
    list: CaseParty[],
    setter: React.Dispatch<React.SetStateAction<CaseParty[]>>
  ) {
    const nextOrder =
      list.length > 0 ? Math.max(...list.map((p) => p.order)) + 1 : 1;
    setter([...list, { order: nextOrder, name: "" }]);
  }

  function removePartyRow(
    list: CaseParty[],
    setter: React.Dispatch<React.SetStateAction<CaseParty[]>>,
    idx: number
  ) {
    if (list.length <= 1) return;
    setter(list.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!courtId) {
      setError("กรุณาเลือกศาล");
      return;
    }
    if (!categoryId) {
      setError("กรุณาเลือกอักษรย่อประเภทคดี");
      return;
    }

    const cleanPlaintiffs = plaintiffs
      .filter((p) => p.name.trim() !== "")
      .map((p) => ({ order: Number(p.order) || 1, name: p.name.trim() }));
    const cleanDefendants = defendants
      .filter((d) => d.name.trim() !== "")
      .map((d) => ({ order: Number(d.order) || 1, name: d.name.trim() }));

    if (cleanPlaintiffs.length === 0) {
      setError("กรุณากรอกชื่อโจทก์อย่างน้อย 1 รายชื่อ");
      return;
    }
    if (cleanDefendants.length === 0) {
      setError("กรุณากรอกชื่อจำเลยอย่างน้อย 1 รายชื่อ");
      return;
    }

    setSubmitting(true);
    setError(null);
    setDuplicateCase(null);
    onSaveStatusChange("saving");

    try {
      const existingNotes = initialCase?.case_notes || [];
      const nextCaseNotes: CaseNoteEntry[] = initialNote.trim()
        ? [
            {
              id: crypto.randomUUID(),
              content: initialNote.trim(),
              created_by: currentUser.id,
              created_by_name: currentUser.full_name,
              created_at: new Date().toISOString(),
            },
            ...existingNotes,
          ]
        : existingNotes;

      const url = isEditing ? `/api/cases/${initialCase!.id}` : "/api/cases";
      const res = await fetch(url, {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          court_id: courtId,
          category_id: categoryId,
          black_case_number: blackCaseNumber,
          case_year: Number(caseYear),
          plaintiffs: cleanPlaintiffs,
          defendants: cleanDefendants,
          plaintiff_name: formatPartiesSummary(cleanPlaintiffs),
          defendant_name: formatPartiesSummary(cleanDefendants),
          our_role: ourRole,
          court_level: courtLevel,
          responsible_user_id: responsibleUserId,
          status,
          client_contact_name: clientContactName,
          client_phone: clientPhone,
          case_notes: nextCaseNotes,
          notes: initialNote.trim() || initialCase?.notes || "",
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
      onSaved(data.case as CaseWithRelations);
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
      onDeleted(initialCase.id);
    } catch {
      onSaveStatusChange("failed");
      setError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[2px] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl my-6 overflow-hidden">
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

        <form
          onSubmit={handleSubmit}
          className="p-6 space-y-5 max-h-[82vh] overflow-y-auto bg-slate-50/40"
        >
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

          {/* 1. ศาล และเลขคดี (แสดงเฉพาะตัวอักษรย่อ) */}
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-4">
            <div>
              <label className="block font-semibold mb-1.5">ศาล</label>
              <SearchableSelect
                value={courtId}
                onChange={setCourtId}
                placeholder="เลือกศาล..."
                searchPlaceholder="ค้นหาชื่อศาล..."
                options={courtOptions}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-semibold mb-1.5">อักษรย่อ</label>
                <SearchableSelect
                  value={categoryId}
                  onChange={setCategoryId}
                  placeholder="เลือกอักษรย่อ..."
                  searchPlaceholder="พิมพ์อักษรย่อ..."
                  options={categoryOptions}
                />
              </div>

              <div>
                <label className="block font-semibold mb-1.5">หมายเลขคดีดำ</label>
                <input
                  type="text"
                  required
                  value={blackCaseNumber}
                  onChange={(e) => setBlackCaseNumber(e.target.value)}
                  placeholder="เช่น 123"
                  className="input-legal w-full px-4 border border-slate-300 focus:border-[#0f294a] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1.5">ปี (พ.ศ.)</label>
                <input
                  type="number"
                  required
                  value={caseYear}
                  onChange={(e) => setCaseYear(Number(e.target.value))}
                  className="input-legal w-full px-4 border border-slate-300 focus:border-[#0f294a] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* 2. โจทก์และจำเลย (แบบมีลำดับ) */}
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-800">
                  รายชื่อโจทก์ (ตามลำดับ)
                </label>
                <button
                  type="button"
                  onClick={() => addPartyRow(plaintiffs, setPlaintiffs)}
                  className="text-sm font-semibold text-[#0f294a] hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>เพิ่มโจทก์</span>
                </button>
              </div>
              {plaintiffs.map((p, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    value={p.order}
                    onChange={(e) =>
                      updatePartyRow(plaintiffs, setPlaintiffs, idx, {
                        order: Number(e.target.value) || 1,
                      })
                    }
                    className="input-legal w-20 px-3 border border-slate-300 text-center font-semibold"
                    aria-label="ลำดับโจทก์"
                  />
                  <input
                    type="text"
                    required
                    value={p.name}
                    onChange={(e) =>
                      updatePartyRow(plaintiffs, setPlaintiffs, idx, {
                        name: e.target.value,
                      })
                    }
                    placeholder={`ชื่อโจทก์ลำดับที่ ${p.order}`}
                    className="input-legal flex-1 px-4 border border-slate-300"
                  />
                  {plaintiffs.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePartyRow(plaintiffs, setPlaintiffs, idx)}
                      className="p-2.5 rounded-lg text-red-600 hover:bg-red-50 cursor-pointer"
                      aria-label="ลบโจทก์"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-800">
                  รายชื่อจำเลย (ตามลำดับ)
                </label>
                <button
                  type="button"
                  onClick={() => addPartyRow(defendants, setDefendants)}
                  className="text-sm font-semibold text-[#0f294a] hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>เพิ่มจำเลย</span>
                </button>
              </div>
              {defendants.map((d, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    value={d.order}
                    onChange={(e) =>
                      updatePartyRow(defendants, setDefendants, idx, {
                        order: Number(e.target.value) || 1,
                      })
                    }
                    className="input-legal w-20 px-3 border border-slate-300 text-center font-semibold"
                    aria-label="ลำดับจำเลย"
                  />
                  <input
                    type="text"
                    required
                    value={d.name}
                    onChange={(e) =>
                      updatePartyRow(defendants, setDefendants, idx, {
                        name: e.target.value,
                      })
                    }
                    placeholder={`ชื่อจำเลยลำดับที่ ${d.order}`}
                    className="input-legal flex-1 px-4 border border-slate-300"
                  />
                  {defendants.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePartyRow(defendants, setDefendants, idx)}
                      className="p-2.5 rounded-lg text-red-600 hover:bg-red-50 cursor-pointer"
                      aria-label="ลบจำเลย"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 3. ชั้นศาล สถานะ ความเกี่ยวข้อง และเบอร์โทรลูกความ */}
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold mb-1.5">
                ชั้นศาล (ชั้นต้น – ฎีกา)
              </label>
              <select
                value={courtLevel}
                onChange={(e) => setCourtLevel(e.target.value as CourtLevel)}
                className="input-legal w-full px-3 border border-slate-300 bg-white"
              >
                <option value="first_instance">ศาลชั้นต้น</option>
                <option value="appeal">ชั้นอุทธรณ์</option>
                <option value="supreme">ชั้นฎีกา</option>
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

            <div>
              <label className="block font-semibold mb-1.5">ความเกี่ยวข้องของเรา</label>
              <select
                value={ourRole}
                onChange={(e) => setOurRole(e.target.value as OurRole)}
                className="input-legal w-full px-3 border border-slate-300 bg-white"
              >
                <option value="plaintiff_lawyer">ทนายโจทก์</option>
                <option value="defendant_lawyer">ทนายจำเลย</option>
                <option value="other">อื่น ๆ</option>
              </select>
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
              <label className="block font-semibold mb-1.5">ชื่อลูกความ / ผู้ติดต่อ</label>
              <input
                type="text"
                value={clientContactName}
                onChange={(e) => setClientContactName(e.target.value)}
                placeholder="เช่น คุณสมชาย (ผู้ติดต่อ)"
                className="input-legal w-full px-4 border border-slate-300"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1.5">เบอร์โทรลูกความ</label>
              <input
                type="tel"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="เช่น 081-234-5678"
                className="input-legal w-full px-4 border border-slate-300"
              />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
            <label className="block font-semibold mb-1.5">
              {isEditing ? "เพิ่มหมายเหตุใหม่ (บันทึกเพิ่มจากของเดิม)" : "หมายเหตุคดี"}
            </label>
            <textarea
              rows={2}
              value={initialNote}
              onChange={(e) => setInitialNote(e.target.value)}
              placeholder="พิมพ์หมายเหตุเพิ่มเติม..."
              className="w-full p-3 rounded-xl border border-slate-300"
            />
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
            {isEditing ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={submitting}
                className="btn-legal px-4 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 inline-flex items-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>ลบคดี</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-3">
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
                className="btn-legal px-6 bg-[#0f294a] hover:bg-[#173b69] text-white cursor-pointer"
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
