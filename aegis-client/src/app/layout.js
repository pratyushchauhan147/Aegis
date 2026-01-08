import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext"; // 👈 Import this

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Aegis Secure",
  description: "Advanced Protection System",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* Wrap children in Provider */}
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}