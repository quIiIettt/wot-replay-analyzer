// file: src/app/layout.tsx
import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import Link from 'next/link';
import "./globals.css";

// Налаштовуємо шрифт Montserrat з потрібними наборами та товщиною
const montserrat = Montserrat({
    variable: "--font-montserrat",
    subsets: ["latin", "cyrillic"],
    weight: ["400", "500", "600", "700"],
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
            className={`${montserrat.variable} font-sans bg-gray-50 text-gray-800 antialiased`}
        >
        {/* Проста навігація */}
        <nav className="bg-white shadow-md mb-1">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-center h-16 gap-8">
                    <Link href="/" className="text-gray-700 hover:text-blue-600 font-semibold">
                        Аналіз АБС
                    </Link>
                    <Link href="/random-battles" className="text-gray-700 hover:text-blue-600 font-semibold">
                        Аналіз РАНДОМ
                    </Link>
                </div>
            </div>
        </nav>

        <main className="p-4 sm:p-6 lg:p-8">
            {children}
        </main>
        </body>
        </html>
    );
}