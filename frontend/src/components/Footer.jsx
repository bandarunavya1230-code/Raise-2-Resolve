import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Shield, HeartHandshake, MapPin, ExternalLink, Mail, Phone } from 'lucide-react';

export default function Footer() {
  return (
    <footer style={{
      marginTop: 'auto',
      backgroundColor: '#0b192c',
      color: '#94a3b8',
      borderTop: '1px solid #1e293b'
    }}>
      {/* Main Footer Content */}
      <div className="container" style={{ padding: '3.5rem 1.5rem 2.5rem 1.5rem' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '2.5rem',
          marginBottom: '2.5rem'
        }}>
          
          {/* Column 1: Brand & Mission */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem' }}>
              <div style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 50%, #1e40af 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)'
              }}>
                <CheckCircle2 size={18} strokeWidth={2.5} />
              </div>
              <span style={{ fontWeight: '800', fontSize: '1.2rem', color: '#ffffff', letterSpacing: '-0.02em' }}>
                Raise 2 Resolve
              </span>
            </div>
            
            <p style={{ fontSize: '0.875rem', lineHeight: '1.6', color: '#94a3b8', marginBottom: '1.25rem' }}>
              A public civic-tech platform connecting residents and local municipal bodies. Report issues, upvote community priorities, and follow transparent resolution steps.
            </p>

            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              backgroundColor: 'rgba(13, 148, 136, 0.15)',
              color: '#2dd4bf',
              border: '1px solid rgba(13, 148, 136, 0.3)',
              padding: '0.25rem 0.65rem',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: '600'
            }}>
              <Shield size={13} /> Transparent Civic Governance
            </div>
          </div>

          {/* Column 2: Civic Services */}
          <div>
            <h4 style={{ color: '#ffffff', fontSize: '0.95rem', fontWeight: '700', marginBottom: '1rem', letterSpacing: '0.02em' }}>
              Civic Services
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.875rem' }}>
              <li>
                <Link to="/register" style={{ color: '#cbd5e1' }}>Raise a Complaint</Link>
              </li>
              <li>
                <a href="#track-section" style={{ color: '#cbd5e1' }}>Track Ticket Progress</a>
              </li>
              <li>
                <a href="#community-feed" style={{ color: '#cbd5e1' }}>Community Upvotes</a>
              </li>
              <li>
                <a href="#how-it-works" style={{ color: '#cbd5e1' }}>How It Works</a>
              </li>
              <li>
                <Link to="/login" style={{ color: '#cbd5e1' }}>Citizen Portal</Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Issue Categories */}
          <div>
            <h4 style={{ color: '#ffffff', fontSize: '0.95rem', fontWeight: '700', marginBottom: '1rem', letterSpacing: '0.02em' }}>
              Issue Categories
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.875rem', color: '#94a3b8' }}>
              <li>Roads & Potholes</li>
              <li>Water Supply & Quality</li>
              <li>Waste & Sanitation</li>
              <li>Streetlights & Electrical</li>
              <li>Drainage & Flooding</li>
              <li>Public Safety & Parks</li>
            </ul>
          </div>

          {/* Column 4: Municipal Desk */}
          <div>
            <h4 style={{ color: '#ffffff', fontSize: '0.95rem', fontWeight: '700', marginBottom: '1rem', letterSpacing: '0.02em' }}>
              Municipal Desk
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.875rem', color: '#cbd5e1' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Mail size={15} color="#38bdf8" />
                <span>support@raise2resolve.gov</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Phone size={15} color="#38bdf8" />
                <span>Civic Hotline: 1800-CIVIC-RESOLVE</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginTop: '0.25rem' }}>
                <MapPin size={15} color="#38bdf8" style={{ marginTop: '0.2rem', flexShrink: 0 }} />
                <span>Municipal Administrative Complex, Civic Center</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Sub-footer */}
        <div style={{
          borderTop: '1px solid #1e293b',
          paddingTop: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          fontSize: '0.8rem',
          color: '#64748b'
        }}>
          <div>
            &copy; {new Date().getFullYear()} Raise 2 Resolve. Public Civic Infrastructure Platform.
          </div>
          <div style={{ display: 'flex', gap: '1.25rem' }}>
            <span>Privacy Policy</span>
            <span>Terms of Public Service</span>
            <span>Accessibility</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
