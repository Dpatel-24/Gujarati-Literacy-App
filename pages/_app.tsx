import type { AppProps } from 'next/app';
import { Noto_Serif_Gujarati, Fraunces, Karla, Noto_Sans_Gujarati } from 'next/font/google';
import Layout from '@/components/Layout';
import '../styles/globals.css';

// next/font can't be used in _document, so it's loaded here instead
// and the resulting --font-* CSS variables are applied to a
// full-viewport wrapper right inside <body> -- everything rendered by
// a page is a descendant of that wrapper, so globals.css can use
// var(--font-body) etc. anywhere except on the literal <body> tag
// itself (which still gets its background/text-color vars fine, since
// --paper/--ink are plain CSS custom properties defined at :root).
const notoSerifGujarati = Noto_Serif_Gujarati({
  subsets: ['gujarati'],
  weight: ['400', '600'],
  variable: '--font-noto-serif-gujarati',
  display: 'swap',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: 'variable',
  variable: '--font-fraunces',
  display: 'swap',
  axes: ['opsz'],
});

const karla = Karla({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-karla',
  display: 'swap',
});

const notoSansGujarati = Noto_Sans_Gujarati({
  subsets: ['gujarati'],
  weight: ['400', '500'],
  variable: '--font-noto-sans-gujarati',
  display: 'swap',
});

const fontVariables = [
  notoSerifGujarati.variable,
  fraunces.variable,
  karla.variable,
  notoSansGujarati.variable,
].join(' ');

export default function App({ Component, pageProps }: AppProps) {
  return (
    <div className={`${fontVariables} app-shell`}>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </div>
  );
}
