import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "BugTrail — каждый баг имеет значение",
  description:
    "Сообщество для поиска и проверки ошибок. Учебный frontend с демонстрационными проектами и тремя ролями.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
