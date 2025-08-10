// file: src/app/layout.tsx
import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
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
        <main className="p-4 sm:p-6 lg:p-8">
            {children}
        </main>
        </body>
        </html>
    );
}