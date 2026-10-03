import React from 'react';

export default function Footer() {
  return (
    <footer style={{ marginTop: 'auto', backgroundColor: '#0f172a', color: '#94a3b8', padding: '2rem 0', borderTop: '1px solid #1e293b' }}>
      <div className="container" style={{ textAlign: 'center' }}>
        <p style={{ fontWeight: '500', color: '#f8fafc' }}>BUILDION – Raise 2 Resolve</p>
        <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
          Empowering citizens & civic authorities for transparent issue resolution.
        </p>
        <p style={{ fontSize: '0.75rem', marginTop: '1rem', color: '#64748b' }}>
          &copy; {new Date().getFullYear()} BUILDION Hackathon Prototype. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
