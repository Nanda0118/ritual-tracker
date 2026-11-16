import type { Metadata, Viewport } from "next";
import { orbitron, rajdhani, techMono } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Morning Ritual // BUDDY",
  description: "Daily morning ritual tracker",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#04070e",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${orbitron.variable} ${rajdhani.variable} ${techMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
