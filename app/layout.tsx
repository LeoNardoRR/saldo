import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Saldo — seu dinheiro, com clareza",
  description: "Controle financeiro pessoal com contas, faturas e planejamento.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/assets/logo.svg",
    shortcut: "/assets/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
