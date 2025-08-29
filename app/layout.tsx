import type React from "react"
import type { Metadata } from "next"
import { Playfair_Display, Source_Sans_3 } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Favicon } from "@/components/favicon"

const playfair = Playfair_Display({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-playfair",
  weight: ["400", "700"],
})

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-source-sans",
  weight: ["400", "600"],
})

export const metadata: Metadata = {
  title: "CAPlayground - Core Animation Editor",
  description: "Create beautiful animated wallpapers for iOS and iPadOS on any desktop computer",
  verification: {
    google: "xNuTnO5iYYm2op2KXAClg0oYMmslpl35wOv-9RfySxU",
  },
  openGraph: {
    title: "CAPlayground - Core Animation Editor",
    description: "Create beautiful animated wallpapers for iOS and iPadOS on any desktop computer",
    type: "website",
    images: [
      { url: "/icon-light.png", alt: "CAPlayground icon (light)" },
      { url: "/icon-dark.png", alt: "CAPlayground icon (dark)" },
    ],
  },
  icons: {
    icon: [
      { url: "/icon-light.png", media: "(prefers-color-scheme: light)" },
      { url: "/icon-dark.png", media: "(prefers-color-scheme: dark)" },
    ],
    apple: [
      { url: "/icon-light.png", media: "(prefers-color-scheme: light)" },
      { url: "/icon-dark.png", media: "(prefers-color-scheme: dark)" },
    ],
    shortcut: [
      { url: "/icon-light.png", media: "(prefers-color-scheme: light)" },
      { url: "/icon-dark.png", media: "(prefers-color-scheme: dark)" },
    ],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${playfair.variable} ${sourceSans.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased min-h-screen bg-background text-foreground">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <Favicon />
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
