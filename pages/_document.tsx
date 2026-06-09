import Document, { Html, Head, Main, NextScript } from "next/document";

export default class MyDocument extends Document {
  render() {
    return (
      <Html lang="de">
        <Head>
          {/* Google Fonts – Playfair Display für Überschriften */}
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,400&family=Inter:wght@400;600;700&display=swap" rel="stylesheet" />

          {/* PWA Meta – unverändert */}
          <link rel="manifest" href="/manifest.webmanifest" />
          <meta name="theme-color" content="#F5E9DF" />
          <link rel="icon" href="/icons/icon-192.png" />
          {/* iOS Vollbild + Icon */}
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="default" />
          <link rel="apple-touch-icon" href="/icons/icon-192.png" />

          {/* Viewport */}
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
          />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}
