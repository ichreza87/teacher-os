import type { Metadata } from "next";
import "./globals.css";
import CommandPalette from "@/components/command-palette";

export const metadata: Metadata = {
  title: "Teacher OS",
  description: "AI-Powered Teacher Operating System"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        <CommandPalette />
        {children}
      </body>
    </html>
  );
}
