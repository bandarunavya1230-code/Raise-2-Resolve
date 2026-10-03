import React from 'react';
import { CheckCircle2, Clock, AlertTriangle, ShieldCheck, Flag, Wrench } from 'lucide-react';

export default function ComplaintTimeline({ complaint, updates = [] }) {
  if (!complaint) return null;

  const isVerified = complaint.is_verified === 1;
  const isFlagged = complaint.is_flagged === 1;
  const status = complaint.status;

  // Build timeline steps dynamically
  const steps = [
    {
      title: 'Report Submitted',
      subtitle: `Filed by ${complaint.author_name || 'Citizen'}`,
      date: new Date(complaint.created_at).toLocaleString(),
      completed: true,
      current: status === 'pending' && !isVerified && !isFlagged,
      icon: Clock,
      color: '#2563eb'
    },
    {
      title: isFlagged ? 'Flagged / Invalid' : isVerified ? 'Verified by Authority' : 'Pending Verification',
      subtitle: isFlagged 
        ? (complaint.flag_reason || 'Marked as invalid by municipal team') 
        : isVerified 
        ? 'Field inspection confirmed civic issue validity' 
        : 'Under municipal review',
      date: updates.find(u => u.action_type === 'verification' || u.action_type === 'flagged')?.created_at 
        ? new Date(updates.find(u => u.action_type === 'verification' || u.action_type === 'flagged').created_at).toLocaleString() 
        : null,
      completed: isVerified || isFlagged,
      current: isVerified && status === 'pending',
      icon: isFlagged ? Flag : ShieldCheck,
      color: isFlagged ? '#ef4444' : isVerified ? '#7c3aed' : '#94a3b8'
    },
    {
      title: 'Work In Progress',
      subtitle: status === 'in_progress' ? 'Municipal team dispatched for repair' : 'Awaiting work assignment',
      date: updates.find(u => u.status_change === 'in_progress')?.created_at 
        ? new Date(updates.find(u => u.status_change === 'in_progress').created_at).toLocaleString() 
        : null,
      completed: status === 'in_progress' || status === 'resolved',
      current: status === 'in_progress',
      icon: Wrench,
      color: '#0284c7'
    },
    {
      title: 'Issue Resolved',
      subtitle: status === 'resolved' ? 'Resolution completed & verified' : 'Final resolution pending',
      date: updates.find(u => u.status_change === 'resolved')?.created_at 
        ? new Date(updates.find(u => u.status_change === 'resolved').created_at).toLocaleString() 
        : null,
      completed: status === 'resolved',
      current: status === 'resolved',
      icon: CheckCircle2,
      color: '#16a34a'
    }
  ];

  return (
    <div style={{ padding: '1rem 0' }}>
      <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#334155', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <Clock size={16} color="#2563eb" /> Resolution Timeline & Progress
      </h4>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative', paddingLeft: '1.75rem' }}>
        {/* Timeline Connecting Line */}
        <div style={{
          position: 'absolute',
          left: '11px',
          top: '8px',
          bottom: '12px',
          width: '2px',
          backgroundColor: '#e2e8f0',
          zIndex: 1
        }} />

        {steps.map((step, idx) => {
          const IconComp = step.icon;
          return (
            <div key={idx} style={{ position: 'relative', zIndex: 2 }}>
              {/* Icon Marker */}
              <div style={{
                position: 'absolute',
                left: '-1.75rem',
                top: '0px',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: step.completed ? step.color : '#f1f5f9',
                border: step.current ? `3px solid ${step.color}` : '2px solid white',
                color: step.completed ? 'white' : '#94a3b8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: step.current ? '0 0 0 3px rgba(37, 99, 235, 0.2)' : 'none'
              }}>
                <IconComp size={12} />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: step.completed ? '700' : '500', color: step.completed ? '#0f172a' : '#64748b' }}>
                    {step.title}
                  </span>
                  {step.date && (
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{step.date}</span>
                  )}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.15rem' }}>
                  {step.subtitle}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
