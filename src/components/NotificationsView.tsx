"use client";

import React from "react";
import { Bell, Check, CheckCheck } from "lucide-react";
import { formatThaiDateTime } from "@/lib/thai-date";
import type { Notification } from "@/types/domain";

interface NotificationsViewProps {
  notifications: Notification[];
  onRefresh: () => Promise<void>;
}

export function NotificationsView({
  notifications,
  onRefresh,
}: NotificationsViewProps) {
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  async function markRead(id?: string) {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(id ? { id } : { all: true }),
    });
    await onRefresh();
  }

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0f294a]">การแจ้งเตือน</h1>
          <p className="text-slate-600 text-base">
            แจ้งเตือนภายในระบบ (ค่าเริ่มต้น: ล่วงหน้า 1 วัน และเช้าวันนัดเวลา 07:00 น.) •
            ยังไม่ได้อ่าน {unreadCount} รายการ
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={() => markRead()}
            className="btn-legal px-5 bg-[#0f294a] hover:bg-[#173b69] text-white inline-flex items-center gap-2 cursor-pointer"
          >
            <CheckCheck className="w-5 h-5" />
            <span>อ่านทั้งหมด</span>
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-200 overflow-hidden">
        {notifications.length === 0 ? (
          <div className="p-10 text-center text-slate-500 space-y-2">
            <Bell className="w-10 h-10 mx-auto text-slate-300" />
            <p>ไม่มีรายการแจ้งเตือน</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                n.is_read ? "bg-white" : "bg-blue-50/50"
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {!n.is_read && (
                    <span className="px-2 py-0.5 rounded bg-[#0f294a] text-white text-xs font-bold">
                      ใหม่
                    </span>
                  )}
                  <h2 className="text-lg font-bold text-slate-900">{n.title}</h2>
                </div>
                <p className="text-slate-700 text-base">{n.message}</p>
                <p className="text-sm text-slate-500">
                  {formatThaiDateTime(n.created_at)}
                </p>
              </div>

              {!n.is_read && (
                <button
                  type="button"
                  onClick={() => markRead(n.id)}
                  className="btn-legal px-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>ทำเครื่องหมายว่าอ่านแล้ว</span>
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
