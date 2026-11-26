"use client";

import React, { useMemo } from "react";
import { Clock, X } from "lucide-react";

interface Time24InputProps {
  value: string; // HH:mm or ""
  onChange: (value: string) => void;
  disabled?: boolean;
  showPresets?: boolean;
  className?: string;
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const BASE_MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));
const PRESETS = ["08:30", "09:00", "13:00", "13:30"];

export function Time24Input({
  value,
  onChange,
  disabled = false,
  showPresets = false,
  className = "",
}: Time24InputProps) {
  const [hh, mm] = value && /^\d{2}:\d{2}$/.test(value) ? value.split(":") : ["", ""];

  const minuteOptions = useMemo(() => {
    if (mm && !BASE_MINUTES.includes(mm)) {
      return [...BASE_MINUTES, mm].sort();
    }
    return BASE_MINUTES;
  }, [mm]);

  function handleHourChange(nextH: string) {
    if (!nextH) {
      onChange("");
      return;
    }
    onChange(`${nextH}:${mm || "00"}`);
  }

  function handleMinuteChange(nextM: string) {
    if (!nextM) {
      onChange("");
      return;
    }
    onChange(`${hh || "09"}:${nextM}`);
  }

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center gap-1.5">
        <div className="relative flex items-center gap-1.5 flex-1">
          <Clock className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            aria-label="ชั่วโมง (24 ชั่วโมง)"
            disabled={disabled}
            value={hh}
            onChange={(e) => handleHourChange(e.target.value)}
            className="input-legal px-2.5 border border-slate-300 bg-white focus:border-[#0f294a] focus:outline-none flex-1 min-w-[72px]"
          >
            <option value="">--</option>
            {HOURS.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
          <span className="font-bold text-slate-600">:</span>
          <select
            aria-label="นาที"
            disabled={disabled}
            value={mm}
            onChange={(e) => handleMinuteChange(e.target.value)}
            className="input-legal px-2.5 border border-slate-300 bg-white focus:border-[#0f294a] focus:outline-none flex-1 min-w-[72px]"
          >
            <option value="">--</option>
            {minuteOptions.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <span className="text-sm font-semibold text-slate-600 shrink-0">น.</span>
        </div>

        {value && !disabled && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-500 cursor-pointer"
            title="ล้างเวลา"
            aria-label="ล้างเวลา"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {showPresets && !disabled && (
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onChange(p)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold border cursor-pointer transition ${
                value === p
                  ? "bg-[#0f294a] text-white border-[#0f294a]"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
            >
              {p} น.
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
