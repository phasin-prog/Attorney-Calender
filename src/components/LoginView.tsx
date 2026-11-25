"use client";

import React, { useState } from "react";
import { Scale, Lock, Mail, AlertCircle } from "lucide-react";

const DEMO_ACCOUNTS = [
  { label: "ทนายสมชาย (ผู้ดูแลระบบ)", email: "somchai@lawfirm.th" },
  { label: "ทนายวิภาวี", email: "wipawee@lawfirm.th" },
  { label: "ทนายธนกร", email: "thanakorn@lawfirm.th" },
  { label: "ทนายนภัสสร", email: "napassorn@lawfirm.th" },
  { label: "กมลวรรณ (เจ้าหน้าที่)", email: "kamonwan@lawfirm.th" },
];

export function LoginView({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState("somchai@lawfirm.th");
  const [password, setPassword] = useState("123456");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "เข้าสู่ระบบไม่สำเร็จ");
        return;
      }
      onSuccess();
    } catch {
      setError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาตรวจสอบอินเทอร์เน็ต");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-lg bg-white rounded-xl border border-slate-200 shadow-sm p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-[#0f294a] text-white flex items-center justify-center">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#0f294a]">Lawyer Calendar</h1>
            <p className="text-slate-600 text-base">
              ระบบปฏิทินนัดหมายกลางสำนักงานทนายความ
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-5 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-semibold text-slate-800 mb-1.5">
              อีเมลผู้ใช้งาน
            </label>
            <div className="relative">
              <Mail className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-legal w-full pl-11 pr-4 border border-slate-300 focus:border-[#0f294a] focus:outline-none"
                placeholder="name@lawfirm.th"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-800 mb-1.5">
              รหัสผ่าน
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-legal w-full pl-11 pr-4 border border-slate-300 focus:border-[#0f294a] focus:outline-none"
                placeholder="กรอกรหัสผ่าน"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-legal w-full bg-[#0f294a] hover:bg-[#173b69] text-white text-lg disabled:opacity-60 cursor-pointer"
          >
            {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </button>
        </form>

        <div className="mt-7 pt-6 border-t border-slate-200">
          <p className="text-sm font-semibold text-slate-600 mb-2.5">
            บัญชีผู้ใช้งานสำนักงาน (5 บัญชี — รหัสผ่านเริ่มต้น: 123456)
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.email}
                type="button"
                onClick={() => {
                  setEmail(acc.email);
                  setPassword("123456");
                }}
                className={`text-left px-3 py-2.5 rounded-lg border text-sm transition cursor-pointer ${
                  email === acc.email
                    ? "border-[#0f294a] bg-slate-50 font-semibold text-[#0f294a]"
                    : "border-slate-200 hover:bg-slate-50 text-slate-700"
                }`}
              >
                {acc.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
