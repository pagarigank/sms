import Link from 'next/link';

export default function POSPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(160deg, #0f172a 0%, #1e293b 100%)',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        padding: 16,
      }}
    >
      <div
        style={{
          textAlign: 'center',
          background: '#ffffff',
          borderRadius: 20,
          padding: 40,
          boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 2, color: '#2563eb' }}>SCHOOLSUITE POS</div>
        <h1 style={{ margin: '8px 0 4px', fontSize: 28, fontWeight: 800, color: '#0f172a' }}>Cashier Terminal</h1>
        <p style={{ margin: '0 0 24px', fontSize: 15, color: '#64748b' }}>
          Point-of-sale terminal for collecting school payments — online or offline.
        </p>
        <Link
          href="/login"
          style={{
            display: 'inline-block',
            height: 56,
            lineHeight: '56px',
            padding: '0 40px',
            borderRadius: 12,
            background: '#2563eb',
            color: '#ffffff',
            fontSize: 17,
            fontWeight: 700,
            textDecoration: 'none',
          }}
        >
          Open Terminal Sign-in
        </Link>
        <p style={{ marginTop: 20, fontSize: 12, color: '#94a3b8' }}>
          SchoolSuite SMS · Cashier POS Terminal
        </p>
      </div>
    </div>
  );
}
