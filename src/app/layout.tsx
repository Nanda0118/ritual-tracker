import type { Metadata, Viewport } from "next";
import { orbitron, rajdhani, techMono } from "./fonts";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Morning Ritual // BUDDY",
  description: "Daily morning ritual tracker",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a0f1a",
};

// Resolves the theme before hydration so there's no light/dark flash on load.
const NO_FLASH_SCRIPT = `
(function () {
  try {
    var mode = localStorage.getItem('jv-mode') || 'auto';
    var theme = mode;
    if (mode === 'auto') {
      var h = new Date().getHours();
      theme = (h >= 7 && h < 18) ? 'light' : 'dark';
    }
    document.documentElement.dataset.theme = theme;
  } catch (e) {
    document.documentElement.dataset.theme = 'dark';
  }
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${orbitron.variable} ${rajdhani.variable} ${techMono.variable}`}
      data-theme="dark"
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_SCRIPT }} />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
