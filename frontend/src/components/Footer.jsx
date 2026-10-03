import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Shield, MapPin, Mail, Phone, Compass, Building2 } from 'lucide-react';

export default function Footer() {
  return (
    <footer style={{
      marginTop: 'auto',
      backgroundColor: '#FFFFFF',
      color: '#64748B',
      borderTop: '1px solid #E2E8F0'
    }}>
      {/* Main Footer Container */}
      <div className="container" style={{ padding: '3.5rem 1.5rem 2.25rem 1.5rem' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '2.5rem',
          marginBottom: '2.5rem'
        }}>
          
          {/* Column 1: Brand & Civic Tech Mission */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '0.85rem' }}>
              <img
                src="/logo.jpg"
                alt="Raise 2 Resolve Logo"
                referrerPolicy="no-referrer"
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '12px',
                  objectFit: 'cover',
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                  border: '2px solid #BFDBFE'
                }}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                lineHeight: '1',
                letterSpacing: '-0.02em'
              }}>
                <span style={{
                  fontWeight: '900',
                  fontSize: '1.35rem',
                  color: '#0F172A',
                  letterSpacing: '-0.02em'
                }}>
                  RAISE
                </span>
                <span style={{
                  fontWeight: '950',
                  fontSize: '2.1rem',
                  color: '#2563EB',
                  lineHeight: '0.8',
                  display: 'inline-block',
                  margin: '0',
                  padding: '0 1px',
                  transform: 'translateY(-1px)'
                }}>
                  2
                </span>
                <span style={{
                  fontWeight: '900',
                  fontSize: '1.35rem',
                  color: '#0284C7',
                  letterSpacing: '-0.02em'
                }}>
                  RESOLVE
                </span>
              </div>
            </div>
            
            <p style={{ fontSize: '0.875rem', lineHeight: '1.6', color: '#64748B', marginBottom: '1.25rem' }}>
              A modern, transparent civic-tech platform connecting citizens and municipal authorities. Automated department routing, jurisdiction verification, and community upvoting.
            </p>

            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              backgroundColor: '#F0FDF4',
              color: '#0F766E',
              border: '1px solid #99F6E4',
              padding: '0.3rem 0.75rem',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: '700'
            }}>
              <Shield size={13} color="#14B8A6" /> 100% Transparent Civic Governance
            </div>
          </div>

          {/* Column 2: Civic Services */}
          <div>
            <h4 style={{ color: '#0F172A', fontSize: '0.95rem', fontWeight: '800', marginBottom: '1rem', letterSpacing: '0.02em' }}>
              Civic Services
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.875rem' }}>
              <li>
                <Link to="/register" style={{ color: '#334155' }}>Raise a Complaint</Link>
              </li>
              <li>
                <a href="/#find-authority" style={{ color: '#334155' }}>Find Authority Near Me</a>
              </li>
              <li>
                <a href="/#track-section" style={{ color: '#334155' }}>Track Complaint Status</a>
              </li>
              <li>
                <a href="/#community-feed" style={{ color: '#334155' }}>Community Upvotes</a>
              </li>
              <li>
                <a href="/#departments" style={{ color: '#334155' }}>Department Directory</a>
              </li>
            </ul>
          </div>

          {/* Column 3: Departments */}
          <div>
            <h4 style={{ color: '#0F172A', fontSize: '0.95rem', fontWeight: '800', marginBottom: '1rem', letterSpacing: '0.02em' }}>
              Civic Departments
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.85rem', color: '#64748B' }}>
              <li>⚡ Electricity Department</li>
              <li>💧 Water Supply & Sewage</li>
              <li>🛣️ Roads & Public Works</li>
              <li>♻️ Sanitation & Waste</li>
              <li>💡 Streetlights & Electrical</li>
              <li>🌧️ Drainage & Flood Control</li>
            </ul>
          </div>

          {/* Column 4: Municipal Desk */}
          <div>
            <h4 style={{ color: '#0F172A', fontSize: '0.95rem', fontWeight: '800', marginBottom: '1rem', letterSpacing: '0.02em' }}>
              Municipal Desk
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.875rem', color: '#334155' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Mail size={15} color="#2563EB" />
                <span>support@raise2resolve.gov</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Phone size={15} color="#14B8A6" />
                <span>Civic Helpline: 1800-200-3532</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginTop: '0.2rem' }}>
                <MapPin size={15} color="#0284C7" style={{ marginTop: '0.2rem', flexShrink: 0 }} />
                <span>Central Civic Administrative Complex</span>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div style={{
          borderTop: '1px solid #E2E8F0',
          paddingTop: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          fontSize: '0.8rem',
          color: '#64748B'
        }}>
          <div>
            &copy; {new Date().getFullYear()} Raise 2 Resolve. Public Civic Infrastructure Platform.
          </div>
          <div style={{ display: 'flex', gap: '1.25rem' }}>
            <span>Public Service Level Agreements (SLA)</span>
            <span>Privacy Policy</span>
            <span>Citizen Charter</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
