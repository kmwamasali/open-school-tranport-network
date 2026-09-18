import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "Driver Portal",
  description: "Driver and fleet operator onboarding"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
