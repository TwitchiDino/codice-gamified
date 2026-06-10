import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "../context/AuthContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Códice - Grimório Místico de Crônicas",
  description: "Um micro-blog gamificado para registro de crônicas e sabedorias arcanas.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" className="dark">
      <body className={`${inter.className} bg-slate-950 text-slate-100 antialiased min-h-screen`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
