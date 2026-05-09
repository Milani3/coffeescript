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
  const [batchResult, setBatchResult] = useState(null);
  const [isBatchAuditing, setIsBatchAuditing] = useState(false);
  const [error, setError] = useState(null);
  const [biasSettings, setBiasSettings] = useState({
    penalizeLocation: true,
    genderBias: true,
    strictCriminalRecord: true
  });

  const API_URL = import.meta.env.VITE_API_URL || 'https://coffeescript.onrender.com';

  const runBatchAudit = async () => {
    setIsBatchAuditing(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/audit/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: 30, biasSettings })
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setBatchResult(data);
    } catch (err) {
      console.error('Batch Audit failed:', err);
      setError(err.message);
    } finally {
      setIsBatchAuditing(false);
    }
  };

  useEffect(() => { runBatchAudit(); }, []);

  // SVG Bar Chart Component
  const RegionalChart = ({ data }) => {
    const maxVal = Math.max(...data.map(d => d.approvalRate));
    return (
      <svg className="svg-chart" viewBox="0 0 400 200">
        {data.map((d, i) => {
          const barHeight = (d.approvalRate / 1) * 150;
          return (
            <g key={i}>
              <rect 
                x={i * 55 + 20} 
                y={170 - barHeight} 
                width="35" 
                height={barHeight} 
                className="bar-rect"
              />
              <text x={i * 55 + 22} y="190" fill="#666" fontSize="10">{d.region}</text>
            </g>
          );
        })}
      </svg>
    );
  };

  return (
    <div className="dashboard-v2">
      <aside className="sidebar">
        <div className="side-icon active"><LayoutDashboard size={24} /></div>
        <div className="side-icon"><ShieldCheck size={24} /></div>
        <div className="side-icon"><Users size={24} /></div>
        <div className="side-icon"><BarChart3 size={24} /></div>
        <div style={{ marginTop: 'auto' }} className="side-icon"><Settings size={24} /></div>
      </aside>

      <main className="main-content">
        <header className="header-v2">
          <div>
            <h1>Hello, Auditor! 👋</h1>
            <p style={{ color: '#666' }}>Here's what's happening in your bias engine today.</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button className="btn-audit" onClick={runBatchAudit} disabled={isBatchAuditing}>
              {isBatchAuditing ? 'Auditing...' : 'Run New Batch Audit'}
            </button>
            <div className="side-icon"><Bell size={24} /></div>
          </div>
        </header>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '1.5rem', borderRadius: '16px', border: '1px solid #ef4444', marginBottom: '2rem' }}>
            <strong>Audit Error:</strong> {error}
            <p style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>Please check if your backend is running at {API_URL}</p>
          </div>
        )}

        {isBatchAuditing && !batchResult && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh', gap: '1rem' }}>
            <div className="status-dot status-approved" style={{ width: 40, height: 40 }}></div>
            <p style={{ color: '#666' }}>Generating 30 synthetic applicants and auditing for bias...</p>
          </div>
        )}

        {batchResult && (
          <>
            <div className="kpi-grid">
              <div className="kpi-card">
                <label>Fairness Score</label>
                <h2>{batchResult.summary.fairnessScore}%</h2>
                <div className={`kpi-trend ${batchResult.summary.biasDetected ? 'trend-down' : 'trend-up'}`}>
                  {batchResult.summary.biasDetected ? 'Bias Detected' : 'Healthy Range'}
                </div>
              </div>
              <div className="kpi-card">
                <label>Total Applicants</label>
                <h2>{batchResult.summary.totalProcessed}</h2>
                <div className="kpi-trend trend-up">Batch Simulation</div>
              </div>
              <div className="kpi-card">
                <label>Disparate Impact</label>
                <h2>{batchResult.metrics.genderParity.disparateImpactRatio}</h2>
                <div className="kpi-trend trend-down">Target: 0.8 - 1.25</div>
              </div>
              <div className="kpi-card">
                <label>Avg Approval</label>
                <h2>{(batchResult.summary.overallApprovalRate * 100).toFixed(0)}%</h2>
                <div className="kpi-trend trend-up">+2.4% vs last</div>
              </div>
            </div>

            <div className="charts-row">
              <div className="chart-card">
                <h3>Regional Fairness Breakdown</h3>
                <RegionalChart data={batchResult.metrics.regionalDisparity} />
              </div>
              <div className="chart-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <h3>Gender Parity Check</h3>
                <svg width="160" height="160" viewBox="0 0 100 100">
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
                <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                  <p style={{ fontSize: '0.8rem', color: '#666' }}>Female Approval Rate</p>
                </div>
              </div>
            </div>

            <div className="audit-log-card">
              <div style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between' }}>
                <h3 style={{ fontSize: '1.1rem' }}>Detailed Audit Log</h3>
                <Search size={20} color="#666" />
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
      </main>
    </div>
  );
};

export default DashboardV2;
