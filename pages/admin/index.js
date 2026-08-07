import Link from 'next/link';

export default function AdminHome() {
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '3rem' }}>
      <h1>Admin</h1>
      <ul>
        <li>
          <Link href="/admin/source-texts">Source texts (import + extract vocabulary)</Link>
        </li>
      </ul>
    </main>
  );
}
