import "./globals.css";
import Header from "../components/Header";
import { AuthProvider } from "../context/AuthContext";

export const metadata = { title: "Nano Banana SaaS" };

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>
        <AuthProvider>
          <Header />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

