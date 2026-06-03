import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  ShieldCheck, 
  Users, 
  BarChart3, 
  Search, 
  Bell, 
  Settings,
  MoreVertical,
  CheckCircle2,
  XCircle,
  Smartphone,
  MapPin
} from 'lucide-react';
import './DashboardV2.css';

const DashboardV2 = () => {
  // Tabs: 'batch', 'single', 'history'
  const [activeTab, setActiveTab] = useState('batch');

  // Batch Audit States
  const [batchResult, setBatchResult] = useState(null);
  const [isBatchAuditing, setIsBatchAuditing] = useState(false);
  const [error, setError] = useState(null);
  
  // Single Simulation States
  const [formData, setFormData] = useState({
    name: 'Auditor Demo',
    income: 150000,
    creditScore: 650,
    location: 'Lagos',
    gender: 'Male',
    criminalRecord: false
  });
  const [singleResult, setSingleResult] = useState(null);
  const [isSingleAuditing, setIsSingleAuditing] = useState(false);

  // General Settings
  const [biasSettings, setBiasSettings] = useState({
    penalizeLocation: true,
    genderBias: true,
    strictCriminalRecord: true
  });

  // History States
  const [historyList, setHistoryList] = useState([]);

  const API_URL = import.meta.env.VITE_API_URL || '';

  // Load history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('leba_audit_history');
    if (saved) {
      try {
        setHistoryList(JSON.parse(saved));
      } catch (e) {
        console.error('Error parsing history', e);
      }
    }
  }, []);

  const saveAuditToHistory = (type, summaryText, detailData) => {
    const newHistoryItem = {
      id: `AUDIT-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type, // 'Batch' or 'Single'
      summary: summaryText,
      settings: { ...biasSettings },
      details: detailData
    };
    const updated = [newHistoryItem, ...historyList].slice(0, 50); // limit to 50 items
    setHistoryList(updated);
    localStorage.setItem('leba_audit_history', JSON.stringify(updated));
  };

  const clearHistory = () => {
    setHistoryList([]);
    localStorage.removeItem('leba_audit_history');
  };

  const runBatchAudit = async () => {
    setIsBatchAuditing(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/audit/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: 100, biasSettings })
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setBatchResult(data);
      saveAuditToHistory(
        'Batch Audit',
        `Ran batch audit for 100 cases. Fairness Score: ${data.summary.fairnessScore}%. Disparate Impact Ratio: ${data.metrics.genderParity.disparateImpactRatio}.`,
        data.summary
      );
    } catch (err) {
      console.error('Batch Audit failed:', err);
      setError(err.message);
    } finally {
      setIsBatchAuditing(false);
    }
  };

  const runSingleSimulation = async () => {
    setIsSingleAuditing(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formData, biasSettings })
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setSingleResult(data);
      saveAuditToHistory(
        'Single Simulation',
        `Simulated applicant ${formData.name} (${formData.gender}, ₦${formData.income.toLocaleString()}, ${formData.location}). Decision: ${data.approved ? 'Approved' : 'Denied'} (Score: ${data.score}%).`,
        { name: formData.name, approved: data.approved, score: data.score }
      );
    } catch (err) {
      console.error('Single simulation failed:', err);
      setError(err.message);
    } finally {
      setIsSingleAuditing(false);
    }
  };

  useEffect(() => { 
    runBatchAudit(); 
  }, []);

  // Reusable Bar Chart Component
  const BarChart = ({ data, labelKey, valueKey, color = "#7462f3" }) => {
    if (!data || data.length === 0) {
      return (
        <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', fontSize: '0.8rem', border: '1px dashed #333', borderRadius: '12px' }}>
          Insufficient data for analysis
        </div>
      );
    }
    return (
      <svg className="svg-chart" viewBox="0 0 400 200">
        {data.map((d, i) => {
          const val = d[valueKey] || 0;
          const barHeight = Math.max((val / 1) * 150, 5); // Min height of 5px
          const xPos = i * (400 / data.length) + 10;
          const barWidth = Math.max((400 / data.length) - 15, 10);
          return (
            <g key={i}>
              <rect 
                x={xPos} 
                y={170 - barHeight} 
                width={barWidth} 
                height={barHeight} 
                fill={color}
                className="bar-rect"
              />
              <text 
                x={xPos + barWidth / 2} 
                y="190" 
                fill="#666" 
                fontSize="10" 
                textAnchor="middle"
              >
                {d[labelKey]}
              </text>
            </g>
          );
        })}
      </svg>
    );
  };

  return (
    <div className="dashboard-v2">
      <aside className="sidebar">
        <div className={`side-icon ${activeTab === 'batch' ? 'active' : ''}`} onClick={() => setActiveTab('batch')} title="Batch Auditing">
          <LayoutDashboard size={24} />
        </div>
        <div className={`side-icon ${activeTab === 'single' ? 'active' : ''}`} onClick={() => setActiveTab('single')} title="Single Applicant Simulator">
          <ShieldCheck size={24} />
        </div>
        <div className={`side-icon ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')} title="Audit History Logs">
          <Users size={24} />
        </div>
      </aside>

      <main className="main-content">
        <header className="header-v2">
          <div>
            <h1>Hello, Auditor! 👋</h1>
            <p style={{ color: '#aaa' }}>Interactive Bias Engine Audit Suite.</p>
          </div>
          <div className="tab-buttons">
            <button className={`tab-btn ${activeTab === 'batch' ? 'active' : ''}`} onClick={() => setActiveTab('batch')}>
              Batch Analytics
            </button>
            <button className={`tab-btn ${activeTab === 'single' ? 'active' : ''}`} onClick={() => setActiveTab('single')}>
              Single Simulator
            </button>
            <button className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
              Audit History ({historyList.length})
            </button>
          </div>
        </header>

        {/* Global Settings Panel */}
        <div className="global-settings-card glass" style={{ marginBottom: '1.5rem', padding: '1.2rem', borderRadius: '16px' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Settings size={18} /> Global Bias Parameters (Model Injections)
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
            <label className="toggle-label" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', cursor: 'pointer', color: '#ccc' }}>
              <input 
                type="checkbox" 
                checked={biasSettings.penalizeLocation} 
                onChange={(e) => setBiasSettings({ ...biasSettings, penalizeLocation: e.target.checked })} 
              />
              <span>Penalize States (Kano, Delta, Kaduna, Rivers)</span>
            </label>
            <label className="toggle-label" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', cursor: 'pointer', color: '#ccc' }}>
              <input 
                type="checkbox" 
                checked={biasSettings.genderBias} 
                onChange={(e) => setBiasSettings({ ...biasSettings, genderBias: e.target.checked })} 
              />
              <span>Gender Weighting Bias (Female penalty)</span>
            </label>
            <label className="toggle-label" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', cursor: 'pointer', color: '#ccc' }}>
              <input 
                type="checkbox" 
                checked={biasSettings.strictCriminalRecord} 
                onChange={(e) => setBiasSettings({ ...biasSettings, strictCriminalRecord: e.target.checked })} 
              />
              <span>Strict Criminal Record Penalty</span>
            </label>
          </div>
        </div>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '1.5rem', borderRadius: '16px', border: '1px solid #ef4444', marginBottom: '2rem' }}>
            <strong>Audit Error:</strong> {error}
            <p style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>Please check if your backend is running at {API_URL}</p>
          </div>
        )}

        {/* TAB 1: BATCH AUDIT */}
        {activeTab === 'batch' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
              <button className="btn-audit" onClick={runBatchAudit} disabled={isBatchAuditing}>
                {isBatchAuditing ? 'Auditing Batch...' : 'Run New Batch Audit (100 Cases)'}
              </button>
            </div>

            {isBatchAuditing && !batchResult && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '40vh', gap: '1rem' }}>
                <div className="status-dot status-approved animate-pulse" style={{ width: 40, height: 40 }}></div>
                <p style={{ color: '#aaa' }}>Generating 100 synthetic applicants with correlated demographics and auditing...</p>
              </div>
            )}

            {batchResult && !isBatchAuditing && (
              <>
                <div className="kpi-grid">
                  <div className="kpi-card glass">
                    <label>Fairness Score</label>
                    <h2>{batchResult.summary.fairnessScore}%</h2>
                    <div className={`kpi-trend ${batchResult.summary.biasDetected ? 'trend-down' : 'trend-up'}`}>
                      {batchResult.summary.biasDetected ? 'Bias Detected' : 'Healthy Range'}
                    </div>
                  </div>
                  <div className="kpi-card glass">
                    <label>Total Applicants</label>
                    <h2>{batchResult.summary.totalProcessed}</h2>
                    <div className="kpi-trend trend-up">Batch Simulation</div>
                  </div>
                  <div className="kpi-card glass">
                    <label>Disparate Impact</label>
                    <h2>{batchResult.metrics.genderParity.disparateImpactRatio}</h2>
                    <div className="kpi-trend trend-down">Target: 0.8 - 1.25</div>
                  </div>
                  <div className="kpi-card glass">
                    <label>Avg Approval</label>
                    <h2>{(batchResult.summary.overallApprovalRate * 100).toFixed(0)}%</h2>
                    <div className="kpi-trend trend-up">+2.4% vs last</div>
                  </div>
                </div>

                <div className="charts-row">
                  <div className="chart-card glass">
                    <h3>Regional Fairness Breakdown</h3>
                    <BarChart data={batchResult.metrics.regionalDisparity} labelKey="region" valueKey="approvalRate" />
                  </div>
                  <div className="chart-card glass" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <h3>Gender Parity Check</h3>
                    <svg width="140" height="140" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" fill="none" stroke="#222" strokeWidth="12" />
                      <circle 
                        cx="50" cy="50" r="40" fill="none" stroke="#7462f3" 
                        strokeWidth="12" 
                        strokeDasharray={`${batchResult.metrics.genderParity.femaleRate * 251.2} 251.2`}
                        transform="rotate(-90 50 50)"
                      />
                      <text x="50" y="55" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="bold">
                        {Math.round(batchResult.metrics.genderParity.femaleRate * 100)}%
                      </text>
                    </svg>
                    <div style={{ marginTop: '0.8rem', textAlign: 'center' }}>
                      <p style={{ fontSize: '0.8rem', color: '#aaa' }}>Female Approval Rate</p>
                    </div>
                  </div>
                </div>

                <div className="charts-row" style={{ marginTop: '1.5rem' }}>
                  <div className="chart-card glass">
                    <h3>Device Disparity (Proxy Bias Demo)</h3>
                    <p style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.5rem' }}>
                      Low-income correlates statistically with lower-end devices (Infinix/Tecno), proving indirect bias.
                    </p>
                    <BarChart data={batchResult.metrics.deviceDisparity} labelKey="device" valueKey="approvalRate" color="#ec4899" />
                  </div>
                  <div className="chart-card glass">
                    <h3>Income Bracket Analysis</h3>
                    <BarChart data={batchResult.metrics.incomeDisparity} labelKey="bracket" valueKey="approvalRate" color="#10b981" />
                  </div>
                </div>

                <div className="audit-log-card glass" style={{ marginTop: '1.5rem' }}>
                  <div style={{ padding: '1.2rem', display: 'flex', justifyContent: 'space-between' }}>
                    <h3 style={{ fontSize: '1.1rem' }}>Detailed Audit Log (Sample of 10 Cases)</h3>
                    <Search size={20} color="#888" />
                  </div>
                  <table className="audit-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>INCOME</th>
                        <th>LOCATION</th>
                        <th>GENDER</th>
                        <th>DEVICE</th>
                        <th>STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {batchResult.details.map((item, i) => (
                        <tr key={i}>
                          <td>{item.applicant.id}</td>
                          <td>₦{item.applicant.income.toLocaleString()}</td>
                          <td><MapPin size={14} style={{ marginRight: 4 }} />{item.applicant.location}</td>
                          <td>{item.applicant.gender}</td>
                          <td><Smartphone size={14} style={{ marginRight: 4 }} />{item.applicant.deviceType}</td>
                          <td>
                            <span className={`status-dot ${item.approved ? 'status-approved' : 'status-denied'}`}></span>
                            {item.approved ? 'Approved' : 'Rejected'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}

        {/* TAB 2: SINGLE APPLICANT SIMULATOR */}
        {activeTab === 'single' && (
          <div className="single-sim-layout" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {/* Form Side */}
            <div className="card glass simulator-section" style={{ padding: '1.5rem', borderRadius: '16px' }}>
              <h2 className="gradient-text" style={{ fontSize: '1.3rem', marginBottom: '1.5rem' }}>Applicant Profiles</h2>
              <div className="form-grid" style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                <div className="input-group">
                  <label style={{ display: 'block', marginBottom: '0.4rem', color: '#ccc' }}>Applicant Name</label>
                  <input 
                    type="text" 
                    value={formData.name} 
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #444', backgroundColor: '#111', color: '#fff' }}
                  />
                </div>

                <div className="input-group">
                  <label style={{ display: 'block', marginBottom: '0.4rem', color: '#ccc' }}>Monthly Income (₦)</label>
                  <input 
                    type="number" 
                    value={formData.income} 
                    onChange={(e) => setFormData({ ...formData, income: parseInt(e.target.value) || 0 })}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #444', backgroundColor: '#111', color: '#fff' }}
                  />
                </div>

                <div className="input-group">
                  <label style={{ display: 'block', marginBottom: '0.4rem', color: '#ccc' }}>Location (State)</label>
                  <select 
                    value={formData.location} 
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #444', backgroundColor: '#111', color: '#fff' }}
                  >
                    <option>Lagos</option>
                    <option>Abuja</option>
                    <option>Kano</option>
                    <option>Rivers</option>
                    <option>Delta</option>
                    <option>Kaduna</option>
                    <option>Enugu</option>
                  </select>
                </div>

                <div className="input-group">
                  <label style={{ display: 'block', marginBottom: '0.4rem', color: '#ccc' }}>Gender</label>
                  <select 
                    value={formData.gender} 
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #444', backgroundColor: '#111', color: '#fff' }}
                  >
                    <option>Male</option>
                    <option>Female</option>
                  </select>
                </div>

                <div className="input-group">
                  <label style={{ display: 'block', marginBottom: '0.4rem', color: '#ccc' }}>Credit Score (300 - 850)</label>
                  <input 
                    type="range" 
                    min="300" 
                    max="850" 
                    value={formData.creditScore} 
                    onChange={(e) => setFormData({ ...formData, creditScore: parseInt(e.target.value) || 300 })}
                    style={{ width: '100%', accentColor: '#7462f3' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#888' }}>
                    <span>Poor (300)</span>
                    <span style={{ color: '#7462f3', fontWeight: 'bold' }}>{formData.creditScore}</span>
                    <span>Excellent (850)</span>
                  </div>
                </div>

                <label className="toggle-label" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', cursor: 'pointer', color: '#ccc', marginTop: '0.5rem' }}>
                  <input 
                    type="checkbox" 
                    checked={formData.criminalRecord} 
                    onChange={(e) => setFormData({ ...formData, criminalRecord: e.target.checked })} 
                  />
                  <span>Has Prior Criminal Record</span>
                </label>
              </div>

              <button 
                className="btn-audit" 
                onClick={runSingleSimulation} 
                disabled={isSingleAuditing}
                style={{ width: '100%', marginTop: '1.5rem', padding: '0.8rem' }}
              >
                {isSingleAuditing ? 'Evaluating Profile...' : 'Run Simulation'}
              </button>
            </div>

            {/* Results Side */}
            <div className="card glass result-section" style={{ padding: '1.5rem', borderRadius: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: 300 }}>
              {isSingleAuditing && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                  <div className="status-dot status-approved animate-pulse" style={{ width: 30, height: 30 }}></div>
                  <p style={{ color: '#aaa' }}>Auditing model response for candidate profile...</p>
                </div>
              )}

              {!singleResult && !isSingleAuditing && (
                <div style={{ textAlign: 'center', color: '#666' }}>
                  <ShieldCheck size={48} style={{ margin: '0 auto 1rem', display: 'block' }} />
                  <p>Submit the applicant profile to run simulation & audit algorithm weights.</p>
                </div>
              )}

              {singleResult && !isSingleAuditing && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h3 style={{ fontSize: '1.2rem', color: '#fff' }}>Simulation Verdict</h3>
                    <span 
                      className={`status-dot ${singleResult.approved ? 'status-approved' : 'status-denied'}`}
                      style={{ padding: '0.4rem 0.8rem', borderRadius: '20px', color: '#fff', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                      {singleResult.approved ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                      {singleResult.approved ? 'APPROVED' : 'DENIED'}
                    </span>
                  </div>

                  <div className="score-meter" style={{ backgroundColor: '#222', borderRadius: '10px', padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                      <span style={{ color: '#aaa' }}>Score Evaluation:</span>
                      <span style={{ color: '#7462f3', fontWeight: 'bold' }}>{singleResult.score} / 100</span>
                    </div>
                    <div className="meter-bar" style={{ height: 8, backgroundColor: '#333', borderRadius: '4px', overflow: 'hidden' }}>
                      <div 
                        className="meter-fill" 
                        style={{ 
                          height: '100%', 
                          width: `${singleResult.score}%`, 
                          backgroundColor: singleResult.score >= 50 ? '#10b981' : '#ef4444',
                          transition: 'width 0.4s ease-out'
                        }}
                      ></div>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.5rem' }}>Threshold for approval is 50%.</p>
                  </div>

                  <div className="explainability-panel">
                    <h4 style={{ fontSize: '0.95rem', color: '#ccc', marginBottom: '0.8rem' }}>Algorithmic Weight Breakdowns</h4>
                    <div className="factor-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      {singleResult.factors.map((f, i) => (
                        <div key={i} className="factor-item" style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0.8rem', backgroundColor: '#111', borderRadius: '8px', border: '1px solid #222' }}>
                          <span style={{ fontSize: '0.85rem' }}>{f.name}</span>
                          <span 
                            style={{ 
                              fontSize: '0.85rem', 
                              fontWeight: 'bold', 
                              color: f.impact > 0 ? '#10b981' : '#ef4444' 
                            }}
                          >
                            {f.impact > 0 ? `+${f.impact}` : f.impact}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: AUDIT HISTORY LOG */}
        {activeTab === 'history' && (
          <div className="audit-history-panel glass" style={{ padding: '1.5rem', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 className="gradient-text" style={{ fontSize: '1.3rem' }}>Local Audit Logs</h2>
              <button 
                onClick={clearHistory} 
                disabled={historyList.length === 0}
                style={{ padding: '0.4rem 0.8rem', borderRadius: '8px', backgroundColor: '#ef4444', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '0.8rem' }}
              >
                Clear History
              </button>
            </div>

            {historyList.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#666' }}>
                <Users size={48} style={{ margin: '0 auto 1rem', display: 'block' }} />
                <p>No audits run in this session yet. Run single simulations or batch audits to see logs.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {historyList.map((item) => (
                  <div key={item.id} className="history-item-card" style={{ padding: '1rem', backgroundColor: '#111', borderRadius: '12px', border: '1px solid #222' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span 
                        style={{ 
                          fontSize: '0.75rem', 
                          fontWeight: 'bold', 
                          padding: '0.2rem 0.6rem', 
                          borderRadius: '4px', 
                          backgroundColor: item.type === 'Batch Audit' ? '#7462f3' : '#10b981',
                          color: '#fff'
                        }}
                      >
                        {item.type}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#555' }}>
                        {new Date(item.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.9rem', color: '#ccc', margin: '0.4rem 0' }}>{item.summary}</p>
                    <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginTop: '0.6rem' }}>
                      <span style={{ fontSize: '0.7rem', color: '#777' }}>Settings:</span>
                      {Object.entries(item.settings).map(([key, val]) => (
                        <span 
                          key={key} 
                          style={{ 
                            fontSize: '0.7rem', 
                            padding: '0.1rem 0.4rem', 
                            borderRadius: '4px', 
                            backgroundColor: '#222', 
                            color: val ? '#ec4899' : '#555' 
                          }}
                        >
                          {key}: {val ? 'ON' : 'OFF'}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default DashboardV2;
