import type { Metadata } from "next";
import { Geist, Geist_Mono, Sora } from "next/font/google";
import "./globals.css";
import { NavRail } from "@/components/shell/nav-rail";
import { TopBar } from "@/components/shell/top-bar";
import { CommandMenu } from "@/components/shell/command-menu";
import { SurfaceFX } from "@/components/shell/surface-fx";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
// Display face for the cinematic hero — geometric, distinctive, not a system font.
// Loaded as a variable font (full wght axis) so the hero title can interpolate
// weight smoothly during its entrance.
const sora = Sora({ variable: "--font-sora", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Astra OS — Mission Control",
  description: "Your entire agent stack, in orbit.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr" className={`${geistSans.variable} ${geistMono.variable} ${sora.variable} h-full`}>
      <body className="h-full">
        <div className="flex h-full">
          <NavRail />
          <div className="flex min-w-0 flex-1 flex-col">
            <TopBar />
            <main className="app-ambient min-h-0 flex-1 overflow-y-auto">{children}</main>
          </div>
        </div>
        <CommandMenu />
        <SurfaceFX />
      </body>
    </html>
  );
}
