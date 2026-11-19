import type { Metadata, Viewport } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/layout/providers";
import { AppShell } from "@/components/layout/app-shell";

// Apple-style typography: macOS/iOS get the real SF Pro via the system stack; everywhere else gets Inter,
// the closest web typeface, with optical sizing so headings tighten and body text stays open.
const geist = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  axes: ["opsz"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

/** Tells the browser the app supports both schemes and tints its UI (address bar, overscroll) to match the system. */
export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F1F1F1" },
    { media: "(prefers-color-scheme: dark)", color: "#0A0A0A" },
  ],
};

export const metadata: Metadata = {
  title: "StackDrove CTMS — Enterprise Centralized Task Management",
  description:
    "Enterprise cloud-native task management with multi-tier role governance, mathematical SLA scoring, Cloudinary proof pipeline, and automated notifications.",
  icons: {
    icon: "/sd/stackdrove-browser-tab.png",
    shortcut: "/sd/stackdrove-browser-tab.png",
    apple: "/sd/stackdrove-browser-tab.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geist.variable} ${geistMono.variable} h-full antialiased overflow-x-hidden`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            // Runs before first paint. "system" (and no saved choice) follows the OS; only an explicit
            // "light" / "dark" overrides it. (Previously a saved "system" always painted light first.)
            __html: `(function(){try{var s=localStorage.getItem('stackdrove_theme_pref');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;var dark=s==='dark'||((!s||s==='system')&&d);var r=document.documentElement;if(dark){r.classList.add('dark');r.setAttribute('data-theme','dark');}else{r.classList.remove('dark');r.setAttribute('data-theme','light');}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex bg-[#F1F1F1] dark:bg-[#0A0A0A] transition-colors duration-300 overflow-x-hidden">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
