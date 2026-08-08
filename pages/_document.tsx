import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Set once here rather than per-page: pages/lesson/[unitId].tsx
            and pages/review.tsx had no viewport meta of their own, so
            without this they'd fall back to desktop-width rendering on
            phones. This covers every page, admin included. */}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
