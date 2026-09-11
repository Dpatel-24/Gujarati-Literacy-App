import type { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from '@/styles/Layout.module.css';

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/review', label: 'Review' },
  { href: '/pronunciation-key', label: 'Pronunciation' },
  { href: '/admin/text', label: 'Text' },
  { href: '/admin/review-vocab', label: 'Review Vocab' },
  { href: '/admin/vocab-groups', label: 'Vocab Groups' },
  { href: '/admin/help', label: 'Help' },
];

/**
 * Persistent top nav, wired into _app.tsx so it wraps every page
 * without needing to be added individually. Sticky, not decorative --
 * a small fixed set of links stays exposed at all times rather than
 * behind a hamburger, since collapsing five links behind a menu costs
 * more taps than it saves screen space.
 */
export default function Layout({ children }: { children: ReactNode }) {
  const router = useRouter();

  return (
    <>
      <nav className={styles.nav}>
        <span className={styles.logotype}>Gujarati Literacy</span>
        <div className={styles.links}>
          {NAV_LINKS.map((link) => {
            // Exact match, or a sub-page of this link (e.g. Text's
            // /admin/text/import), so a nested page still shows its
            // parent tab as current.
            const isActive =
              router.pathname === link.href ||
              (link.href !== '/' && router.pathname.startsWith(`${link.href}/`));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`${styles.link} ${isActive ? styles.linkActive : ''}`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </nav>
      {children}
    </>
  );
}
