import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/toaster'
import { DataProvider } from '@/lib/data-context'
import { AppSidebar } from '@/components/app-sidebar'
import './globals.css'

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
})

export const metadata: Metadata = {
  title: 'Finance Dashboard',
  description: 'Personal finance tracking and analytics dashboard',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} font-sans antialiased`} suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <DataProvider>
            <div className="relative min-h-screen bg-background">
              {/* Background texture */}
              <div className="texture-overlay" aria-hidden="true" />
              
              {/* Sidebar navigation */}
              <AppSidebar />
              
              {/* Main content area */}
              <main className="min-h-screen pt-14 lg:pl-64 lg:pt-0">
                <div className="page-container py-6 lg:py-8">
                  {children}
                </div>
              </main>
            </div>
            <Toaster />
          </DataProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
