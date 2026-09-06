// Font
import { Inter } from "next/font/google";
// Providers
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { SubmissionsProvider } from "@/components/SubmissionsProvider";
// Styling
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Recruitment Portal | GDG on Campus",
  description: "Official recruitment portal for Google Developer Groups on Campus",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <SubmissionsProvider>
            {children}
            <Toaster position="top-center" richColors />
          </SubmissionsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
