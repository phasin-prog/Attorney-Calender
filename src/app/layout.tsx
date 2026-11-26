import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { IBM_Plex_Sans_Thai, Sarabun } from "next/font/google";
import "./globals.css";

const ibmPlexSansThai = IBM_Plex_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex-thai",
});

const sarabun = Sarabun({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sarabun",
});

export const metadata: Metadata = {
  title: "Lawyer Calendar | ระบบปฏิทินนัดหมายสำนักงานทนายความ",
  description:
    "ระบบจัดการปฏิทินนัดหมายกลาง ข้อมูลคดี และการแจ้งเตือนสำหรับสำนักงานทนายความ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className={`${ibmPlexSansThai.variable} ${sarabun.variable}`}>
      <body
        className="min-h-screen bg-[#f8fafc] text-slate-900"
        style={{ fontFamily: "var(--font-ibm-plex-thai), var(--font-sarabun), sans-serif" }}
      >
        <ClerkProvider>
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}