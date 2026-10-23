import type { Metadata, Viewport } from "next";
import { Archivo, Archivo_Narrow, Geist_Mono } from "next/font/google";

import "./globals.css";

// Archivo for reading text; Archivo Narrow for uppercase micro-labels; Geist
// Mono for every number, so scores and percentages line up in columns.
const archivo = Archivo({ subsets: ["latin"], variable: "--font-sans" });
const archivoNarrow = Archivo_Narrow({ subsets: ["latin"], variable: "--font-narrow" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });
const logoFace = Archivo({ subsets: ["latin"], style: ["italic"], weight: ["800"], variable: "--font-logo" });

export const metadata: Metadata = {
  // The tab always reads "Nexa", on every page.
  title: "Nexa",
  description:
    "Nexa shows which of your tasks AI is already doing, which skills carry you forward, and a cited, step-by-step path to a future role — for individuals and whole organisations. Team EcoByte · SDC Hackathon 2026 · Domain 1.",
};

export const viewport: Viewport = {
  themeColor: "#faf9f5",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${archivo.variable} ${archivoNarrow.variable} ${geistMono.variable} ${logoFace.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
