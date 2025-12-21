// file: src/app/layout.tsx
import type { Metadata } from "next";
import { Rubik } from "next/font/google";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import "./globals.css";

// Налаштовуємо шрифт Montserrat з потрібними наборами та товщиною
const rubik = Rubik({
    subsets: ["latin", "cyrillic"],
    weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
    title: "Аналізатор АБС реплеїв WOT",
    description: "Завантажте та проаналізуйте статистику вашої команди",
};

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="uk">
        <body
            className={`${rubik.className} text-slate-100 antialiased`}
        >
        {/* Проста навігація */}
        <div className="app-shell">
            <div className="ambient-grid" />
            <div className="ambient-orb orb-1" />
            <div className="ambient-orb orb-2" />
            <div className="ambient-orb orb-3" />
            <nav className="relative z-20 border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
                <div className="mx-auto flex h-14 max-w-5xl items-center px-4 sm:px-6 lg:px-8">
                    <Link href="/" className="flex items-center gap-2 text-xs sm:text-sm font-semibold tracking-tight text-white/90">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-white/5">
                            <Sparkles className="h-4 w-4 text-cyan-300" />
                        </span>
                        <span className="bg-gradient-to-r from-cyan-300 via-indigo-300 to-pink-300 bg-clip-text text-transparent">
                            WOT Replay Analyzer
                        </span>
                    </Link>
                </div>
            </nav>

            <main className="relative z-10 mx-auto w-full max-w-5xl px-4 pb-10 pt-6 sm:px-6 lg:px-8">
                {children}
            </main>
        </div>
        </body>
        </html>
    );
}
