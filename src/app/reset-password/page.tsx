"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Lock, Scale } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function initRecovery() {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        if (code && process.env.NEXT_PUBLIC_SUPABASE_URL) {
          const supabase = createSupabaseBrowserClient();
          await supabase.auth.exchangeCodeForSession(code);
        }
      } catch {
        // Ignore if hash/session is already handled by Supabase client
      } finally {
        setChecking(false);
      }
    }
    initRecovery();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร");
      return;
    }
    if (password !== confirmPassword) {
      setError("รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน");
      return;
    }

    setLoading(true);
    try {
      if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
        const supabase = createSupabaseBrowserClient();
        const { error: updateErr } = await supabase.auth.updateUser({ password });
        if (updateErr) {
          setError(
            updateErr.message || "ไม่สามารถตั้งรหัสผ่านใหม่ได้ ลิงก์อาจหมดอายุแล้ว"
          );
          return;
        }
      } else {
        const res = await fetch("/api/auth/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "ไม่สามารถตั้งรหัสผ่านใหม่ได้");
          return;
        }
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/");
      }, 2000);
    } catch {
      setError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-lg p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#0f294a] text-white flex items-center justify-center shrink-0">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#0f294a]">
              ตั้งรหัสผ่านใหม่
            </h1>
            <p className="text-slate-600 text-sm">
              Lawyer Calendar — ระบบกู้คืนรหัสผ่าน
            </p>
          </div>
        </div>

        {checking ? (
          <div className="py-6 text-center text-slate-600">
            กำลังตรวจสอบลิงก์รีเซ็ตรหัสผ่าน...
          </div>
        ) : success ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              <span>
                เปลี่ยนรหัสผ่านสำเร็จแล้ว! กำลังพากลับไปยังหน้าหลัก...
              </span>
            </div>
            <Link
              href="/"
              className="btn-legal w-full bg-[#0f294a] text-white flex items-center justify-center"
            >
              กลับหน้าหลักทันที
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="กรอกรหัสผ่านใหม่"
                  className="input-legal w-full pl-11 pr-4 border border-slate-300 focus:border-[#0f294a] focus:outline-none"
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-800 mb-1.5">
                ยืนยันรหัสผ่านใหม่
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                  className="input-legal w-full pl-11 pr-4 border border-slate-300 focus:border-[#0f294a] focus:outline-none"
                  autoComplete="new-password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-legal w-full bg-[#0f294a] hover:bg-[#173b69] text-white cursor-pointer disabled:opacity-60"
            >
              {loading ? "กำลังบันทึกรหัสผ่านใหม่..." : "บันทึกรหัสผ่านใหม่"}
            </button>

            <div className="text-center pt-1">
              <Link href="/" className="text-sm font-semibold text-[#0f294a] hover:underline">
                กลับไปหน้าหลัก
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
