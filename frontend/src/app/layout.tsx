import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { OfflineProvider } from "@/context/OfflineContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FISE Gas - Sistema de Gestión",
  description: "Plataforma operativa para instalaciones de gas FISE",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${inter.className} bg-slate-950 text-slate-100 antialiased`}>
        <AuthProvider>
          <OfflineProvider>
            {children}
          </OfflineProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
