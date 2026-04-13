import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "AURUM — ZK-Identity Payroll",
  description: "Privacy-grade on-chain payroll with ZK identity verification",
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script src="https://cdn.tailwindcss.com" defer />
        <script src="https://unpkg.com/react@18/umd/react.production.min.js" defer />
        <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js" defer />
        <script src="https://unpkg.com/framer-motion@11/umd/framer-motion.umd.min.js" defer />
        <script src="https://unpkg.com/lucide@latest" defer />
      </head>
      <body className="bg-[#0a0a0a] text-[#e5e2d8]">{children}</body>
    </html>
  );
}
