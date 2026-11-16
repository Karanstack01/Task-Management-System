import type { Metadata, Viewport } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/layout/providers";
import { AppShell } from "@/components/layout/app-shell";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
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
    { media: "(prefers-color-scheme: light)", color: "#F4F5F8" },
    { media: "(prefers-color-scheme: dark)", color: "#0A0B10" },
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
      className={`${inter.variable} ${geistMono.variable} h-full antialiased overflow-x-hidden`}
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
      <body className="min-h-full flex bg-[#F4F5F8] dark:bg-[#0A0A0C] transition-colors duration-300 overflow-x-hidden">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
