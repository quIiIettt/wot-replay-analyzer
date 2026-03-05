import type { Metadata } from 'next';
import { Manrope, Outfit } from 'next/font/google';
import './globals.css';
import AppHeader from './components/AppHeader';
import AppFooter from './components/AppFooter';

const manrope = Manrope({
  subsets: ['latin', 'cyrillic'],
  weight: ['300', '400', '500', '600', '700'],
});

const outfit = Outfit({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-outfit',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'WOT Replay Analyzer',
  description: 'Аналіз АБС реплеїв та випадкових боїв з детальною аналітикою по картах і техніці.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk">
      <body className={`${manrope.className} ${outfit.variable} antialiased`}>
        <div className="app-shell">
          <div className="ambient-bg" />
          <AppHeader />
          <main className="container relative z-10 mx-auto w-full flex-1 px-4 pb-8 pt-6 md:px-8">{children}</main>
          <AppFooter />
        </div>
      </body>
    </html>
  );
}
