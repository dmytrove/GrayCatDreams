import "./globals.css";

export const metadata = {
  title: "Floating Cat Dreams",
  description: "Upload photos, remove background, share your floating dream",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/png" href="/img/cat1.png" />
        <link rel="apple-touch-icon" href="/img/cat1.png" />
      </head>
      <body>{children}</body>
    </html>
  );
}
