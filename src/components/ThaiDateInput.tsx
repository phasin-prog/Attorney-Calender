"use client";

import React, { useMemo } from "react";
import { Calendar } from "lucide-react";
import { formatThaiDate, getBangkokToday, THAI_MONTHS } from "@/lib/thai-date";

interface ThaiDateInputProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  disabled?: boolean;
  showTodayButton?: boolean;
  showDayPreview?: boolean;
  className?: string;
}

function daysInMonth(ceYear: number, month1Based: number): number {
  return new Date(ceYear, month1Based, 0).getDate();
}

export function ThaiDateInput({
  value,
  onChange,
  disabled = false,
  showTodayButton = true,
  showDayPreview = true,
  className = "",
}: ThaiDateInputProps) {
  const todayStr = getBangkokToday();
  const effective = value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : todayStr;
  const [ceYear, month, day] = effective.split("-").map(Number);
  const beYear = ceYear + 543;

  const maxDay = useMemo(() => daysInMonth(ceYear, month), [ceYear, month]);

  const yearOptions = useMemo(() => {
    const currentCe = Number(todayStr.slice(0, 4));
    const currentBe = currentCe + 543;
    const set = new Set<number>();
    for (let y = currentBe - 2; y <= currentBe + 6; y++) {
      set.add(y);
    }
    set.add(beYear);
    return Array.from(set).sort((a, b) => a - b);
  }, [todayStr, beYear]);

  function emit(nextCeYear: number, nextMonth: number, nextDay: number) {
    const clampedDay = Math.min(nextDay, daysInMonth(nextCeYear, nextMonth));
    const iso = `${String(nextCeYear).padStart(4, "0")}-${String(nextMonth).padStart(
      2,
      "0"
    )}-${String(clampedDay).padStart(2, "0")}`;
    onChange(iso);
  }

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex flex-wrap items-center gap-1.5">
        <select
          aria-label="วัน"
          disabled={disabled}
          value={day}
          onChange={(e) => emit(ceYear, month, Number(e.target.value))}
          className="input-legal px-2.5 border border-slate-300 bg-white focus:border-[#0f294a] focus:outline-none min-w-[68px]"
        >
          {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>

        <select
          aria-label="เดือน"
          disabled={disabled}
          value={month}
          onChange={(e) => emit(ceYear, Number(e.target.value), day)}
          className="input-legal px-2.5 border border-slate-300 bg-white focus:border-[#0f294a] focus:outline-none flex-1 min-w-[120px]"
        >
          {THAI_MONTHS.map((mName, idx) => (
            <option key={mName} value={idx + 1}>
              {mName}
            </option>
          ))}
        </select>

        <select
          aria-label="ปี พ.ศ."
          disabled={disabled}
          value={beYear}
          onChange={(e) => emit(Number(e.target.value) - 543, month, day)}
          className="input-legal px-2.5 border border-slate-300 bg-white focus:border-[#0f294a] focus:outline-none min-w-[92px]"
        >
          {yearOptions.map((y) => (
            <option key={y} value={y}>
              พ.ศ. {y}
            </option>
          ))}
        </select>

        {showTodayButton && !disabled && (
          <button
            type="button"
            onClick={() => onChange(todayStr)}
            className="px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 text-sm font-semibold inline-flex items-center gap-1 cursor-pointer"
            title="เลือกวันนี้"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>วันนี้</span>
          </button>
        )}
      </div>

      {showDayPreview && (
        <div className="text-xs text-slate-600">{formatThaiDate(effective)}</div>
      )}
    </div>
  );
}
