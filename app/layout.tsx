import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Geist_Mono, Roboto, Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { ThirdWebProviderWrapper } from "@/components/providers/thirdweb-provider";

// const jakarta = Plus_Jakarta_Sans({
//   variable: "--font-jakarta",
//   subsets: ["latin"],
// });

// const roboto = Roboto({
//   variable: "--font-roboto",
//   subsets: ["latin"],
//   weight: ["100", "300", "400", "500", "700", "900"],
// });

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});


// const geistMono = Geist_Mono({
//   variable: "--font-geist-mono",
//   subsets: ["latin"],
// });

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Medichain - Your Health Record in the Blockchain",
  description: "Secure medical records on blockchain",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${spaceGrotesk.variable} ${inter.variable} antialiased `}
      >
        <ThirdWebProviderWrapper>{children}</ThirdWebProviderWrapper>
      </body>
    </html>
  );
}
