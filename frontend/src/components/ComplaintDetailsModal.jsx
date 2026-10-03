import React, { useState, useEffect } from 'react';
import { X, MapPin, Tag, Shield, Clock, User, Zap, Info, ShieldCheck, Flag } from 'lucide-react';
import ComplaintTimeline from './ComplaintTimeline';

export default function ComplaintDetailsModal({ complaintId, onClose, token, onSupportToggle }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!complaintId) return;

    const fetchDetails = async () => {
      try {
        const res = await fetch(`/api/complaints/${complaintId}`);
        const result = await res.json();
        if (result.success) {
          setData(result.data);
        } else {
          setError(result.message || 'Failed to load details.');
        }
      } catch (err) {
        setError('Error connecting to server.');
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [complaintId]);

  if (!complaintId) return null;

  const severityColors = {
    low: { bg: '#e0f2fe', color: '#0369a1' },
    medium: { bg: '#fef3c7', color: '#b45309' },
    high: { bg: '#ffedd5', color: '#c2410c' },
    critical: { bg: '#fee2e2', color: '#b91c1c' }
  };

  const getPriorityBadge = (score, level) => {
    if (level === 'Urgent' || score >= 65) return { bg: '#dc2626', text: 'Urgent Priority' };
    if (level === 'High' || score >= 45) return { bg: '#ea580c', text: 'High Priority' };
    return { bg: '#2563eb', text: 'Normal Priority' };
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1.5rem'
    }}>
      <div className="card" style={{
        maxWidth: '680px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        position: 'relative',
        padding: '2rem'
      }}>
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

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
            Loading issue details...
          </div>
        ) : error ? (
          <div className="alert alert-danger">{error}</div>
        ) : data ? (
          <div>
            {/* Badges Header */}
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
              <span className={`badge badge-${data.status}`}>{data.status.replace('_', ' ')}</span>
              
              {data.is_verified === 1 && (
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  padding: '0.25rem 0.625rem',
                  borderRadius: '9999px',
                  backgroundColor: '#f3e8ff',
                  color: '#6b21a8',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}>
                  <ShieldCheck size={13} /> Verified Report
                </span>
              )}

              {data.is_flagged === 1 && (
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  padding: '0.25rem 0.625rem',
                  borderRadius: '9999px',
                  backgroundColor: '#fee2e2',
                  color: '#991b1b',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}>
                  <Flag size={13} /> Flagged / Invalid
                </span>
              )}

              <span style={{
                fontSize: '0.75rem',
                fontWeight: '700',
                padding: '0.25rem 0.625rem',
                borderRadius: '9999px',
                textTransform: 'uppercase',
                backgroundColor: severityColors[data.severity]?.bg || '#f1f5f9',
                color: severityColors[data.severity]?.color || '#475569'
              }}>
                Severity: {data.severity}
              </span>

              <span style={{
                fontSize: '0.75rem',
                fontWeight: '700',
                padding: '0.25rem 0.625rem',
                borderRadius: '9999px',
                color: 'white',
                backgroundColor: getPriorityBadge(data.priority_score, data.priority_level).bg,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}>
                <Zap size={12} /> Score: {data.priority_score || 0}
              </span>

              <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#2563eb', marginLeft: 'auto' }}>
                {data.complaint_code || `R2R-2026-${String(data.id).padStart(4, '0')}`}
              </span>
            </div>

            <h2 style={{ fontSize: '1.4rem', fontWeight: '700', marginBottom: '0.5rem' }}>{data.title}</h2>
            
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: '#64748b', marginBottom: '1.25rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <User size={14} /> Reported by {data.author_name}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Clock size={14} /> {new Date(data.created_at).toLocaleString()}
              </span>
            </div>

            {/* CITIZEN TIMELINE */}
            <div style={{ backgroundColor: '#f8fafc', padding: '1rem 1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1.25rem' }}>
              <ComplaintTimeline complaint={data} updates={data.updates || []} />
            </div>

            {data.image_url && (
              <div style={{ marginBottom: '1.25rem', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0', maxHeight: '300px' }}>
                <img 
                  src={data.image_url} 
                  alt={data.title} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} 
                />
              </div>
            )}

            <div style={{ marginBottom: '1.25rem' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: '600', color: '#334155', marginBottom: '0.35rem' }}>Description</h4>
              <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: '1.6' }}>{data.description}</p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.75rem',
              backgroundColor: '#f8fafc',
              padding: '1rem',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              marginBottom: '1.5rem'
            }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block' }}>Location</span>
                <strong style={{ fontSize: '0.9rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <MapPin size={14} color="#2563eb" /> {data.location}
                </strong>
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block' }}>Category</span>
                <strong style={{ fontSize: '0.9rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Tag size={14} color="#2563eb" /> {data.category}
                </strong>
              </div>
            </div>

            {/* Authority Remarks Log */}
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1.25rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b21a8' }}>
                <Shield size={18} /> Official Municipal Log & Remarks
              </h3>

              {data.updates && data.updates.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {data.updates.map((up) => (
                    <div key={up.id} style={{
                      backgroundColor: '#faf5ff',
                      borderLeft: '4px solid #7c3aed',
                      padding: '0.875rem',
                      borderRadius: '0 8px 8px 0'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#6b21a8', fontWeight: '600', marginBottom: '0.35rem' }}>
                        <span>Officer: {up.official_name}</span>
                        <span>{new Date(up.created_at).toLocaleString()}</span>
                      </div>
                      <p style={{ fontSize: '0.9rem', color: '#334155' }}>{up.update_text}</p>
                      {up.status_change && (
                        <div style={{ fontSize: '0.75rem', color: '#6b21a8', marginTop: '0.35rem' }}>
                          Status changed to: <strong>{up.status_change}</strong>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: '0.9rem', color: '#64748b', fontStyle: 'italic' }}>
                  No official remarks posted yet.
                </p>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
