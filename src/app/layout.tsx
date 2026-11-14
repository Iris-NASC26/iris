import type { Metadata } from "next";
import { ThemeProvider } from "@/context/ThemeContext";
import "./globals.css";
import '@/styles/earth-data.css';
import { PreferencesProvider } from '@/state/preferences';
import { RuntimeBanner } from '@/components/dashboard/RuntimeBanner';

export const metadata: Metadata = {
  title: "Iris | Earth System Trend Detective",
  description:
    "Local NASA data investigation workspace. Raw retrieval is available; scientific inference requires review.",
  icons: {
    icon: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider><PreferencesProvider><RuntimeBanner />{children}</PreferencesProvider></ThemeProvider>
      </body>
    </html>
  );
}
