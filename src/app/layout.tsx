import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SafarBuddy — Book Flights, Hotels, Bus, Train & Holidays",
  description:
    "SafarBuddy is your all-in-one travel marketplace — flights, hotels, bus, train, holiday packages, visa, forex and insurance, in one boarding pass.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
