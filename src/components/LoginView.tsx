"use client";

import React, { useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Lock,
  Mail,
  Scale,
  User,
  X,
} from "lucide-react";

export function LoginView({
  onSuccess,
  onClose,
  asModal = false,
}: {
  onSuccess: () => void;
  onClose?: () => void;
  asModal?: boolean;
}) {
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localResetReady, setLocalResetReady] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);

    try {
      if (mode === "login") {
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
      } else if (mode === "register") {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ full_name: fullName, email, password }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "สมัครใช้งานไม่สำเร็จ");
          return;
        }
        if (data.needsEmailConfirmation) {
          setNotice(
            "สมัครใช้งานสำเร็จ! กรุณาตรวจสอบอีเมลเพื่อยืนยันบัญชี แล้วกลับมาเข้าสู่ระบบ"
          );
          setMode("login");
        } else {
          onSuccess();
        }
      } else {
        // Forgot password flow
        if (localResetReady) {
          const res = await fetch("/api/auth/reset-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password: newPassword }),
          });
          const data = await res.json();
          if (!res.ok) {
            setError(data.error || "ไม่สามารถเปลี่ยนรหัสผ่านได้");
            return;
          }
          setNotice("เปลี่ยนรหัสผ่านสำเร็จ! กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่");
          setLocalResetReady(false);
          setNewPassword("");
          setMode("login");
          return;
        }

        const res = await fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "ไม่สามารถส่งคำขอรีเซ็ตรหัสผ่านได้");
          return;
        }
        if (data.mode === "local") {
          setLocalResetReady(true);
          setNotice(data.message);
        } else {
          setNotice(
            data.message ||
              "ส่งลิงก์รีเซ็ตรหัสผ่านไปยังอีเมลของคุณแล้ว กรุณาตรวจสอบกล่องจดหมาย"
          );
        }
      }
    } catch {
      setError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาตรวจสอบอินเทอร์เน็ต");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className={
        asModal
          ? "fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[2px] flex items-end sm:items-center justify-center p-2 sm:p-4 overflow-y-auto"
          : "min-h-screen flex items-center justify-center bg-slate-100 p-4"
      }
    >
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-lg p-6 sm:p-8 relative">
        {asModal && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 p-2 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
            aria-label="ปิดหน้าต่างเข้าสู่ระบบ"
          >
            <X className="w-5 h-5" />
          </button>
        )}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-[#0f294a] text-white flex items-center justify-center shrink-0">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#0f294a]">Lawyer Calendar</h1>
            <p className="text-slate-600 text-sm sm:text-base">
              ระบบปฏิทินนัดหมายกลางสำนักงานทนายความ
            </p>
          </div>
        </div>

        {/* Mode Switch Tabs: Sign In / Sign Up */}
        {mode !== "forgot" ? (
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError(null);
                setNotice(null);
              }}
              className={`py-2.5 rounded-lg font-semibold text-base transition cursor-pointer ${
                mode === "login"
                  ? "bg-white text-[#0f294a] shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              เข้าสู่ระบบ
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setError(null);
                setNotice(null);
              }}
              className={`py-2.5 rounded-lg font-semibold text-base transition cursor-pointer ${
                mode === "register"
                  ? "bg-white text-[#0f294a] shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              สมัครใช้งาน
            </button>
          </div>
        ) : (
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#0f294a]">รีเซ็ตรหัสผ่าน</h2>
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setLocalResetReady(false);
                setError(null);
                setNotice(null);
              }}
              className="text-sm font-semibold text-[#0f294a] hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>กลับไปเข้าสู่ระบบ</span>
            </button>
          </div>
        )}

        {error && (
          <div className="mb-5 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {notice && (
          <div className="mb-5 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{notice}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
            <div>
              <label className="block font-semibold text-slate-800 mb-1.5">
                ชื่อ-นามสกุล
              </label>
              <div className="relative">
                <User className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="input-legal w-full pl-11 pr-4 border border-slate-300 focus:border-[#0f294a] focus:outline-none"
                  placeholder="เช่น ทนายสมชาย วัฒนากูล"
                  autoComplete="name"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-800 mb-1.5">
              อีเมลผู้ใช้งาน
            </label>
            <div className="relative">
              <Mail className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="email"
                required
                disabled={mode === "forgot" && localResetReady}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-legal w-full pl-11 pr-4 border border-slate-300 focus:border-[#0f294a] focus:outline-none disabled:bg-slate-50"
                placeholder="name@lawfirm.th"
                autoComplete="email"
              />
            </div>
          </div>

          {mode !== "forgot" && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block font-semibold text-slate-800">
                  รหัสผ่าน {mode === "register" && "(อย่างน้อย 6 ตัวอักษร)"}
                </label>
                {mode === "login" && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode("forgot");
                      setError(null);
                      setNotice(null);
                    }}
                    className="text-sm font-semibold text-[#0f294a] hover:underline cursor-pointer"
                  >
                    ลืมรหัสผ่าน?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  minLength={mode === "register" ? 6 : 4}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-legal w-full pl-11 pr-4 border border-slate-300 focus:border-[#0f294a] focus:outline-none"
                  placeholder="กรอกรหัสผ่าน"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                />
              </div>
            </div>
          )}

          {mode === "forgot" && localResetReady && (
            <div>
              <label className="block font-semibold text-slate-800 mb-1.5">
                รหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input-legal w-full pl-11 pr-4 border border-slate-300 focus:border-[#0f294a] focus:outline-none"
                  placeholder="กรอกรหัสผ่านใหม่"
                  autoComplete="new-password"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-legal w-full bg-[#0f294a] hover:bg-[#173b69] text-white text-lg disabled:opacity-60 cursor-pointer"
          >
            {loading
              ? "กำลังดำเนินการ..."
              : mode === "login"
              ? "เข้าสู่ระบบ"
              : mode === "register"
              ? "สมัครใช้งาน"
              : localResetReady
              ? "บันทึกรหัสผ่านใหม่"
              : "ส่งลิงก์รีเซ็ตรหัสผ่าน"}
          </button>
        </form>
      </div>
    </div>
  );
}
