import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "MaMa John's | Guardian",
  description: "Safe school transport for every family"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
