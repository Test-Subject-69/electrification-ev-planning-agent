import "./globals.css";

export const metadata = {
  title: "Electrification & EV Planning Agent",
  description: "EV charging infrastructure planning for Walker-Miller Energy Services."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
