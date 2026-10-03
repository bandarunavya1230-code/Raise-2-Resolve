import React from 'react';
import { 
  CheckCircle2, Clock, ShieldCheck, Flag, Wrench, 
  ArrowRightLeft, UserCheck, Building2, AlertTriangle 
} from 'lucide-react';

export default function ComplaintTimeline({ complaint, updates = [], reassignments = [] }) {
  if (!complaint) return null;

  const isVerified = complaint.is_verified === 1 || complaint.verification_status === 'verified';
  const isFlagged = complaint.is_flagged === 1 || complaint.status === 'rejected';
  const status = complaint.status;

  // The 5-stage official workflow:
  // Submitted -> Under Verification -> Assigned -> In Progress -> Resolved
  const isSubmittedDone = true;
  const isVerificationDone = isVerified || status === 'assigned' || status === 'in_progress' || status === 'resolved';
  const isAssignedDone = status === 'assigned' || status === 'in_progress' || status === 'resolved';
  const isInProgressDone = status === 'in_progress' || status === 'resolved';
  const isResolvedDone = status === 'resolved';

  const verificationEvent = updates.find(u => u.action_type === 'verification');
  const assignmentEvent = updates.find(u => u.action_type === 'assignment');
  const inProgressEvent = updates.find(u => u.status_change === 'in_progress');
  const resolvedEvent = updates.find(u => u.status_change === 'resolved');

  const steps = [
    {
      stage: 'Submitted',
      title: 'Complaint Submitted & Routed',
      subtitle: `Routed to ${complaint.department_name || 'Responsible Department'} under ${complaint.jurisdiction_level || 'Local Jurisdiction'}`,
      date: complaint.created_at ? new Date(complaint.created_at).toLocaleString() : null,
      completed: isSubmittedDone,
      current: status === 'pending' && !isVerified && !isFlagged,
      icon: Clock,
      color: '#2563EB'
    },
    {
      stage: 'Under Verification',
      title: isFlagged ? 'Report Rejected / Flagged' : isVerified ? 'Verified by Authority' : 'Under Authority Verification',
      subtitle: isFlagged 
        ? (complaint.flag_reason || 'Marked as rejected / outside municipal jurisdiction') 
        : isVerified 
        ? (verificationEvent?.update_text || 'Official Authority verified on-ground legitimacy') 
        : `Awaiting inspection by ${complaint.authority_name || 'Designated Officer'}`,
      date: verificationEvent?.created_at ? new Date(verificationEvent.created_at).toLocaleString() : null,
      completed: isVerificationDone || isFlagged,
      current: isVerified && status === 'verified',
      icon: isFlagged ? Flag : ShieldCheck,
      color: isFlagged ? '#EF4444' : isVerified ? '#0D9488' : '#94A3B8'
    },
    {
      stage: 'Assigned',
      title: complaint.assigned_to ? `Assigned to ${complaint.assigned_to}` : 'Department Work Assignment',
      subtitle: complaint.assigned_to 
        ? (assignmentEvent?.update_text || `Field crew assigned by ${complaint.authority_name || 'Authority'}`)
        : 'Pending crew dispatch & work order issuance',
      date: assignmentEvent?.created_at ? new Date(assignmentEvent.created_at).toLocaleString() : null,
      completed: isAssignedDone,
      current: status === 'assigned',
      icon: UserCheck,
      color: '#0284C7'
    },
    {
      stage: 'In Progress',
      title: 'Resolution In Progress',
      subtitle: status === 'in_progress' 
        ? (inProgressEvent?.update_text || 'Ground repair/cleanup operations actively underway') 
        : 'Awaiting on-site field team mobilization',
      date: inProgressEvent?.created_at ? new Date(inProgressEvent.created_at).toLocaleString() : null,
      completed: isInProgressDone,
      current: status === 'in_progress',
      icon: Wrench,
      color: '#F59E0B'
    },
    {
      stage: 'Resolved',
      title: 'Issue Resolved & Closed',
      subtitle: status === 'resolved' 
        ? (resolvedEvent?.update_text || 'Completed and verified by municipal authority') 
        : 'Final completion confirmation pending',
      date: resolvedEvent?.created_at ? new Date(resolvedEvent.created_at).toLocaleString() : null,
      completed: isResolvedDone,
      current: status === 'resolved',
      icon: CheckCircle2,
      color: '#10B981'
    }
  ];

  return (
    <div style={{
      backgroundColor: '#F8FAFC',
      borderRadius: '12px',
      border: '1px solid #E2E8F0',
      padding: '1.25rem',
      margin: '1.25rem 0'
    }}>
      {/* Header Info Banner */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.5rem',
        paddingBottom: '0.85rem',
        marginBottom: '1rem',
        borderBottom: '1px solid #E2E8F0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Building2 size={16} color="#2563EB" />
          <span style={{ fontSize: '0.85rem', color: '#64748B' }}>
            Current Responsible Department:
          </span>
          <strong style={{ fontSize: '0.9rem', color: '#0F172A' }}>
            {complaint.department_name || 'General Municipal Grievances'}
          </strong>
        </div>

        <span className={`badge badge-${complaint.status}`}>
          Status: {complaint.status.replace('_', ' ')}
        </span>
      </div>

      {/* 5-Step Timeline List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', position: 'relative', paddingLeft: '1.75rem' }}>
        {/* Connecting Vertical Line */}
        <div style={{
          position: 'absolute',
          left: '11px',
          top: '10px',
          bottom: '14px',
          width: '2px',
          backgroundColor: '#E2E8F0',
          zIndex: 1
        }} />

        {steps.map((step, idx) => {
          const IconComp = step.icon;
          return (
            <div key={idx} style={{ position: 'relative', zIndex: 2 }}>
              {/* Step Circle Node */}
              <div style={{
                position: 'absolute',
                left: '-1.75rem',
                top: '0px',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: step.completed ? step.color : '#FFFFFF',
                border: step.current ? `3px solid ${step.color}` : step.completed ? `2px solid ${step.color}` : '2px solid #CBD5E1',
                color: step.completed ? '#FFFFFF' : '#94A3B8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: step.current ? `0 0 0 3px rgba(37, 99, 235, 0.2)` : 'none'
              }}>
                <IconComp size={12} strokeWidth={2.5} />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.25rem' }}>
                  <span style={{
                    fontSize: '0.9rem',
                    fontWeight: step.completed ? '700' : '500',
                    color: step.completed ? '#0F172A' : '#64748B'
                  }}>
                    {step.title}
                  </span>
                  {step.date && (
                    <span style={{ fontSize: '0.75rem', color: '#64748B', backgroundColor: '#FFFFFF', padding: '0.15rem 0.45rem', borderRadius: '4px', border: '1px solid #E2E8F0' }}>
                      {step.date}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '0.2rem' }}>
                  {step.subtitle}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* DEPARTMENT REASSIGNMENT AUDIT TRAIL */}
      {reassignments && reassignments.length > 0 && (
        <div style={{
          marginTop: '1.25rem',
          paddingTop: '1rem',
          borderTop: '1px solid #E2E8F0'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.85rem',
            fontWeight: '700',
            color: '#0369A1',
            marginBottom: '0.65rem'
          }}>
            <ArrowRightLeft size={15} color="#0284C7" />
            <span>Department Reassignment Audit History ({reassignments.length})</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {reassignments.map((r, i) => (
              <div key={i} style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '8px',
                padding: '0.65rem 0.85rem',
                border: '1px solid #BAE6FD',
                fontSize: '0.8rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <span style={{ color: '#0369A1', fontWeight: '700' }}>
                    {r.from_department_name} &rarr; {r.to_department_name}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: '#94A3B8' }}>
                    {new Date(r.created_at).toLocaleString()}
                  </span>
                </div>
                <div style={{ color: '#334155' }}>
                  <strong>Reason:</strong> "{r.reason}"
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '0.2rem' }}>
                  Authorized by: {r.reassigned_by_name || 'Municipal Officer'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
