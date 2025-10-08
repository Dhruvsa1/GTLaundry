import "./globals.css";
import Providers from "@/components/Providers";
import Navigation from "@/components/Navigation";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Laundry Tracker",
  description: "Realtime campus laundry machine availability",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/gtlogo.png",
    shortcut: "/icons/gtlogo.png",
    apple: "/icons/gtlogo.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Navigation />
          {children}
        </Providers>
        <script dangerouslySetInnerHTML={{
          __html: `
          if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
            window.addEventListener('load', () => {
              navigator.serviceWorker.register('/sw.js').catch(console.error);
            });
          }`}} />
      </body>
    </html>
  );
}
