import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from './context/AuthContext';
import Header from "./components/Header"; // Importujeme Header

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Galaxia Obedy",
  description: "Objednávkový systém pre Galaxia obedy",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sk">
      <body className={inter.className}>
        <AuthProvider>
          <Header /> {/* Vložíme hlavičku sem */}
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
