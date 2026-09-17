import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "Guardian Portal",
  description: "Parent and guardian onboarding"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
