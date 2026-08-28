import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'VedaAI — AI Assessment Review & OCR Grading Studio',
  description:
    'Production-grade AI-powered answer extraction, handwriting OCR coordinate mapping, and rubric evaluation for teachers.',
  keywords: ['AI grading', 'OCR assessment', 'handwriting recognition', 'teacher tools', 'rubric evaluation'],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans bg-[#fafafa] text-slate-900 antialiased dark:bg-[#121212] dark:text-slate-100 selection:bg-[#ff5c28] selection:text-white">
        {children}
      </body>
    </html>
  );
}
