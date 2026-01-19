import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./components/Providers";

export const metadata: Metadata = {
  title: "StructureFlow - Transform Websites to Structured Content",
  description: "Automatically map any website to content models, UI components, and their mappings using AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-background text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
