import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "School Portal",
  description: "School registration and student verification"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
