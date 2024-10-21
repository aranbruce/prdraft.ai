import { Metadata } from "next";
import { Toaster } from "sonner";

import { Navbar } from "@/components/custom/navbar";
import { SidebarProvider } from "@/components/ui/sidebar";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://prdraft.ai"),
  title: "PRDraft AI",
  description: "Create your next PRD with ease",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="h-svh antialiased">
        <SidebarProvider>
          <Toaster position="top-center" />
          <Navbar />
          {children}
        </SidebarProvider>
      </body>
    </html>
  );
}
