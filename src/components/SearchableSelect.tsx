"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Search } from "lucide-react";

export interface SearchableOption {
  value: string;
  label: string;
  searchText?: string;
}

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SearchableOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
  allowClearOption?: { value: string; label: string };
}

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "เลือก...",
  searchPlaceholder = "พิมพ์เพื่อค้นหา...",
  emptyText = "ไม่พบรายการที่ค้นหา",
  className = "",
  allowClearOption,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const selectedOption = useMemo(() => {
    if (allowClearOption && value === allowClearOption.value) {
      return allowClearOption;
    }
    return options.find((o) => o.value === value) || null;
  }, [options, value, allowClearOption]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => {
      const target = (o.searchText || o.label).toLowerCase();
      return target.includes(q);
    });
  }, [options, query]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="input-legal w-full px-4 border border-slate-300 bg-white flex items-center justify-between gap-2 text-left focus:border-[#0f294a] focus:outline-none cursor-pointer"
      >
        <span className={selectedOption ? "text-slate-900 truncate" : "text-slate-400 truncate"}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        {open ? (
          <ChevronUp className="w-5 h-5 text-slate-500 shrink-0" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-500 shrink-0" />
        )}
      </button>

      {open && (
        <div className="absolute z-50 mt-1.5 w-full bg-white border border-slate-300 rounded-xl shadow-lg overflow-hidden">
          <div className="p-2.5 border-b border-slate-200 bg-white">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-300 text-base focus:border-[#0f294a] focus:outline-none"
              />
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
            {allowClearOption && !query.trim() && (
              <button
                type="button"
                onClick={() => {
                  onChange(allowClearOption.value);
                  setOpen(false);
                }}
                className={`w-full text-left px-4 py-2.5 text-base hover:bg-slate-100 cursor-pointer ${
                  value === allowClearOption.value
                    ? "bg-slate-100 font-semibold text-[#0f294a]"
                    : "text-slate-600"
                }`}
              >
                {allowClearOption.label}
              </button>
            )}

            {filtered.length === 0 ? (
              <div className="px-4 py-4 text-sm text-slate-500 text-center">
                {emptyText}
              </div>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-base hover:bg-slate-100 cursor-pointer ${
                    value === opt.value
                      ? "bg-slate-100 font-semibold text-[#0f294a]"
                      : "text-slate-800"
                  }`}
                >
                  {opt.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
