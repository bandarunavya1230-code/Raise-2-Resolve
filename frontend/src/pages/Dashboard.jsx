import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import ComplaintDetailsModal from '../components/ComplaintDetailsModal';
import AuthorityDashboardView from '../components/AuthorityDashboardView';
import FindAuthorityNearMe from '../components/FindAuthorityNearMe';
import { 
  User, Shield, PlusCircle, List, Eye, ThumbsUp, Zap, Image, 
  AlertTriangle, Building2, MapPin, Compass, CheckCircle2, ArrowRight,
  Edit3, Check
} from 'lucide-react';
import { INDIAN_STATES_AND_UTS, STATE_DISTRICTS } from '../data/indiaGeographicData';

export default function Dashboard() {
  const { user, isAuthority, token } = useContext(AuthContext);
  const routerLocation = useLocation();

  const [activeTab, setActiveTab] = useState(isAuthority ? 'authority_view' : 'report');

  const [allComplaints, setAllComplaints] = useState([]);
  const [myComplaints, setMyComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  // Hierarchy metadata from backend
  const [hierarchy, setHierarchy] = useState({});
  const [departments, setDepartments] = useState([]);

  // Citizen form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Roads/Public Works');
  const [severity, setSeverity] = useState('medium');
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  
  // Location Hierarchy selections & typing mode
  const [locationInputMode, setLocationInputMode] = useState('select'); // 'select' | 'type'
  const [locationType, setLocationType] = useState('city'); // 'village' | 'town' | 'city'
  const [selectedState, setSelectedState] = useState('Karnataka');
  const [selectedDistrict, setSelectedDistrict] = useState('Bengaluru Urban');
  const [selectedCity, setSelectedCity] = useState('Bengaluru');
  const [selectedWard, setSelectedWard] = useState('Ward 82 - Indiranagar');
  const [landmark, setLandmark] = useState('');

  // Auto-detected routing preview
  const [detectedDept, setDetectedDept] = useState('Roads & Public Works Department');
  const [detectedAuthority, setDetectedAuthority] = useState(null);

  const [similarComplaints, setSimilarComplaints] = useState([]);
  const [formMsg, setFormMsg] = useState({ type: '', text: '', code: '' });
  const [submitting, setSubmitting] = useState(false);

  const [activeModalId, setActiveModalId] = useState(null);

  // Load location hierarchy & departments
  useEffect(() => {
    const loadHierarchy = async () => {
      try {
        const [locRes, deptRes] = await Promise.all([
          fetch('/api/locations/hierarchy'),
          fetch('/api/departments')
        ]);
        const locData = await locRes.json();
        const deptData = await deptRes.json();

        if (locData.success) {
          setHierarchy(locData.data || {});
          
          // If prefilled from "Find Authority Near Me"
          if (routerLocation.state?.prefilledLocation) {
            const pl = routerLocation.state.prefilledLocation;
            if (pl.state) setSelectedState(pl.state);
            if (pl.district) setSelectedDistrict(pl.district);
            if (pl.city_town_village) setSelectedCity(pl.city_town_village);
            if (pl.ward_area) setSelectedWard(pl.ward_area);
            if (pl.location_type) setLocationType(pl.location_type);
            if (pl.landmark) setLandmark(pl.landmark);
          }
        }

        if (deptData.success) {
          setDepartments(deptData.data || []);
        }
      } catch (err) {
        console.error('Failed to load location hierarchy:', err);
      }
    };

    loadHierarchy();
  }, [routerLocation.state]);

  // Real-time Authority & Department resolution preview
  useEffect(() => {
    const resolvePreview = async () => {
      try {
        const params = new URLSearchParams({
          state: selectedState,
          district: selectedDistrict,
          city: selectedCity,
          ward: selectedWard,
          category
        });
        const res = await fetch(`/api/authorities/near-me?${params.toString()}`);
        const data = await res.json();
        if (data.success && data.primaryAuthority) {
          setDetectedDept(data.primaryAuthority.department_name);
          setDetectedAuthority(data.primaryAuthority);
        }
      } catch (err) {
        // Fallback calculation
        if (category.includes('Electr')) setDetectedDept('Electricity Department');
        else if (category.includes('Water')) setDetectedDept('Water Supply & Sewage Board');
        else if (category.includes('Road')) setDetectedDept('Roads & Public Works Department');
        else if (category.includes('Sanitat')) setDetectedDept('Sanitation & Solid Waste Management');
        else if (category.includes('Street')) setDetectedDept('Streetlights & Electrical Wing');
        else if (category.includes('Drain')) setDetectedDept('Drainage & Stormwater Department');
        else if (category.includes('Safety')) setDetectedDept('Public Safety & Civil Defense');
        else setDetectedDept('General Municipal Grievances');
      }
    };

    resolvePreview();
  }, [category, selectedState, selectedDistrict, selectedCity, selectedWard]);

  // Fetch complaints
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

  // Asynchronous duplicate check
  useEffect(() => {
    if (!landmark && !title) {
      setSimilarComplaints([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/complaints/check-similar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            category, 
            location: landmark, 
            title,
            ward_area: selectedWard,
            city_town_village: selectedCity
          })
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
  }, [landmark, title, category, selectedWard, selectedCity]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // Submit Complaint
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
      
      const fullLocationString = `${selectedWard}, ${selectedCity}, ${selectedDistrict}, ${selectedState}${landmark ? ` (Near: ${landmark})` : ''}`;
      formData.append('location', fullLocationString);
      formData.append('state', selectedState);
      formData.append('district', selectedDistrict);
      formData.append('city_town_village', selectedCity);
      formData.append('ward_area', selectedWard);
      formData.append('location_type', locationType || 'city');

      if (selectedFile) {
        formData.append('image', selectedFile);
      }

      const res = await fetch('/api/complaints', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();

      if (data.success) {
        setFormMsg({ 
          type: 'success', 
          text: `Complaint logged and auto-routed to ${data.data.department_name}!`,
          code: data.data.complaint_code 
        });
        setTitle('');
        setDescription('');
        setLandmark('');
        setSelectedFile(null);
        setImagePreview(null);
        setSimilarComplaints([]);
        fetchComplaints();
        setActiveTab('my_complaints');
      } else {
        setFormMsg({ type: 'danger', text: data.message || 'Failed to submit complaint.' });
      }
    } catch (err) {
      setFormMsg({ type: 'danger', text: 'Error connecting to the server.' });
    } finally {
      setSubmitting(false);
    }
  };

  // Upvote
  const handleSupport = async (complaintId) => {
    try {
      const res = await fetch(`/api/complaints/${complaintId}/support`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        fetchComplaints();
      }
    } catch (err) {
      console.error('Error supporting complaint:', err);
    }
  };

  // Comprehensive list of all 28 Indian States & 8 Union Territories
  const availableStates = useMemo(() => {
    return INDIAN_STATES_AND_UTS.map(s => s.name);
  }, []);

  // Comprehensive list of all districts for the currently selected State
  const availableDistricts = useMemo(() => {
    if (selectedState && STATE_DISTRICTS[selectedState]) {
      return STATE_DISTRICTS[selectedState];
    }
    return Object.keys(hierarchy[selectedState] || {});
  }, [selectedState, hierarchy]);

  // Suggested cities / towns from hierarchy if available
  const suggestedCities = useMemo(() => {
    if (selectedState && selectedDistrict && hierarchy[selectedState]?.[selectedDistrict]) {
      return Object.keys(hierarchy[selectedState][selectedDistrict]);
    }
    return [];
  }, [selectedState, selectedDistrict, hierarchy]);

  // Suggested wards from hierarchy if available
  const suggestedWards = useMemo(() => {
    if (selectedState && selectedDistrict && selectedCity && hierarchy[selectedState]?.[selectedDistrict]?.[selectedCity]?.wards) {
      return hierarchy[selectedState][selectedDistrict][selectedCity].wards.map(w => w.ward_area);
    }
    return [];
  }, [selectedState, selectedDistrict, selectedCity, hierarchy]);

  const handleStateChange = (state) => {
    setSelectedState(state);
    const districts = STATE_DISTRICTS[state] || Object.keys(hierarchy[state] || {});
    const nextDistrict = districts[0] || '';
    setSelectedDistrict(nextDistrict);
  };

  const handleDistrictChange = (district) => {
    setSelectedDistrict(district);
  };

  const handleCityChange = (city) => {
    setSelectedCity(city);
    const wards = hierarchy[selectedState]?.[selectedDistrict]?.[city]?.wards || [];
    setSelectedWard(wards[0]?.ward_area || '');
  };

  const categories = [
    'Electricity',
    'Water Supply',
    'Roads/Public Works',
    'Sanitation/Waste Management',
    'Streetlights',
    'Drainage',
    'Public Safety',
    'Other'
  ];

  return (
    <div className="container" style={{ padding: '2.5rem 1.5rem', flex: 1 }}>
      
      {/* Top Profile Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '2rem',
        flexWrap: 'wrap',
        gap: '1rem',
        backgroundColor: '#FFFFFF',
        padding: '1.25rem 1.75rem',
        borderRadius: '16px',
        border: '1px solid #E2E8F0',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '50%',
            backgroundColor: isAuthority ? '#0F172A' : '#EFF6FF',
            color: isAuthority ? '#FFFFFF' : '#2563EB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-sm)'
          }}>
            {isAuthority ? <Shield size={24} /> : <User size={24} />}
          </div>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#0F172A', lineHeight: '1.2' }}>
              Welcome, {user?.name}
            </h1>
            <p style={{ color: '#64748B', fontSize: '0.85rem' }}>
              Logged in as <span className={`badge ${isAuthority ? 'badge-authority' : 'badge-citizen'}`}>{user?.role}</span>
              {isAuthority && ` · Municipal Administrative Officer`}
            </p>
          </div>
        </div>

        {/* Dashboard Navigation Tabs */}
        {!isAuthority && (
          <div style={{
            display: 'flex',
            backgroundColor: '#F1F5F9',
            padding: '0.25rem',
            borderRadius: '10px',
            gap: '0.25rem'
          }}>
            <button
              onClick={() => setActiveTab('report')}
              className="btn"
              style={{
                padding: '0.45rem 1rem',
                fontSize: '0.85rem',
                backgroundColor: activeTab === 'report' ? '#FFFFFF' : 'transparent',
                color: activeTab === 'report' ? '#2563EB' : '#64748B',
                boxShadow: activeTab === 'report' ? 'var(--shadow-sm)' : 'none',
                borderRadius: '8px'
              }}
            >
              <PlusCircle size={15} /> Raise Complaint
            </button>
            <button
              onClick={() => setActiveTab('my_complaints')}
              className="btn"
              style={{
                padding: '0.45rem 1rem',
                fontSize: '0.85rem',
                backgroundColor: activeTab === 'my_complaints' ? '#FFFFFF' : 'transparent',
                color: activeTab === 'my_complaints' ? '#2563EB' : '#64748B',
                boxShadow: activeTab === 'my_complaints' ? 'var(--shadow-sm)' : 'none',
                borderRadius: '8px'
              }}
            >
              <List size={15} /> My Complaints ({myComplaints.length})
            </button>
            <button
              onClick={() => setActiveTab('find_authority')}
              className="btn"
              style={{
                padding: '0.45rem 1rem',
                fontSize: '0.85rem',
                backgroundColor: activeTab === 'find_authority' ? '#FFFFFF' : 'transparent',
                color: activeTab === 'find_authority' ? '#2563EB' : '#64748B',
                boxShadow: activeTab === 'find_authority' ? 'var(--shadow-sm)' : 'none',
                borderRadius: '8px'
              }}
            >
              <Compass size={15} /> Find Authority
            </button>
          </div>
        )}
      </div>

      {/* AUTHORITY VIEW */}
      {isAuthority && (
        <AuthorityDashboardView 
          complaints={allComplaints} 
          loading={loading} 
          token={token} 
          onRefresh={fetchComplaints} 
        />
      )}

      {/* CITIZEN VIEW: 1. SUBMIT COMPLAINT */}
      {!isAuthority && activeTab === 'report' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.75rem' }}>
          
          {/* Main Submission Card */}
          <div className="card" style={{ backgroundColor: '#FFFFFF' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <PlusCircle size={20} color="#2563EB" />
              <h2 style={{ fontSize: '1.35rem', fontWeight: '800', color: '#0F172A' }}>
                Raise a Civic Complaint
              </h2>
            </div>
            <p style={{ color: '#64748B', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Select category & location. The system will automatically identify the responsible department & local authority.
            </p>

            {formMsg.text && (
              <div className={`alert alert-${formMsg.type}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle2 size={18} />
                <div>
                  <strong>{formMsg.text}</strong>
                  {formMsg.code && <div>Ticket ID: <strong>{formMsg.code}</strong></div>}
                </div>
              </div>
            )}

            {/* DUPLICATE DETECTION WARNING */}
            {similarComplaints.length > 0 && (
              <div style={{
                backgroundColor: '#FEF3C7',
                border: '1.5px solid #FDE68A',
                borderRadius: '10px',
                padding: '1rem',
                marginBottom: '1.5rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#B45309', fontWeight: '700', marginBottom: '0.4rem' }}>
                  <AlertTriangle size={18} /> Similar Open Issue Detected Nearby!
                </div>
                <p style={{ fontSize: '0.85rem', color: '#92400E', marginBottom: '0.75rem' }}>
                  We found open issue(s) in this same area. Upvoting the existing ticket boosts its priority score without duplicate clutter!
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {similarComplaints.map(sim => (
                    <div key={sim.id} style={{
                      backgroundColor: '#FFFFFF',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: '1px solid #FDE68A',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#2563EB', marginRight: '0.5rem' }}>
                          {sim.complaint_code || `R2R-2026-${sim.id}`}
                        </span>
                        <strong>{sim.title}</strong>
                        <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                          {sim.location} · Upvotes: {sim.support_count || 0}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSupport(sim.id)}
                        className="btn btn-teal"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                      >
                        <ThumbsUp size={12} /> Upvote Existing
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleCreateComplaint}>
              
              {/* Title */}
              <div className="form-group">
                <label htmlFor="title">Issue Summary / Title *</label>
                <input
                  id="title"
                  type="text"
                  placeholder="e.g. Deep pothole damaging vehicles near market entrance"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="form-control"
                  required
                />
              </div>

              {/* Category & Severity */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div className="form-group">
                  <label htmlFor="category">Complaint Category *</label>
                  <select
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="form-control"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="severity">Urgency / Severity Level *</label>
                  <select
                    id="severity"
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value)}
                    className="form-control"
                  >
                    <option value="low">Low (+10 Priority)</option>
                    <option value="medium">Medium (+20 Priority)</option>
                    <option value="high">High (+30 Priority)</option>
                    <option value="critical">Critical (+40 Priority)</option>
                  </select>
                </div>
              </div>

              {/* GEOGRAPHICAL LOCATION HIERARCHY SELECTOR & TYPING OPTION */}
              <div style={{
                backgroundColor: '#F8FAFC',
                padding: '1.25rem',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                marginBottom: '1.25rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#0F172A', fontWeight: '700', fontSize: '0.95rem' }}>
                    <MapPin size={18} color="#2563EB" />
                    <span>Geographical Location Hierarchy</span>
                  </div>

                  {/* Mode Toggle: Dropdown List Selection vs Direct Typing */}
                  <div style={{ display: 'inline-flex', backgroundColor: '#E2E8F0', padding: '0.2rem', borderRadius: '8px', gap: '0.2rem' }}>
                    <button
                      type="button"
                      onClick={() => setLocationInputMode('select')}
                      style={{
                        padding: '0.25rem 0.65rem',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        borderRadius: '6px',
                        border: 'none',
                        cursor: 'pointer',
                        backgroundColor: locationInputMode === 'select' ? '#FFFFFF' : 'transparent',
                        color: locationInputMode === 'select' ? '#2563EB' : '#64748B',
                        boxShadow: locationInputMode === 'select' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none'
                      }}
                    >
                      📋 Select from List
                    </button>
                    <button
                      type="button"
                      onClick={() => setLocationInputMode('type')}
                      style={{
                        padding: '0.25rem 0.65rem',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        borderRadius: '6px',
                        border: 'none',
                        cursor: 'pointer',
                        backgroundColor: locationInputMode === 'type' ? '#FFFFFF' : 'transparent',
                        color: locationInputMode === 'type' ? '#2563EB' : '#64748B',
                        boxShadow: locationInputMode === 'type' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none'
                      }}
                    >
                      ✍️ Direct Typing Mode
                    </button>
                  </div>
                </div>

                {/* 1. Locality Type Selector (Village / Town / City) */}
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '0.35rem' }}>
                    Locality Type *
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {[
                      { id: 'village', label: '🌾 Village (Gram Panchayat)' },
                      { id: 'town', label: '🏘️ Town (Municipality)' },
                      { id: 'city', label: '🏢 City (Municipal Corporation)' }
                    ].map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setLocationType(t.id)}
                        style={{
                          padding: '0.35rem 0.75rem',
                          borderRadius: '8px',
                          fontSize: '0.8rem',
                          fontWeight: '700',
                          border: locationType === t.id ? '1.5px solid #2563EB' : '1px solid #CBD5E1',
                          backgroundColor: locationType === t.id ? '#EFF6FF' : '#FFFFFF',
                          color: locationType === t.id ? '#1D4ED8' : '#475569',
                          cursor: 'pointer'
                        }}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.85rem' }}>
                  {/* State / UT */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#334155' }}>
                      State / Union Territory *
                    </label>
                    {locationInputMode === 'select' ? (
                      <select
                        value={selectedState}
                        onChange={(e) => handleStateChange(e.target.value)}
                        className="form-control"
                        style={{ fontSize: '0.85rem', backgroundColor: '#FFFFFF' }}
                        required
                      >
                        {availableStates.map(st => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>
                    ) : (
                      <>
                        <input
                          type="text"
                          list="state-list-datalist"
                          value={selectedState}
                          onChange={(e) => handleStateChange(e.target.value)}
                          placeholder="Type State or UT..."
                          className="form-control"
                          style={{ fontSize: '0.85rem', backgroundColor: '#FFFFFF' }}
                          required
                        />
                        <datalist id="state-list-datalist">
                          {availableStates.map(st => (
                            <option key={st} value={st} />
                          ))}
                        </datalist>
                      </>
                    )}
                  </div>

                  {/* District */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#334155' }}>
                      District *
                    </label>
                    {locationInputMode === 'select' ? (
                      <select
                        value={selectedDistrict}
                        onChange={(e) => handleDistrictChange(e.target.value)}
                        className="form-control"
                        style={{ fontSize: '0.85rem', backgroundColor: '#FFFFFF' }}
                        required
                      >
                        {availableDistricts.length > 0 ? (
                          availableDistricts.map(dist => (
                            <option key={dist} value={dist}>{dist}</option>
                          ))
                        ) : (
                          <option value={selectedDistrict}>{selectedDistrict || 'Select District'}</option>
                        )}
                      </select>
                    ) : (
                      <>
                        <input
                          type="text"
                          list="district-list-datalist"
                          value={selectedDistrict}
                          onChange={(e) => handleDistrictChange(e.target.value)}
                          placeholder="Type District..."
                          className="form-control"
                          style={{ fontSize: '0.85rem', backgroundColor: '#FFFFFF' }}
                          required
                        />
                        <datalist id="district-list-datalist">
                          {availableDistricts.map(dist => (
                            <option key={dist} value={dist} />
                          ))}
                        </datalist>
                      </>
                    )}
                  </div>

                  {/* Village / Town / City (Typing Input with Suggestions) */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#334155' }}>
                      {locationType === 'village' ? 'Village Name *' : locationType === 'town' ? 'Town Name *' : 'City Name *'}
                    </label>
                    <input
                      type="text"
                      list="city-suggestions-datalist"
                      value={selectedCity}
                      onChange={(e) => setSelectedCity(e.target.value)}
                      placeholder={
                        locationType === 'village'
                          ? "Type Village name (e.g. Rampura, Hosahalli)"
                          : locationType === 'town'
                          ? "Type Town name (e.g. Ramanagara, Hoskote)"
                          : "Type City name (e.g. Bengaluru, Mysuru, Hubballi)"
                      }
                      className="form-control"
                      style={{ fontSize: '0.85rem', backgroundColor: '#FFFFFF' }}
                      required
                    />
                    <datalist id="city-suggestions-datalist">
                      {suggestedCities.map(c => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </div>

                  {/* Area / Ward (Typing Input with Suggestions) */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#334155' }}>
                      Area / Ward / Locality *
                    </label>
                    <input
                      type="text"
                      list="ward-suggestions-datalist"
                      value={selectedWard}
                      onChange={(e) => setSelectedWard(e.target.value)}
                      placeholder="Type Area or Ward (e.g. Ward 82, Indiranagar, Main Road)"
                      className="form-control"
                      style={{ fontSize: '0.85rem', backgroundColor: '#FFFFFF' }}
                      required
                    />
                    <datalist id="ward-suggestions-datalist">
                      {suggestedWards.map(w => (
                        <option key={w} value={w} />
                      ))}
                    </datalist>
                  </div>
                </div>

                {/* Specific Street / Landmark */}
                <div className="form-group" style={{ marginTop: '0.85rem', marginBottom: 0 }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#334155' }}>
                    Street Name / Landmark Reference *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Opposite Community Hall, 2nd Cross, Near Metro Pillar 12"
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    className="form-control"
                    style={{ fontSize: '0.85rem', backgroundColor: '#FFFFFF' }}
                    required
                  />
                </div>

                {/* Confirmation Hierarchy Strip */}
                <div style={{
                  marginTop: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  backgroundColor: '#EFF6FF',
                  borderRadius: '6px',
                  border: '1px solid #BFDBFE',
                  fontSize: '0.775rem',
                  color: '#1E40AF',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  flexWrap: 'wrap'
                }}>
                  <MapPin size={13} color="#2563EB" />
                  <span><strong>Hierarchy:</strong> {selectedWard || '[Ward/Area]'} • {selectedCity || '[Village/Town/City]'} ({locationType}) • {selectedDistrict || '[District]'}, {selectedState || '[State]'}</span>
                </div>
              </div>

              {/* Description */}
              <div className="form-group">
                <label htmlFor="description">Detailed Description *</label>
                <textarea
                  id="description"
                  rows="3"
                  placeholder="Provide details about the issue (e.g. how long it has been broken, danger to public, etc.)..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="form-control"
                  required
                />
              </div>

              {/* Photo Evidence Upload */}
              <div className="form-group">
                <label htmlFor="image">Attach Photo Evidence (Optional)</label>
                <input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="form-control"
                />
                {imagePreview && (
                  <div style={{ marginTop: '0.75rem', width: '120px', height: '120px', borderRadius: '10px', overflow: 'hidden', border: '1px solid #E2E8F0' }}>
                    <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '0.85rem', fontSize: '1rem' }}
                disabled={submitting}
              >
                {submitting ? 'Routing Complaint & Calculating Priority...' : 'Submit Civic Complaint'}
              </button>
            </form>
          </div>

          {/* Right Column: Dynamic Routing & Authority Preview (Requirement 3 & 4) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Auto-routing Preview Box */}
            <div className="card" style={{
              backgroundColor: '#FFFFFF',
              border: '1.5px solid #BAE6FD',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
                <Building2 size={20} color="#0284C7" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0F172A' }}>
                  Automatic Department Routing
                </h3>
              </div>

              <p style={{ fontSize: '0.85rem', color: '#64748B', lineHeight: '1.5', marginBottom: '1rem' }}>
                Based on your selected category and geographical location, your complaint will be automatically routed:
              </p>

              <div style={{
                backgroundColor: '#F0F9FF',
                padding: '1rem',
                borderRadius: '10px',
                border: '1px solid #BAE6FD',
                marginBottom: '1rem'
              }}>
                <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#0369A1', textTransform: 'uppercase' }}>
                  Responsible Department
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0F172A', marginTop: '0.2rem' }}>
                  {detectedDept}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#0369A1', marginTop: '0.25rem' }}>
                  No manual authority search needed
                </div>
              </div>

              {detectedAuthority && (
                <div style={{
                  backgroundColor: '#F8FAFC',
                  padding: '1rem',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0'
                }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>
                    Jurisdiction Authority
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#0F172A', marginTop: '0.2rem' }}>
                    {detectedAuthority.authority_name}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#2563EB', fontWeight: '600' }}>
                    {detectedAuthority.authority_title}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '0.4rem' }}>
                    📍 {detectedAuthority.jurisdiction_level}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748B' }}>
                    📞 Helpline: {detectedAuthority.authority_contact}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Helper Tips */}
            <div className="card" style={{ backgroundColor: '#FFFFFF' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: '700', marginBottom: '0.5rem', color: '#0F172A' }}>
                Civic Resolution Steps
              </h4>
              <ul style={{ paddingLeft: '1.25rem', fontSize: '0.85rem', color: '#64748B', lineHeight: '1.6' }}>
                <li>Your ticket receives a unique tracking code (e.g. <code>R2R-2026-XXXX</code>).</li>
                <li>Priority score is derived from severity + category safety impact.</li>
                <li>Your neighbors can upvote your issue to accelerate resolution.</li>
                <li>Municipal authority verifies and logs status updates in real time.</li>
              </ul>
            </div>

          </div>

        </div>
      )}

      {/* CITIZEN VIEW: 2. MY SUBMITTED COMPLAINTS */}
      {!isAuthority && activeTab === 'my_complaints' && (
        <div className="card" style={{ backgroundColor: '#FFFFFF' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: '800', color: '#0F172A' }}>
                My Submitted Complaints ({myComplaints.length})
              </h2>
              <p style={{ color: '#64748B', fontSize: '0.85rem' }}>
                Track the status, handling department, and resolution timeline of your reports
              </p>
            </div>
            <button onClick={() => setActiveTab('report')} className="btn btn-primary" style={{ fontSize: '0.85rem' }}>
              <PlusCircle size={15} /> Raise Another Issue
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3.5rem', color: '#64748B' }}>
              <div className="spinner" style={{ marginBottom: '1rem' }} />
              <p>Loading your complaints...</p>
            </div>
          ) : myComplaints.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3.5rem 1.5rem' }}>
              <Building2 size={36} color="#94A3B8" style={{ margin: '0 auto 1rem auto' }} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#0F172A', marginBottom: '0.5rem' }}>
                No Complaints Filed Yet
              </h3>
              <p style={{ color: '#64748B', marginBottom: '1.25rem', maxWidth: '420px', margin: '0 auto 1.25rem auto' }}>
                Spot a civic issue in your neighborhood? Submit it with photo evidence to trigger municipal action.
              </p>
              <button onClick={() => setActiveTab('report')} className="btn btn-primary">
                Raise Your First Complaint
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
              {myComplaints.map(c => (
                <div key={c.id} className="card card-hover" style={{
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0'
                }}>
                  {/* Card Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.65rem' }}>
                    <span className={`badge badge-${c.status}`}>
                      {c.status.replace('_', ' ')}
                    </span>
                    <span style={{ fontSize: '0.8rem', fontWeight: '800', color: '#2563EB' }}>
                      {c.complaint_code || `R2R-2026-${c.id}`}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#0F172A', marginBottom: '0.35rem' }}>
                    {c.title}
                  </h3>

                  {/* Responsible Department Banner */}
                  <div style={{
                    fontSize: '0.75rem',
                    color: '#0369A1',
                    backgroundColor: '#F0F9FF',
                    border: '1px solid #BAE6FD',
                    padding: '0.35rem 0.65rem',
                    borderRadius: '6px',
                    marginBottom: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}>
                    <Building2 size={13} color="#0284C7" />
                    <strong>{c.department_name || 'General Municipal Grievances'}</strong>
                  </div>

                  <p style={{ color: '#475569', fontSize: '0.875rem', marginBottom: '0.85rem', flexGrow: 1, lineHeight: '1.5' }}>
                    {c.description}
                  </p>

                  <div style={{ fontSize: '0.8rem', color: '#64748B', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <div>📍 <strong>Location:</strong> {c.location}</div>
                    <div>🏛️ <strong>Authority:</strong> {c.authority_name || 'Municipal Officer'}</div>
                  </div>

                  <div style={{
                    borderTop: '1px solid #F1F5F9',
                    paddingTop: '0.75rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{ fontSize: '0.78rem', color: '#64748B' }}>
                      Upvotes: <strong>{c.support_count || 0}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveModalId(c.id)}
                      className="btn btn-outline"
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                    >
                      <Eye size={13} /> View Timeline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CITIZEN VIEW: 3. FIND AUTHORITY NEAR ME TAB */}
      {!isAuthority && activeTab === 'find_authority' && (
        <FindAuthorityNearMe />
      )}

      {/* DETAILS MODAL */}
      {activeModalId && (
        <ComplaintDetailsModal
          complaintId={activeModalId}
          onClose={() => setActiveModalId(null)}
          token={token}
          onSupportToggle={fetchComplaints}
        />
      )}

    </div>
  );
}
