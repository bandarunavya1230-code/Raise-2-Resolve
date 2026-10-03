import React, { useState, useEffect, useContext } from 'react';
import { 
  X, MapPin, Tag, Shield, Clock, User, Zap, Info, ShieldCheck, 
  Flag, Building2, Phone, Mail, ArrowRightLeft, UserCheck, Wrench, CheckCircle2 
} from 'lucide-react';
import ComplaintTimeline from './ComplaintTimeline';
import { AuthContext } from '../context/AuthContext';

export default function ComplaintDetailsModal({ complaintId, onClose, token, onSupportToggle }) {
  const { user, isAuthority } = useContext(AuthContext);

  const [data, setData] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMsg, setActionMsg] = useState('');

  // Authority Action Modals / Forms
  const [activeAction, setActiveAction] = useState(''); // 'verify' | 'assign' | 'reassign' | 'status'
  
  // Assign state
  const [assignedTo, setAssignedTo] = useState('');
  const [assignInstructions, setAssignInstructions] = useState('');
  
  // Reassign state
  const [targetDeptId, setTargetDeptId] = useState('');
  const [reassignReason, setReassignReason] = useState('');
  
  // Verify & Department Assignment state
  const [verifyDeptId, setVerifyDeptId] = useState('');
  const [verifyRemarks, setVerifyRemarks] = useState('');

  // Status update state
  const [newStatus, setNewStatus] = useState('in_progress');
  const [updateRemarks, setUpdateRemarks] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  const fetchDetails = async () => {
    try {
      const [res, deptRes] = await Promise.all([
        fetch(`/api/complaints/${complaintId}`),
        fetch('/api/departments')
      ]);
      const result = await res.json();
      const deptResult = await deptRes.json();

      if (result.success) {
        setData(result.data);
        if (result.data.department_id) {
          setVerifyDeptId(String(result.data.department_id));
        }
      } else {
        setError(result.message || 'Failed to load details.');
      }

      if (deptResult.success) {
        setDepartments(deptResult.data || []);
      }
    } catch (err) {
      setError('Error connecting to server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!complaintId) return;
    fetchDetails();
  }, [complaintId]);

  if (!complaintId) return null;

  // 1. Verify & Department Assignment Handler
  const handleVerify = async () => {
    setSubmittingAction(true);
    setActionMsg('');
    try {
      const chosenDept = departments.find(d => String(d.id) === String(verifyDeptId));
      const res = await fetch(`/api/complaints/${complaintId}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          remarks: verifyRemarks || (chosenDept ? `Verified and assigned to ${chosenDept.name} for on-ground resolution.` : 'Official verification conducted by municipal authority.'),
          department_id: chosenDept ? chosenDept.id : undefined,
          department_name: chosenDept ? chosenDept.name : undefined
        })
      });
      const resData = await res.json();
      if (resData.success) {
        setActionMsg(resData.message);
        setActiveAction('');
        fetchDetails();
        if (onSupportToggle) onSupportToggle();
      } else {
        setError(resData.message || 'Failed to update verification status.');
      }
    } catch (err) {
      setError('Failed to update verification status.');
    } finally {
      setSubmittingAction(false);
    }
  };

  // 2. Assign Field Crew Handler
  const handleAssign = async (e) => {
    e.preventDefault();
    if (!assignedTo) return;
    setSubmittingAction(true);
    setActionMsg('');
    try {
      const res = await fetch(`/api/complaints/${complaintId}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          assigned_to: assignedTo,
          instructions: assignInstructions
        })
      });
      const resData = await res.json();
      if (resData.success) {
        setActionMsg(resData.message);
        setActiveAction('');
        fetchDetails();
        if (onSupportToggle) onSupportToggle();
      }
    } catch (err) {
      setError('Failed to assign work crew.');
    } finally {
      setSubmittingAction(false);
    }
  };

  // 3. Reassign Department Handler
  const handleReassign = async (e) => {
    e.preventDefault();
    if (!targetDeptId || !reassignReason) return;
    setSubmittingAction(true);
    setActionMsg('');
    try {
      const res = await fetch(`/api/complaints/${complaintId}/reassign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          target_department_id: targetDeptId,
          reason: reassignReason
        })
      });
      const resData = await res.json();
      if (resData.success) {
        setActionMsg(resData.message);
        setActiveAction('');
        setReassignReason('');
        fetchDetails();
        if (onSupportToggle) onSupportToggle();
      }
    } catch (err) {
      setError('Failed to reassign department.');
    } finally {
      setSubmittingAction(false);
    }
  };

  // 4. Status Update Handler
  const handleStatusUpdate = async (e) => {
    e.preventDefault();
    if (!updateRemarks) return;
    setSubmittingAction(true);
    setActionMsg('');
    try {
      const res = await fetch(`/api/complaints/${complaintId}/authority-update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status_change: newStatus,
          update_text: updateRemarks,
          action_type: newStatus === 'resolved' ? 'resolution' : 'progress'
        })
      });
      const resData = await res.json();
      if (resData.success) {
        setActionMsg(resData.message);
        setActiveAction('');
        setUpdateRemarks('');
        fetchDetails();
        if (onSupportToggle) onSupportToggle();
      }
    } catch (err) {
      setError('Failed to update status.');
    } finally {
      setSubmittingAction(false);
    }
  };

  const getPriorityBadge = (score, level) => {
    if (level === 'Urgent' || score >= 65) return { bg: '#DC2626', text: 'Urgent' };
    if (level === 'High' || score >= 45) return { bg: '#EA580C', text: 'High' };
    return { bg: '#2563EB', text: 'Normal' };
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(3px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1.5rem'
    }}>
      <div className="card" style={{
        maxWidth: '740px',
        width: '100%',
        maxHeight: '92vh',
        overflowY: 'auto',
        position: 'relative',
        padding: '2rem',
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '16px',
        boxShadow: 'var(--shadow-lg)'
      }}>
        {/* Close Button */}
        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            border: 'none',
            background: '#F1F5F9',
            borderRadius: '50%',
            width: '34px',
            height: '34px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#64748B'
          }}
          aria-label="Close modal"
        >
          <X size={20} />
        </button>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3.5rem', color: '#64748B' }}>
            <div className="spinner" style={{ marginBottom: '1rem' }} />
            <p>Loading complaint details and routing timeline...</p>
          </div>
        ) : error ? (
          <div className="alert alert-danger">{error}</div>
        ) : data ? (
          <div>
            {/* Header Badges */}
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap' }}>
              <span className={`badge badge-${data.status}`}>
                {data.status.replace('_', ' ')}
              </span>
              
              <span className="badge badge-dept">
                <Building2 size={12} /> {data.department_name || 'General Municipal Grievances'}
              </span>

              {data.is_verified === 1 && (
                <span className="badge badge-verified">
                  <ShieldCheck size={12} /> Verified & Assigned: {data.department_name || 'Designated Department'}
                </span>
              )}

              {data.reassignment_count > 0 && (
                <span className="badge" style={{ backgroundColor: '#F0F9FF', color: '#0369A1', border: '1px solid #BAE6FD' }}>
                  <ArrowRightLeft size={11} /> Reassigned ({data.reassignment_count})
                </span>
              )}

              <span style={{
                fontSize: '0.75rem',
                fontWeight: '700',
                padding: '0.2rem 0.6rem',
                borderRadius: '9999px',
                color: '#ffffff',
                backgroundColor: getPriorityBadge(data.priority_score, data.priority_level).bg,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                marginLeft: 'auto'
              }}>
                <Zap size={11} /> Score {data.priority_score || 0}
              </span>
            </div>

            {/* Action Feedback Message */}
            {actionMsg && (
              <div className="alert alert-success" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle2 size={16} /> {actionMsg}
              </div>
            )}

            {/* Title & Ticket Code */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h2 style={{ fontSize: '1.45rem', fontWeight: '800', color: '#0F172A', lineHeight: '1.25' }}>
                {data.title}
              </h2>
              <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#2563EB', backgroundColor: '#EFF6FF', padding: '0.25rem 0.65rem', borderRadius: '6px' }}>
                {data.complaint_code || `R2R-2026-${String(data.id).padStart(4, '0')}`}
              </span>
            </div>

            {/* Description */}
            <p style={{ color: '#334155', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '1.25rem' }}>
              {data.description}
            </p>

            {/* Assigned Authority Box */}
            <div style={{
              backgroundColor: '#F0F9FF',
              border: '1px solid #BAE6FD',
              borderRadius: '10px',
              padding: '1rem',
              marginBottom: '1.25rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#0369A1', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Assigned Authority & Jurisdiction
                </span>
                <span className="badge badge-jurisdiction">
                  {data.jurisdiction_level || 'Municipal Ward Level'}
                </span>
              </div>
              <div style={{ fontSize: '1rem', fontWeight: '700', color: '#0F172A' }}>
                {data.authority_name || 'Central Municipal Office'}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: '0.2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <span><strong>Helpline:</strong> {data.authority_contact || '1800-200-3532'}</span>
                <span><strong>Jurisdiction:</strong> {data.city_town_village} ({data.ward_area || 'Ward General'})</span>
              </div>
            </div>

            {/* Metadata Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '0.75rem',
              backgroundColor: '#F8FAFC',
              padding: '1rem',
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              marginBottom: '1.25rem',
              fontSize: '0.85rem'
            }}>
              <div>
                <span style={{ color: '#64748B' }}>Category:</span>{' '}
                <strong style={{ color: '#0F172A' }}>{data.category}</strong>
              </div>
              <div>
                <span style={{ color: '#64748B' }}>Location / Landmark:</span>{' '}
                <strong style={{ color: '#0F172A' }}>{data.location}</strong>
              </div>
              <div>
                <span style={{ color: '#64748B' }}>Submitted By:</span>{' '}
                <strong style={{ color: '#0F172A' }}>{data.author_name}</strong>
              </div>
              <div>
                <span style={{ color: '#64748B' }}>Community Upvotes:</span>{' '}
                <strong style={{ color: '#0F172A' }}>{data.support_count || 0}</strong>
              </div>
            </div>

            {/* Photo Evidence */}
            {data.image_url && (
              <div style={{ marginBottom: '1.25rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '0.5rem' }}>
                  Photo Evidence:
                </span>
                <div style={{
                  borderRadius: '10px',
                  overflow: 'hidden',
                  maxHeight: '260px',
                  border: '1px solid #E2E8F0',
                  backgroundColor: '#0F172A'
                }}>
                  <img 
                    src={data.image_url} 
                    alt="Complaint Evidence" 
                    style={{ width: '100%', height: '100%', objectFit: 'contain', maxHeight: '260px' }} 
                  />
                </div>
              </div>
            )}

            {/* 5-STAGE STATUS TIMELINE & AUDIT TRAIL */}
            <ComplaintTimeline 
              complaint={data} 
              updates={data.updates || []} 
              reassignments={data.reassignments || []} 
            />

            {/* AUTHORITY WORKFLOW ACTIONS (If logged in as Authority) */}
            {isAuthority && (
              <div style={{
                marginTop: '1.5rem',
                paddingTop: '1.25rem',
                borderTop: '1px solid #E2E8F0'
              }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#0F172A', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Shield size={16} color="#2563EB" /> Authority Management & Verification Actions
                </h4>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                  {/* Verify & Assign button */}
                  <button
                    type="button"
                    onClick={() => {
                      if (data.is_verified) {
                        handleVerify();
                      } else {
                        setActiveAction(activeAction === 'verify' ? '' : 'verify');
                      }
                    }}
                    className="btn btn-teal"
                    style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem' }}
                    disabled={submittingAction}
                  >
                    <ShieldCheck size={15} /> {data.is_verified ? 'Revoke Verification' : 'Verify & Assign Department'}
                  </button>

                  {/* Assign button */}
                  <button
                    type="button"
                    onClick={() => setActiveAction(activeAction === 'assign' ? '' : 'assign')}
                    className="btn btn-primary"
                    style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem' }}
                  >
                    <UserCheck size={15} /> Assign Crew
                  </button>

                  {/* Reassign Department button */}
                  <button
                    type="button"
                    onClick={() => setActiveAction(activeAction === 'reassign' ? '' : 'reassign')}
                    className="btn btn-outline"
                    style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem', color: '#0284C7', borderColor: '#BAE6FD' }}
                  >
                    <ArrowRightLeft size={15} /> Reassign Department
                  </button>

                  {/* Status update button */}
                  <button
                    type="button"
                    onClick={() => setActiveAction(activeAction === 'status' ? '' : 'status')}
                    className="btn btn-secondary"
                    style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem' }}
                  >
                    <Wrench size={15} /> Update Progress / Resolve
                  </button>
                </div>

                {/* Sub-form: Verify and Assign to Particular Department */}
                {activeAction === 'verify' && !data.is_verified && (
                  <form onSubmit={(e) => { e.preventDefault(); handleVerify(); }} style={{ backgroundColor: '#F0FDFA', padding: '1.15rem', borderRadius: '10px', border: '1px solid #CCFBF1', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#0F766E', fontWeight: '700', fontSize: '0.9rem', marginBottom: '0.35rem' }}>
                      <ShieldCheck size={17} color="#0D9488" />
                      <span>Official Verification & Department Assignment</span>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: '#64748B', marginBottom: '0.85rem' }}>
                      After verification, this issue is officially assigned to the selected municipal department responsible for execution.
                    </p>

                    <div className="form-group" style={{ marginBottom: '0.85rem' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#334155' }}>
                        Assign to Department *
                      </label>
                      <select
                        value={verifyDeptId}
                        onChange={(e) => setVerifyDeptId(e.target.value)}
                        className="form-control"
                        required
                        style={{ fontSize: '0.85rem' }}
                      >
                        <option value="">-- Choose Respective Department --</option>
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name} ({d.category})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group" style={{ marginBottom: '0.85rem' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#334155' }}>
                        Verification Notes / Remarks (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Physical on-ground verification complete. Dispatched to department head."
                        value={verifyRemarks}
                        onChange={(e) => setVerifyRemarks(e.target.value)}
                        className="form-control"
                        style={{ fontSize: '0.85rem' }}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        onClick={() => setActiveAction('')}
                        className="btn btn-secondary"
                        style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem' }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submittingAction || !verifyDeptId}
                        className="btn btn-teal"
                        style={{ padding: '0.45rem 1rem', fontSize: '0.85rem', fontWeight: '700' }}
                      >
                        Confirm Verification & Assign Department
                      </button>
                    </div>
                  </form>
                )}

                {/* Sub-form: Assign Field Crew */}
                {activeAction === 'assign' && (
                  <form onSubmit={handleAssign} style={{ backgroundColor: '#F8FAFC', padding: '1rem', borderRadius: '10px', border: '1px solid #E2E8F0', marginBottom: '1rem' }}>
                    <h5 style={{ fontSize: '0.9rem', fontWeight: '700', marginBottom: '0.5rem' }}>Assign Field Engineer / Crew</h5>
                    <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                      <label style={{ fontSize: '0.8rem' }}>Assigned Person / Team *</label>
                      <input
                        type="text"
                        placeholder="e.g. Indiranagar PWD Rapid Response Crew #2"
                        value={assignedTo}
                        onChange={(e) => setAssignedTo(e.target.value)}
                        className="form-control"
                        required
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                      <label style={{ fontSize: '0.8rem' }}>Work Instructions</label>
                      <input
                        type="text"
                        placeholder="e.g. Inspect crater depth, fill bitumen, verify drainage seal"
                        value={assignInstructions}
                        onChange={(e) => setAssignInstructions(e.target.value)}
                        className="form-control"
                      />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }} disabled={submittingAction}>
                      {submittingAction ? 'Assigning...' : 'Dispatch Assignment'}
                    </button>
                  </form>
                )}

                {/* Sub-form: Reassign Department */}
                {activeAction === 'reassign' && (
                  <form onSubmit={handleReassign} style={{ backgroundColor: '#F0F9FF', padding: '1rem', borderRadius: '10px', border: '1px solid #BAE6FD', marginBottom: '1rem' }}>
                    <h5 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#0369A1', marginBottom: '0.5rem' }}>
                      Transfer to Correct Department (Audit Trail Logged)
                    </h5>
                    <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                      <label style={{ fontSize: '0.8rem' }}>Target Department *</label>
                      <select
                        value={targetDeptId}
                        onChange={(e) => setTargetDeptId(e.target.value)}
                        className="form-control"
                        required
                      >
                        <option value="">Select target department...</option>
                        {departments.map(d => (
                          <option key={d.id} value={d.id}>{d.name} ({d.category})</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                      <label style={{ fontSize: '0.8rem' }}>Reason for Reassignment *</label>
                      <input
                        type="text"
                        placeholder="e.g. Issue involves underground water mains rather than road resurfacing"
                        value={reassignReason}
                        onChange={(e) => setReassignReason(e.target.value)}
                        className="form-control"
                        required
                      />
                    </div>
                    <button type="submit" className="btn btn-sky" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }} disabled={submittingAction}>
                      {submittingAction ? 'Transferring...' : 'Confirm Department Reassignment'}
                    </button>
                  </form>
                )}

                {/* Sub-form: Status Update */}
                {activeAction === 'status' && (
                  <form onSubmit={handleStatusUpdate} style={{ backgroundColor: '#F8FAFC', padding: '1rem', borderRadius: '10px', border: '1px solid #E2E8F0', marginBottom: '1rem' }}>
                    <h5 style={{ fontSize: '0.9rem', fontWeight: '700', marginBottom: '0.5rem' }}>Update Status & Post Official Remarks</h5>
                    <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                      <label style={{ fontSize: '0.8rem' }}>Next Status *</label>
                      <select
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value)}
                        className="form-control"
                      >
                        <option value="in_progress">In Progress (Active Work)</option>
                        <option value="resolved">Resolved (Completed & Verified)</option>
                        <option value="rejected">Rejected (Invalid / Non-civic)</option>
                      </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                      <label style={{ fontSize: '0.8rem' }}>Official Municipal Remark *</label>
                      <textarea
                        rows="2"
                        placeholder="Detail the work carried out or status update..."
                        value={updateRemarks}
                        onChange={(e) => setUpdateRemarks(e.target.value)}
                        className="form-control"
                        required
                      />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }} disabled={submittingAction}>
                      {submittingAction ? 'Updating...' : 'Post Official Status Update'}
                    </button>
                  </form>
                )}

              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
