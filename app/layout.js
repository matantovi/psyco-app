import "./globals.css";

export const metadata = {
  title: "מכינון פסיכומטרי",
  description: "Psychometric preparation app"
};

export default function RootLayout({ children }) {
  return (
    <html lang="he" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
