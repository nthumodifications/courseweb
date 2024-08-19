import { LangProps } from "@/types/pages";

import { Inter, Noto_Sans_TC } from "next/font/google";
import { cookies } from "next/headers";

import "./globals.css";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
});

const noto = Noto_Sans_TC({
  subsets: ["latin", "latin-ext"],
  variable: "--font-noto",
});

export default function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
} & LangProps) {
  const theme = cookies().get("theme");
  return (
    <html
      lang={params.lang}
      translate="no"
      className={`${theme?.value ?? ""} ${inter.variable} ${noto.variable}`}
      suppressHydrationWarning={true}
    >
      <body suppressHydrationWarning={true}>{children}</body>
    </html>
  );
}
