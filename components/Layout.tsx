import type { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from '@/styles/Layout.module.css';

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/review', label: 'Review' },
  { href: '/admin/import-text', label: 'Import Text' },
  { href: '/admin/review-vocab', label: 'Review Vocab' },
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
            const isActive = router.pathname === link.href;
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
