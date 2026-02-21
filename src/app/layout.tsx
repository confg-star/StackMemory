import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
// 临时禁用全局 CSS：修复 Next.js CSS loader 崩溃导致的 500

import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "栈记学习站 (StackMemory Learning) - 你的专属 Agent 学习系统",
  description: "为老板定制学习路线、每日任务、闪卡沉淀与复盘的学习网站",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background`}
      >
        <Header />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 container py-6">
            {children}
          </main>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
