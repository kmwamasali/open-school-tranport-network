import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "Open School Transport Network MVP",
  description: "Phase 1 onboarding and verification MVP"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
