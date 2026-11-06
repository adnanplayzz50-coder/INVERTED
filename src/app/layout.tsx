import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "INVERTED — Private Workspace",
  description: "Your private media library and AI-powered GitHub workspace.",
  applicationName: "INVERTED",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning><body>{children}</body></html>;
}
