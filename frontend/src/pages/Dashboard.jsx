import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import ComplaintDetailsModal from '../components/ComplaintDetailsModal';
import AuthorityDashboardView from '../components/AuthorityDashboardView';
import { 
  User, Shield, PlusCircle, List, Eye, ThumbsUp, Zap, Image, AlertTriangle 
} from 'lucide-react';

export default function Dashboard() {
  const { user, isAuthority, token } = useContext(AuthContext);

  const [activeTab, setActiveTab] = useState('report');

  const [allComplaints, setAllComplaints] = useState([]);
  const [myComplaints, setMyComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  // Citizen form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Roads & Potholes');
  const [severity, setSeverity] = useState('medium');
  const [location, setLocation] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  
  const [similarComplaints, setSimilarComplaints] = useState([]);

  const [formMsg, setFormMsg] = useState({ type: '', text: '', code: '' });
  const [submitting, setSubmitting] = useState(false);

  const [activeModalId, setActiveModalId] = useState(null);

  const fetchComplaints = async () => {
    try {
      const resAll = await fetch('/api/complaints');
      const dataAll = await resAll.json();
      if (dataAll.success) {
        setAllComplaints(dataAll.data);
      }

      if (token && !isAuthority) {
        const resMy = await fetch('/api/complaints/my', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const dataMy = await resMy.json();
        if (dataMy.success) {
          setMyComplaints(dataMy.data);
        }
      }
    } catch (err) {
      console.error('Error fetching complaints:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, [token, isAuthority]);

  // Asynchronous duplicate check for citizens
  useEffect(() => {
    if (!location && !title) {
      setSimilarComplaints([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/complaints/check-similar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ category, location, title })
        });
        const data = await res.json();
        if (data.success && data.matches) {
          setSimilarComplaints(data.matches);
        }
      } catch (err) {
        console.error('Duplicate check error:', err);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [location, title, category]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleCreateComplaint = async (e) => {
    e.preventDefault();
    setFormMsg({ type: '', text: '', code: '' });
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('category', category);
      formData.append('severity', severity);
      formData.append('location', location);
      if (selectedFile) {
        formData.append('image', selectedFile);
      }

      const res = await fetch('/api/complaints', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();

      if (data.success) {
        const generatedCode = data.data.complaint_code || `R2R-2026-${String(data.data.id).padStart(4, '0')}`;
        setFormMsg({ 
          type: 'success', 
          text: `Issue reported with automatic Priority Score (${data.data.priority_score || 20})!`,
          code: generatedCode
        });
        
        setTitle('');
        setDescription('');
        setLocation('');
        setSelectedFile(null);
        setImagePreview(null);
        setSeverity('medium');
        setSimilarComplaints([]);

        fetchComplaints();
      } else {
        setFormMsg({ type: 'danger', text: data.message || 'Failed to submit complaint.' });
      }
    } catch (err) {
      setFormMsg({ type: 'danger', text: 'An error occurred during submission.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSupportExisting = async (complaintId) => {
    try {
      const res = await fetch(`/api/complaints/${complaintId}/support`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setFormMsg({
          type: 'success',
          text: `You supported existing issue #${complaintId}! Priority score boosted to ${data.priority_score}.`,
          code: ''
        });
        setSimilarComplaints([]);
        fetchComplaints();
      }
    } catch (err) {
      console.error('Error supporting existing complaint:', err);
    }
  };

  return (
    <div className="container" style={{ padding: '2.5rem 1.5rem' }}>
      {/* User Header Profile Banner */}
      <div className="card" style={{
        marginBottom: '2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: isAuthority ? '#faf5ff' : '#ffffff',
        borderColor: isAuthority ? '#d8b4fe' : '#e2e8f0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            backgroundColor: isAuthority ? '#7c3aed' : '#2563eb',
            padding: '1rem',
            borderRadius: '50%',
            color: 'white',
            display: 'flex'
          }}>
            {isAuthority ? <Shield size={32} /> : <User size={32} />}
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: '700' }}>{user?.name}</h1>
            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
              {user?.email} &bull; <span className={`badge ${isAuthority ? 'badge-authority' : 'badge-citizen'}`}>{user?.role}</span>
            </p>
          </div>
        </div>

        {!isAuthority && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              onClick={() => setActiveTab('report')} 
              className={`btn ${activeTab === 'report' ? 'btn-primary' : 'btn-outline'}`}
            >
              <PlusCircle size={16} /> Report Issue
            </button>
            <button 
              onClick={() => setActiveTab('my_complaints')} 
              className={`btn ${activeTab === 'my_complaints' ? 'btn-primary' : 'btn-outline'}`}
            >
              <List size={16} /> My Complaints ({myComplaints.length})
            </button>
          </div>
        )}
      </div>

      {/* RENDER AUTHORITY DASHBOARD VS CITIZEN DASHBOARD */}
      {isAuthority ? (
        <AuthorityDashboardView 
          complaints={allComplaints} 
          loading={loading} 
          token={token} 
          onRefresh={fetchComplaints} 
        />
      ) : (
        /* CITIZEN DASHBOARD */
        <div>
          {activeTab === 'report' && (
            <div className="card" style={{ maxWidth: '750px', margin: '0 auto' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: '700', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <PlusCircle size={22} color="#2563eb" /> Report Civic Issue
              </h2>
              <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                Priority score will be calculated automatically based on severity, category, and community upvotes.
              </p>

              {formMsg.text && (
                <div className={`alert alert-${formMsg.type}`}>
                  <div>{formMsg.text}</div>
                  {formMsg.code && (
                    <div style={{ marginTop: '0.35rem', fontWeight: '700', fontSize: '0.95rem' }}>
                      Generated Complaint Code: <span style={{ textDecoration: 'underline' }}>{formMsg.code}</span>
                    </div>
                  )}
                </div>
              )}

              {/* SIMILAR / DUPLICATE WARNING ALERT */}
              {similarComplaints.length > 0 && (
                <div style={{
                  backgroundColor: '#fffbebf0',
                  border: '2px solid #f59e0b',
                  borderRadius: '8px',
                  padding: '1.25rem',
                  marginBottom: '1.5rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#b45309', fontWeight: '700', fontSize: '1rem', marginBottom: '0.5rem' }}>
                    <AlertTriangle size={20} /> Similar Issue Detected Nearby!
                  </div>
                  <p style={{ fontSize: '0.9rem', color: '#92400e', marginBottom: '0.75rem' }}>
                    We found existing open issue(s) matching your location/category. Supporting an existing issue increases its Priority Score!
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {similarComplaints.map(sc => (
                      <div key={sc.id} style={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #fde68a',
                        borderRadius: '6px',
                        padding: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}>
                        <div>
                          <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#2563eb', marginRight: '0.5rem' }}>
                            {sc.complaint_code || `R2R-2026-${String(sc.id).padStart(4, '0')}`}
                          </span>
                          <strong style={{ fontSize: '0.9rem' }}>{sc.title}</strong>
                          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                            {sc.location} &bull; Upvotes: {sc.support_count || 0} &bull; Priority Score: {sc.priority_score}
                          </div>
                        </div>

                        <button 
                          type="button"
                          onClick={() => handleSupportExisting(sc.id)}
                          className="btn btn-primary"
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', backgroundColor: '#f59e0b', borderColor: '#d97706' }}
                        >
                          <ThumbsUp size={14} /> Support Existing
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <form onSubmit={handleCreateComplaint}>
                <div className="form-group">
                  <label htmlFor="title">Issue Title *</label>
                  <input
                    id="title"
                    type="text"
                    className="form-control"
                    placeholder="e.g. Open manhole cover near school"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label htmlFor="category">Category *</label>
                    <select
                      id="category"
                      className="form-control"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      <option value="Roads & Potholes">Roads & Potholes</option>
                      <option value="Water Supply">Water Supply</option>
                      <option value="Waste Management">Waste Management</option>
                      <option value="Electricity & Lighting">Electricity & Lighting</option>
                      <option value="Drainage & Sewage">Drainage & Sewage</option>
                      <option value="Public Safety">Public Safety</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="severity">Severity Level *</label>
                    <select
                      id="severity"
                      className="form-control"
                      value={severity}
                      onChange={(e) => setSeverity(e.target.value)}
                    >
                      <option value="low">Low (+10 Score)</option>
                      <option value="medium">Medium (+20 Score)</option>
                      <option value="high">High (+30 Score)</option>
                      <option value="critical">Critical (+40 Score)</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="location">Location / Landmark *</label>
                  <input
                    id="location"
                    type="text"
                    className="form-control"
                    placeholder="e.g. 5th Cross Road, Indiranagar"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="description">Detailed Description *</label>
                  <textarea
                    id="description"
                    className="form-control"
                    rows="3"
                    placeholder="Describe the issue..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                  ></textarea>
                </div>

                <div className="form-group">
                  <label htmlFor="image" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Image size={16} color="#2563eb" /> Attach Photo (Multer Upload)
                  </label>
                  <input
                    id="image"
                    type="file"
                    accept="image/*"
                    className="form-control"
                    onChange={handleFileChange}
                  />
                  {imagePreview && (
                    <div style={{ marginTop: '0.75rem', width: '120px', height: '120px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
                      <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}
                </div>

                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }} 
                  disabled={submitting}
                >
                  {submitting ? 'Calculating Priority & Saving...' : 'Submit Civic Complaint'}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'my_complaints' && (
            <div className="card">
              <h2 style={{ fontSize: '1.4rem', fontWeight: '700', marginBottom: '1rem' }}>
                My Submitted Complaints ({myComplaints.length})
              </h2>

              {loading ? (
                <p style={{ color: '#64748b' }}>Loading...</p>
              ) : myComplaints.length === 0 ? (
                <p style={{ color: '#64748b' }}>No complaints filed yet.</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
                  {myComplaints.map((c) => (
                    <div key={c.id} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.25rem', backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <span className={`badge badge-${c.status}`}>{c.status.replace('_', ' ')}</span>
                        <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#2563eb' }}>
                          {c.complaint_code || `R2R-2026-${String(c.id).padStart(4, '0')}`}
                        </span>
                      </div>

                      <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.35rem' }}>{c.title}</h3>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: '#1e40af', backgroundColor: '#eff6ff', padding: '0.3rem 0.5rem', borderRadius: '4px', marginBottom: '0.5rem' }}>
                        <Zap size={12} /> Priority Score: <strong>{c.priority_score || 0}</strong> ({c.priority_level})
                      </div>

                      <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '0.75rem', flexGrow: 1 }}>{c.description}</p>

                      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Upvotes: {c.support_count || 0}</span>
                        <button 
                          onClick={() => setActiveModalId(c.id)} 
                          className="btn btn-outline" 
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                        >
                          <Eye size={14} /> Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeModalId && (
        <ComplaintDetailsModal
          complaintId={activeModalId}
          onClose={() => setActiveModalId(null)}
          token={token}
          onSupportToggle={() => fetchComplaints()}
        />
      )}
    </div>
  );
}
