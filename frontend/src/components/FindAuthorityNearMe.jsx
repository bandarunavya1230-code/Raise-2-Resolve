import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MapPin, Navigation, Building2, Phone, Mail, Shield, 
  CheckCircle2, Compass, AlertCircle, ChevronRight, Filter, Users 
} from 'lucide-react';

export default function FindAuthorityNearMe({ onSelectLocation, isEmbedded = false }) {
  const [activeTab, setActiveTab] = useState('gps'); // 'gps' | 'manual'
  
  // Hierarchy data from API
  const [hierarchy, setHierarchy] = useState({});
  const [departments, setDepartments] = useState([]);
  const [loadingHierarchy, setLoadingHierarchy] = useState(true);

  // Manual selection states
  const [selectedState, setSelectedState] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedWard, setSelectedWard] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('All');

  // GPS state
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState('');
  
  // Results
  const [result, setResult] = useState(null);
  const [loadingResult, setLoadingResult] = useState(false);

  const navigate = useNavigate();

  // Fetch location hierarchy & departments
  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const [locRes, deptRes] = await Promise.all([
          fetch('/api/locations/hierarchy'),
          fetch('/api/departments')
        ]);
        const locData = await locRes.json();
        const deptData = await deptRes.json();

        if (locData.success) {
          setHierarchy(locData.data || {});
          // Pre-select first state/district if available
          const states = Object.keys(locData.data || {});
          if (states.length > 0) {
            setSelectedState(states[0]);
            const districts = Object.keys(locData.data[states[0]] || {});
            if (districts.length > 0) {
              setSelectedDistrict(districts[0]);
              const cities = Object.keys(locData.data[states[0]][districts[0]] || {});
              if (cities.length > 0) {
                setSelectedCity(cities[0]);
                const wards = locData.data[states[0]][districts[0]][cities[0]].wards || [];
                if (wards.length > 0) {
                  setSelectedWard(wards[0].ward_area);
                }
              }
            }
          }
        }

        if (deptData.success) {
          setDepartments(deptData.data || []);
        }
      } catch (err) {
        console.error('Failed to load location metadata:', err);
      } finally {
        setLoadingHierarchy(false);
      }
    };

    loadMetadata();
  }, []);

  // Fetch authority for manual location
  const handleManualSearch = async () => {
    if (!selectedCity) return;
    setLoadingResult(true);
    try {
      const params = new URLSearchParams({
        state: selectedState,
        district: selectedDistrict,
        city: selectedCity,
        ward: selectedWard,
        category: selectedDepartment !== 'All' ? selectedDepartment : ''
      });
      const res = await fetch(`/api/authorities/near-me?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setResult(data);
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoadingResult(false);
    }
  };

  // Initial load search once hierarchy is ready
  useEffect(() => {
    if (selectedCity && !result) {
      handleManualSearch();
    }
  }, [selectedCity]);

  // GPS handler
  const handleGetLocation = () => {
    setGpsError('');
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser. Please use manual location selection below.');
      setActiveTab('manual');
      return;
    }

    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(`/api/authorities/near-me?lat=${latitude}&lng=${longitude}`);
          const data = await res.json();
          if (data.success) {
            setResult(data);
          } else {
            setGpsError('Could not resolve authority near your exact coordinates. Please choose manually.');
          }
        } catch (err) {
          setGpsError('Error identifying nearby authority from GPS.');
        } finally {
          setGpsLoading(false);
        }
      },
      (error) => {
        setGpsLoading(false);
        if (error.code === error.PERMISSION_DENIED) {
          setGpsError('Location permission denied. Please select your State, District, and City/Village manually.');
        } else {
          setGpsError('Unable to retrieve GPS location. Please select your location manually.');
        }
        setActiveTab('manual');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Cascade selections
  const availableStates = Object.keys(hierarchy);
  const availableDistricts = selectedState ? Object.keys(hierarchy[selectedState] || {}) : [];
  const availableCities = (selectedState && selectedDistrict) 
    ? Object.keys(hierarchy[selectedState][selectedDistrict] || {}) 
    : [];
  const cityData = (selectedState && selectedDistrict && selectedCity)
    ? hierarchy[selectedState][selectedDistrict][selectedCity]
    : null;
  const availableWards = cityData ? cityData.wards : [];

  const handleStateChange = (state) => {
    setSelectedState(state);
    const districts = Object.keys(hierarchy[state] || {});
    const nextDistrict = districts[0] || '';
    setSelectedDistrict(nextDistrict);
    
    const cities = nextDistrict ? Object.keys(hierarchy[state][nextDistrict] || {}) : [];
    const nextCity = cities[0] || '';
    setSelectedCity(nextCity);

    const wards = (nextCity && hierarchy[state][nextDistrict][nextCity]) ? hierarchy[state][nextDistrict][nextCity].wards : [];
    setSelectedWard(wards[0]?.ward_area || '');
  };

  const handleDistrictChange = (district) => {
    setSelectedDistrict(district);
    const cities = Object.keys(hierarchy[selectedState][district] || {});
    const nextCity = cities[0] || '';
    setSelectedCity(nextCity);

    const wards = (nextCity && hierarchy[selectedState][district][nextCity]) ? hierarchy[selectedState][district][nextCity].wards : [];
    setSelectedWard(wards[0]?.ward_area || '');
  };

  const handleCityChange = (city) => {
    setSelectedCity(city);
    const wards = hierarchy[selectedState][selectedDistrict][city]?.wards || [];
    setSelectedWard(wards[0]?.ward_area || '');
  };

  const handleApplyToForm = () => {
    if (onSelectLocation && result?.resolvedLocation) {
      onSelectLocation({
        state: selectedState,
        district: selectedDistrict,
        city_town_village: selectedCity,
        ward_area: selectedWard,
        location_type: cityData?.type || 'city',
        authority: result.primaryAuthority
      });
    } else {
      navigate('/dashboard', {
        state: {
          prefilledLocation: {
            state: selectedState,
            district: selectedDistrict,
            city_town_village: selectedCity,
            ward_area: selectedWard,
            location_type: cityData?.type || 'city'
          }
        }
      });
    }
  };

  return (
    <div className={isEmbedded ? "" : "card"} style={{
      backgroundColor: '#ffffff',
      border: '1px solid #E2E8F0',
      borderRadius: '16px',
      padding: isEmbedded ? '1.5rem 0' : '2rem'
    }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            backgroundColor: '#EFF6FF',
            color: '#2563EB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Compass size={24} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.35rem', fontWeight: '800', color: '#0F172A', lineHeight: '1.2' }}>
              Find Authority Near Me
            </h3>
            <p style={{ color: '#64748B', fontSize: '0.875rem' }}>
              Locate the responsible village, town, or city civic authority for your jurisdiction
            </p>
          </div>
        </div>

        {/* Tab Toggle */}
        <div style={{
          display: 'flex',
          backgroundColor: '#F1F5F9',
          padding: '0.25rem',
          borderRadius: '10px',
          gap: '0.25rem'
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('gps')}
            className="btn"
            style={{
              padding: '0.4rem 0.85rem',
              fontSize: '0.85rem',
              backgroundColor: activeTab === 'gps' ? '#ffffff' : 'transparent',
              color: activeTab === 'gps' ? '#2563EB' : '#64748B',
              boxShadow: activeTab === 'gps' ? 'var(--shadow-sm)' : 'none',
              borderRadius: '8px'
            }}
          >
            <Navigation size={15} /> Use GPS
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('manual')}
            className="btn"
            style={{
              padding: '0.4rem 0.85rem',
              fontSize: '0.85rem',
              backgroundColor: activeTab === 'manual' ? '#ffffff' : 'transparent',
              color: activeTab === 'manual' ? '#2563EB' : '#64748B',
              boxShadow: activeTab === 'manual' ? 'var(--shadow-sm)' : 'none',
              borderRadius: '8px'
            }}
          >
            <MapPin size={15} /> Select Jurisdiction
          </button>
        </div>
      </div>

      {/* GPS MODE */}
      {activeTab === 'gps' && (
        <div style={{
          padding: '1.5rem',
          backgroundColor: '#F8FAFC',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          marginBottom: '1.5rem',
          textAlign: 'center'
        }}>
          <p style={{ color: '#334155', fontSize: '0.925rem', marginBottom: '1.25rem', maxWidth: '580px', margin: '0 auto 1.25rem auto' }}>
            Allow temporary browser location access to automatically determine your local village panchayat, town council, or city municipal zone.
          </p>
          
          <button
            type="button"
            onClick={handleGetLocation}
            className="btn btn-primary"
            style={{ padding: '0.75rem 1.75rem', fontSize: '0.95rem' }}
            disabled={gpsLoading}
          >
            <Navigation size={18} /> {gpsLoading ? 'Detecting Coordinates...' : 'Detect My Local Authority'}
          </button>

          {gpsError && (
            <div style={{
              marginTop: '1rem',
              color: '#991B1B',
              backgroundColor: '#FEE2E2',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}>
              <AlertCircle size={16} /> {gpsError}
            </div>
          )}
        </div>
      )}

      {/* MANUAL LOCATION HIERARCHY SELECTOR */}
      {activeTab === 'manual' && (
        <div style={{
          padding: '1.25rem',
          backgroundColor: '#F8FAFC',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          marginBottom: '1.5rem'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '0.85rem',
            alignItems: 'flex-end'
          }}>
            {/* 1. State */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569' }}>1. State</label>
              <select
                value={selectedState}
                onChange={(e) => handleStateChange(e.target.value)}
                className="form-control"
                style={{ fontSize: '0.875rem' }}
              >
                {availableStates.map(st => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>

            {/* 2. District */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569' }}>2. District</label>
              <select
                value={selectedDistrict}
                onChange={(e) => handleDistrictChange(e.target.value)}
                className="form-control"
                style={{ fontSize: '0.875rem' }}
              >
                {availableDistricts.map(dist => (
                  <option key={dist} value={dist}>{dist}</option>
                ))}
              </select>
            </div>

            {/* 3. Village / Town / City */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569' }}>
                3. Village / Town / City
              </label>
              <select
                value={selectedCity}
                onChange={(e) => handleCityChange(e.target.value)}
                className="form-control"
                style={{ fontSize: '0.875rem' }}
              >
                {availableCities.map(c => {
                  const type = hierarchy[selectedState]?.[selectedDistrict]?.[c]?.type || 'city';
                  const typeLabel = type === 'village' ? '🌾 Village' : type === 'town' ? '🏘️ Town' : '🏢 City';
                  return (
                    <option key={c} value={c}>{typeLabel}: {c}</option>
                  );
                })}
              </select>
            </div>

            {/* 4. Ward / Area */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569' }}>4. Ward / Area</label>
              <select
                value={selectedWard}
                onChange={(e) => setSelectedWard(e.target.value)}
                className="form-control"
                style={{ fontSize: '0.875rem' }}
              >
                {availableWards.map(w => (
                  <option key={w.id || w.ward_area} value={w.ward_area}>{w.ward_area}</option>
                ))}
              </select>
            </div>

            {/* Find Button */}
            <div>
              <button
                type="button"
                onClick={handleManualSearch}
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.7rem 1rem', fontSize: '0.875rem' }}
                disabled={loadingResult}
              >
                {loadingResult ? 'Resolving...' : 'Lookup Authority'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESULT DISPLAY */}
      {result && result.primaryAuthority && (
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1.5px solid #BAE6FD',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-sm)'
        }}>
          {/* Jurisdiction Header */}
          <div style={{
            backgroundColor: '#F0F9FF',
            padding: '1rem 1.5rem',
            borderBottom: '1px solid #BAE6FD',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="badge badge-verified" style={{ backgroundColor: '#2563EB', color: '#ffffff' }}>
                <Building2 size={13} /> {result.primaryAuthority.jurisdiction_level}
              </span>
              <span style={{ fontSize: '0.85rem', color: '#0369A1', fontWeight: '600' }}>
                {result.resolvedLocation?.city_town_village} · {result.resolvedLocation?.ward_area}
              </span>
            </div>

            {result.resolvedLocation?.distanceKm && (
              <span style={{ fontSize: '0.8rem', color: '#0369A1', fontWeight: '700' }}>
                📍 ~{result.resolvedLocation.distanceKm} km from your GPS
              </span>
            )}
          </div>

          {/* Authority Information Body */}
          <div style={{ padding: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '1.25rem' }}>
              
              {/* Primary Office Box */}
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Responsible Administrative Officer
                </span>
                <h4 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0F172A', marginTop: '0.2rem', marginBottom: '0.25rem' }}>
                  {result.primaryAuthority.authority_name}
                </h4>
                <div style={{ fontSize: '0.9rem', color: '#2563EB', fontWeight: '600', marginBottom: '0.75rem' }}>
                  {result.primaryAuthority.authority_title}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.875rem', color: '#334155' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Phone size={15} color="#14B8A6" />
                    <strong>Helpline:</strong> {result.primaryAuthority.authority_contact}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Mail size={15} color="#14B8A6" />
                    <strong>Email:</strong> {result.primaryAuthority.department_contact_email}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginTop: '0.2rem' }}>
                    <MapPin size={15} color="#14B8A6" style={{ marginTop: '0.2rem', flexShrink: 0 }} />
                    <span><strong>Office:</strong> {result.primaryAuthority.authority_office}</span>
                  </div>
                </div>
              </div>

              {/* Department Desks Available in Jurisdiction */}
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Active Local Department Desks ({result.localAuthorities?.length || 1})
                </span>
                <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: '150px', overflowY: 'auto' }}>
                  {(result.localAuthorities || []).map(la => (
                    <div key={la.id} style={{
                      padding: '0.5rem 0.75rem',
                      backgroundColor: '#F8FAFC',
                      borderRadius: '8px',
                      border: '1px solid #E2E8F0',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.825rem'
                    }}>
                      <div>
                        <strong>{la.department_name}</strong>
                        <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{la.name}</div>
                      </div>
                      <span className="badge badge-dept" style={{ fontSize: '0.7rem' }}>
                        {la.contact_phone || 'Available'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Action Bar */}
            <div style={{
              borderTop: '1px solid #E2E8F0',
              paddingTop: '1rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.75rem'
            }}>
              <span style={{ fontSize: '0.85rem', color: '#64748B' }}>
                Complaints submitted in this area are automatically routed here.
              </span>
              <button
                type="button"
                onClick={handleApplyToForm}
                className="btn btn-primary"
                style={{ padding: '0.5rem 1.25rem', fontSize: '0.875rem' }}
              >
                File Complaint Under This Authority &rarr;
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
