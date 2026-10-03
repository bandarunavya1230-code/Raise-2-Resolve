import React, { useState } from 'react';
import { X, Mail, MessageSquare, Smartphone, Bell, CheckCircle2, AlertCircle } from 'lucide-react';

export default function SimulatedNotificationModal({ notification, onClose }) {
  const [activeTab, setActiveTab] = useState('email'); // 'email' | 'sms'

  if (!notification) return null;

  const { email, sms, complaintCode, citizenName, statusChange, timestamp } = notification;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      padding: '1.5rem',
      backdropFilter: 'blur(4px)'
    }}>
      <div className="card" style={{
        maxWidth: '620px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        position: 'relative',
        padding: '2rem',
        borderTop: '5px solid #2563eb'
      }}>
        {/* Close Button */}
        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            color: '#64748b'
          }}
        >
          <X size={24} />
        </button>

        {/* SIMULATED DEMO BANNER */}
        <div style={{
          backgroundColor: '#eff6ff',
          border: '1px solid #bfdbfe',
          color: '#1e40af',
          padding: '0.625rem 1rem',
          borderRadius: '8px',
          fontSize: '0.825rem',
          fontWeight: '700',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <Bell size={18} color="#2563eb" />
          <div>
            <span>SIMULATED DEMO NOTIFICATIONS</span>
            <span style={{ fontWeight: 'normal', fontSize: '0.75rem', display: 'block', color: '#3b82f6' }}>
              Generated automatically on status update. No real external email/SMS APIs required.
            </span>
          </div>
        </div>

        {/* Title */}
        <h2 style={{ fontSize: '1.35rem', fontWeight: '800', color: '#0f172a', marginBottom: '0.35rem' }}>
          Citizen Notification Triggered
        </h2>
        <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
          Ticket <strong>#{complaintCode}</strong> status changed to <span className={`badge badge-${statusChange}`}>{statusChange.replace('_', ' ')}</span>
        </p>

        {/* Tab Toggle */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
          <button 
            onClick={() => setActiveTab('email')}
            className={`btn ${activeTab === 'email' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}
          >
            <Mail size={16} /> Simulated Email
          </button>
          <button 
            onClick={() => setActiveTab('sms')}
            className={`btn ${activeTab === 'sms' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}
          >
            <Smartphone size={16} /> Simulated SMS
          </button>
        </div>

        {/* TAB 1: EMAIL NOTIFICATION PREVIEW */}
        {activeTab === 'email' && email && (
          <div style={{
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            backgroundColor: '#ffffff',
            overflow: 'hidden'
          }}>
            {/* Email Header */}
            <div style={{ backgroundColor: '#f8fafc', padding: '0.875rem 1rem', borderBottom: '1px solid #e2e8f0', fontSize: '0.85rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <div><strong style={{ color: '#0f172a' }}>To:</strong> {email.to} ({citizenName})</div>
              <div><strong style={{ color: '#0f172a' }}>From:</strong> notifications@raise2resolve.gov</div>
              <div><strong style={{ color: '#0f172a' }}>Subject:</strong> {email.subject}</div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Sent: {new Date(timestamp).toLocaleString()}</div>
            </div>

            {/* Email Body */}
            <div style={{ padding: '1.25rem', fontSize: '0.9rem', color: '#334155', whiteSpace: 'pre-line', lineHeight: '1.6' }}>
              {email.body}
            </div>
          </div>
        )}

        {/* TAB 2: SMS NOTIFICATION PREVIEW (MOBILE UI) */}
        {activeTab === 'sms' && sms && (
          <div style={{
            maxWidth: '360px',
            margin: '0 auto',
            border: '12px solid #0f172a',
            borderRadius: '32px',
            backgroundColor: '#f1f5f9',
            overflow: 'hidden',
            boxShadow: '0 10px 25px rgba(0,0,0,0.15)'
          }}>
            {/* Phone Screen Bar */}
            <div style={{ backgroundColor: '#0f172a', color: 'white', padding: '0.5rem 1rem', fontSize: '0.75rem', textAlign: 'center', fontWeight: '600' }}>
              📱 SMS to {sms.to}
            </div>

            {/* Message Bubble */}
            <div style={{ padding: '1.25rem', minHeight: '180px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              <div style={{
                backgroundColor: '#2563eb',
                color: 'white',
                padding: '0.85rem 1rem',
                borderRadius: '16px 16px 4px 16px',
                fontSize: '0.85rem',
                lineHeight: '1.4',
                maxWidth: '90%',
                alignSelf: 'flex-end',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                {sms.body}
                <div style={{ fontSize: '0.65rem', opacity: 0.8, textAlign: 'right', marginTop: '0.35rem' }}>
                  {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer Action */}
        <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
          <button onClick={onClose} className="btn btn-secondary" style={{ padding: '0.45rem 1.25rem' }}>
            Close Notification Preview
          </button>
        </div>
      </div>
    </div>
  );
}
