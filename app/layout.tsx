import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "./providers";

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "THE NEXUS ARCHIVE — Explore Hidden Connections in History",
  description: "An interactive archive exploring conspiracy theories, alternative history, ancient mysteries, and unexplained phenomena. All content presented as theories and open questions.",
  keywords: ["conspiracy theories", "ancient mysteries", "alternative history", "Atlantis", "Anunnaki", "UFOs", "simulation theory", "Book of Enoch", "Nephilim", "secret societies"],
  openGraph: {
    title: "THE NEXUS ARCHIVE",
    description: "What if history is more mysterious than we think?",
    type: "website",
  },
  robots: "index, follow",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full">
      <body className="antialiased min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
