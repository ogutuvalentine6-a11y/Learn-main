import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
          <link rel="manifest" href="/manifest.json" />
          <meta name="theme-color" content="#4f46e5" />
          <link rel="icon" href="/icon-192.svg" type="image/svg+xml" />
          <link rel="apple-touch-icon" href="/icon-192.svg" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="default" />
          <meta name="apple-mobile-web-app-title" content="Learn" />
        </Head>
      <body className="bg-gray-100">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
