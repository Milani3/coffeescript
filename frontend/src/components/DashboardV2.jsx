import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  ShieldCheck,
  Users,
  BarChart3,
  Search,
  Bell,
  CheckCircle2,
  XCircle,
  Smartphone,
  MapPin,
  Brain,
  FileText,
  Download,
  Upload,
  ArrowRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import './DashboardV2.css';

const DashboardV2 = () => {
  // Tabs: 'batch', 'single', 'history', 'batch-full-log'
  const [activeTab, setActiveTab] = useState('batch');

  // Batch Audit States
  const [batchResult, setBatchResult] = useState(null);
  const [isBatchAuditing, setIsBatchAuditing] = useState(false);
  const [error, setError] = useState(null);

  // Single Simulation States
  const [formData, setFormData] = useState({
    name: 'Auditor Demo',
    income: 150000,
    loanAmount: 250000,
    creditScore: 650,
    location: 'Lagos',
    gender: 'Male',
    criminalRecord: false,
    deviceType: 'Redmi Note'
  });
  const [singleResult, setSingleResult] = useState(null);
  const [isSingleAuditing, setIsSingleAuditing] = useState(false);

  // General Settings
  const [biasSettings, setBiasSettings] = useState({
    penalizeLocation: false,
    genderBias: false,
    strictCriminalRecord: true
  });

  // History States
  const [historyList, setHistoryList] = useState([]);

  // AI Doc Auditor States
  const [docFile, setDocFile] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isDocAuditing, setIsDocAuditing] = useState(false);
  const [docAuditResult, setDocAuditResult] = useState(null);
  const [docError, setDocError] = useState(null);
  const fileInputRef = useRef(null);

  // Full Log Search/Filter
  const [fullLogSearch, setFullLogSearch] = useState('');
  const [fullLogFilter, setFullLogFilter] = useState('all'); // 'all', 'approved', 'denied'
  const [isCasesExpanded, setIsCasesExpanded] = useState(false);

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
        `Simulated applicant ${formData.name} (${formData.gender}, ₦${formData.loanAmount.toLocaleString()} loan, ₦${formData.income.toLocaleString()} income, ${formData.location}). Decision: ${data.approved ? 'Approved' : 'Denied'} (Score: ${data.score}%).`,
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

  // --- What-If Importer ---
  const importToSimulator = (item) => {
    setFormData({
      name: item.applicant.name || item.applicant.id,
      income: Math.round(item.applicant.income),
      loanAmount: Math.round(item.applicant.loanAmount || item.applicant.income * 2),
      creditScore: item.applicant.creditScore || 650,
      location: item.applicant.location,
      gender: item.applicant.gender,
      criminalRecord: item.applicant.criminalRecord || false,
      deviceType: item.applicant.deviceType || 'Redmi Note'
    });
    setSingleResult(null);
    setActiveTab('single');
  };

  // --- Export Batch Report as JSON ---
  const exportBatchReport = () => {
    if (!batchResult) return;
    const blob = new Blob([JSON.stringify(batchResult, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leba-batch-report-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // --- Export Batch Report as CSV ---
  const exportBatchReportCSV = () => {
    if (!batchResult) return;
    const headers = ['ID', 'Name', 'Income', 'LoanAmount', 'Location', 'Gender', 'Device', 'Approved'];
    const rows = batchResult.details.map(item => [
      item.applicant.id,
      item.applicant.name,
      item.applicant.income,
      item.applicant.loanAmount ?? '',
      item.applicant.location,
      item.applicant.gender,
      item.applicant.deviceType ?? '',
      item.approved ? 'true' : 'false'
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leba-batch-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // --- Export Batch Report as PNG ---
  const exportBatchReportPNG = () => {
    if (!batchResult) return;
    // Simple PNG export of JSON text using canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const text = JSON.stringify(batchResult, null, 2);
    const lines = text.split('\n');
    const lineHeight = 14;
    canvas.width = 800;
    canvas.height = lineHeight * lines.length + 20;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#000';
    ctx.font = '12px monospace';
    lines.forEach((line, i) => {
      ctx.fillText(line, 10, 10 + i * lineHeight);
    });
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `leba-batch-report-${new Date().toISOString().slice(0, 10)}.png`;
    a.click();
  };

  // --- Parse uploaded CSV or JSON file ---
  const parseFileToApplicants = (text, fileName) => {
    if (fileName.endsWith('.json')) {
      return JSON.parse(text);
    }
    // CSV parsing (Name,Income,LoanAmount,CreditScore,Location,Gender,DeviceType,Approved)
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    return lines.slice(1).map(line => {
      const vals = line.split(',').map(v => v.trim());
      const obj = {};
      headers.forEach((h, i) => { obj[h] = vals[i]; });
      return {
        name: obj.name || 'Unknown',
        income: parseFloat(obj.income) || 0,
        loanAmount: parseFloat(obj.loanamount) || parseFloat(obj.loan_amount) || parseFloat(obj.loan) || 0,
        creditScore: parseInt(obj.creditscore) || 600,
        location: obj.location || 'Lagos',
        gender: obj.gender || 'Male',
        deviceType: obj.devicetype || 'Redmi Note',
        approved: (obj.approved || '').toLowerCase() === 'true'
      };
    });
  };

  // --- Run AI Document Audit ---
  const runDocumentAudit = async (file) => {
    setIsDocAuditing(true);
    setDocAuditResult(null);
    setDocError(null);
    try {
      const text = await file.text();
      const applicants = parseFileToApplicants(text, file.name);
      const response = await fetch(`${API_URL}/api/audit/document`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicants })
      });
      if (!response.ok) throw new Error(`Server error: ${response.status}`);
      const data = await response.json();
      setDocAuditResult(data);
      saveAuditToHistory(
        'AI Doc Audit',
        `Uploaded '${file.name}' (${applicants.length} records). Bias Index: ${data.summary.biasIndex}. Disparate Impact: ${data.summary.disparateImpactRatio}.`,
        data.summary
      );
    } catch (err) {
      setDocError(err.message);
    } finally {
      setIsDocAuditing(false);
    }
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) { setDocFile(file); runDocumentAudit(file); }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) { setDocFile(file); runDocumentAudit(file); }
  };

  // --- Filter full log data ---
  const getFilteredFullLog = () => {
    if (!batchResult || !batchResult.details) return [];

    let filtered = batchResult.details;

    // Filter by status
    if (fullLogFilter === 'approved') {
      filtered = filtered.filter(item => item.approved);
    } else if (fullLogFilter === 'denied') {
      filtered = filtered.filter(item => !item.approved);
    }

    // Filter by search
    if (fullLogSearch.trim()) {
      const query = fullLogSearch.toLowerCase();
      filtered = filtered.filter(item =>
        item.applicant.name.toLowerCase().includes(query) ||
        item.applicant.id.toString().includes(query) ||
        item.applicant.location.toLowerCase().includes(query) ||
        item.applicant.gender.toLowerCase().includes(query)
      );
    }

    return filtered;
  };

  // Reusable Bar Chart Component
  const BarChart = ({ data, labelKey, valueKey, color = "#7462f3", yAxisLabel = "Approval Rate" }) => {
    if (!data || data.length === 0) {
      return (
        <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', fontSize: '0.8rem', border: '1px dashed #333', borderRadius: '12px' }}>
          Insufficient data for analysis
        </div>
      );
    }

    const width = 420;
    const height = 230;
    const margin = { top: 18, right: 18, bottom: 42, left: 68 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    const gridLines = [0, 0.25, 0.5, 0.75, 1];
    const barSlot = chartWidth / data.length;
    const barWidth = Math.min(Math.max(barSlot * 0.58, 24), 54);

    return (
      <svg className="svg-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={yAxisLabel}>
        {gridLines.map((tick) => {
          const y = margin.top + chartHeight - (tick * chartHeight);
          return (
            <g key={tick}>
              <line
                x1={margin.left}
                y1={y}
                x2={width - margin.right}
                y2={y}
                className="chart-grid-line"
              />
              <text x={margin.left - 10} y={y + 4} className="chart-axis-label" textAnchor="end">
                {Math.round(tick * 100)}%
              </text>
            </g>
          );
        })}
        {data.map((_, i) => {
          const x = margin.left + (i * barSlot) + (barSlot / 2);
          return (
            <line
              key={`vertical-${i}`}
              x1={x}
              y1={margin.top}
              x2={x}
              y2={height - margin.bottom}
              className="chart-grid-line"
            />
          );
        })}
        <line
          x1={margin.left}
          y1={margin.top}
          x2={margin.left}
          y2={height - margin.bottom}
          className="chart-axis-line"
        />
        <line
          x1={margin.left}
          y1={height - margin.bottom}
          x2={width - margin.right}
          y2={height - margin.bottom}
          className="chart-axis-line"
        />
        <text
          x={24}
          y={margin.top + chartHeight / 2}
          className="chart-title-label"
          textAnchor="middle"
          transform={`rotate(-90 24 ${margin.top + chartHeight / 2})`}
        >
          {yAxisLabel}
        </text>
        {data.map((d, i) => {
          const val = Math.max(0, Math.min(Number(d[valueKey]) || 0, 1));
          const barHeight = Math.max(val * chartHeight, 3);
          const xPos = margin.left + (i * barSlot) + ((barSlot - barWidth) / 2);
          const yPos = margin.top + chartHeight - barHeight;
          return (
            <g key={i}>
              <rect
                x={xPos}
                y={yPos}
                width={barWidth}
                height={barHeight}
                fill={color}
                className="bar-rect"
              />
              <text
                x={xPos + barWidth / 2}
                y={Math.max(yPos - 7, 12)}
                className="chart-value-label"
                textAnchor="middle"
              >
                {Math.round(val * 100)}%
              </text>
              <text
                x={xPos + barWidth / 2}
                y={height - 18}
                className="chart-axis-label"
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
        <div className={`side-icon ${activeTab === 'ai-audit' ? 'active' : ''}`} onClick={() => setActiveTab('ai-audit')} title="AI Document Auditor">
          <Brain size={24} />
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
            <button className={`tab-btn ${activeTab === 'ai-audit' ? 'active' : ''}`} onClick={() => setActiveTab('ai-audit')}>
              AI Doc Auditor
            </button>
            <button className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
              History ({historyList.length})
            </button>
          </div>
        </header>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '1.5rem', borderRadius: '16px', border: '1px solid #ef4444', marginBottom: '2rem' }}>
            <strong>Audit Error:</strong> {error}
            <p style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>Please check if your backend is running at {API_URL}</p>
          </div>
        )}

        <div className="bias-settings-banner glass" style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', padding: '1rem 1.5rem', borderRadius: '12px', marginBottom: '1.5rem', alignItems: 'center', justifyContent: 'space-between', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#fff' }}>Bias Injection Controls:</span>
            {Object.values(biasSettings).some(v => v) ? (
              <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '6px', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' }}>Bias Injected</span>
            ) : (
              <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '6px', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }}>Standard Mode</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.85rem', color: '#ccc' }}>
              <input
                type="checkbox"
                checked={biasSettings.penalizeLocation}
                onChange={(e) => setBiasSettings({ ...biasSettings, penalizeLocation: e.target.checked })}
                style={{ accentColor: '#7462f3' }}
              />
              Regional Bias (Kano/Kaduna/Delta/Rivers)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.85rem', color: '#ccc' }}>
              <input
                type="checkbox"
                checked={biasSettings.genderBias}
                onChange={(e) => setBiasSettings({ ...biasSettings, genderBias: e.target.checked })}
                style={{ accentColor: '#7462f3' }}
              />
              Gender Bias (Female Penalty)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.85rem', color: '#ccc' }}>
              <input
                type="checkbox"
                checked={biasSettings.strictCriminalRecord}
                onChange={(e) => setBiasSettings({ ...biasSettings, strictCriminalRecord: e.target.checked })}
                style={{ accentColor: '#7462f3' }}
              />
              Strict Criminal Penalty
            </label>
          </div>
        </div>

        {/* TAB 1: BATCH AUDIT */}
        {activeTab === 'batch' && (
          <>
            <div className="batch-actions" style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <button className="btn-audit" onClick={runBatchAudit} disabled={isBatchAuditing} style={{ flex: '0 0 auto' }}>
                {isBatchAuditing ? 'Auditing...' : 'Run New Batch Audit (100 Cases)'}
              </button>
              {batchResult && (
                <>
                  <button className="btn-export" onClick={exportBatchReport} title="Export as JSON">
                    <Download size={14} /> Export JSON
                  </button>
                  <button className="btn-export" onClick={exportBatchReportCSV} title="Export as CSV">
                    <Download size={14} /> Export CSV
                  </button>
                  <button className="btn-export" onClick={exportBatchReportPNG} title="Export as PNG">
                    <Download size={14} /> Export PNG
                  </button>
                </>
              )}
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
                    <h2>{Number(batchResult.summary.fairnessScore).toFixed(1)}%</h2>
                    <div className={`kpi-trend ${batchResult.summary.biasDetected ? 'trend-down' : 'trend-up'}`}>
                      {batchResult.summary.biasDetected ? 'Below parity range' : 'Within parity range'}
                    </div>
                  </div>
                  <div className="kpi-card glass">
                    <label>Total Applicants</label>
                    <h2>{batchResult.summary.totalProcessed}</h2>
                    <div className="kpi-trend trend-up">Batch Simulation</div>
                  </div>
                  <div className="kpi-card glass">
                    <label>Disparate Impact</label>
                    <h2>{Number(batchResult.metrics.genderParity.disparateImpactRatio).toFixed(2)}</h2>
                    <div className={`kpi-trend ${batchResult.summary.biasDetected ? 'trend-down' : 'trend-up'}`}>
                      F {batchResult.metrics.genderParity.femaleApproved}/{batchResult.metrics.genderParity.femaleTotal} vs M {batchResult.metrics.genderParity.maleApproved}/{batchResult.metrics.genderParity.maleTotal}
                    </div>
                  </div>
                  <div className="kpi-card glass">
                    <label>Avg Approval</label>
                    <h2>{(batchResult.summary.overallApprovalRate * 100).toFixed(1)}%</h2>
                    <div className="kpi-trend trend-up">
                      {batchResult.summary.approvedCount}/{batchResult.summary.totalProcessed} approved
                    </div>
                  </div>
                </div>

                <div className="charts-row">
                  <div className="chart-card glass">
                    <h3>Regional Fairness Breakdown</h3>
                    <BarChart data={batchResult.metrics.regionalDisparity} labelKey="region" valueKey="approvalRate" />
                  </div>
                  <div className="chart-card glass">
                    <h3>Gender Parity Check</h3>
                    <BarChart
                      data={[
                        { group: 'Male', approvalRate: batchResult.metrics.genderParity.maleRate },
                        { group: 'Female', approvalRate: batchResult.metrics.genderParity.femaleRate }
                      ]}
                      labelKey="group"
                      valueKey="approvalRate"
                      color="#7462f3"
                    />
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
                  <div style={{ padding: '1.2rem', display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: '0.5rem' }}>
                    <h3 style={{ fontSize: '1.1rem' }}>Detailed Audit Log ({isCasesExpanded ? `All ${batchResult.details.length} Cases` : `Showing 10 of ${batchResult.details.length} Cases`})</h3>
                    <button
                      onClick={() => setIsCasesExpanded(!isCasesExpanded)}
                      style={{
                        padding: '0.4rem 0.8rem',
                        borderRadius: '8px',
                        backgroundColor: '#7462f3',
                        color: '#fff',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem'
                      }}
                    >
                      {isCasesExpanded ? (
                        <>Contract <ChevronUp size={14} /></>
                      ) : (
                        <>Expand <ChevronDown size={14} /></>
                      )}
                    </button>
                    <Search size={20} color="#888" />
                  </div>
                  <div className="audit-table-wrap">
                    <table className="audit-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>NAME</th>
                          <th>INCOME</th>
                          <th>LOAN</th>
                          <th>LOCATION</th>
                          <th>GENDER</th>
                          <th>DEVICE</th>
                          <th>STATUS</th>
                          <th>WHAT-IF</th>
                        </tr>
                      </thead>
                      <tbody>
                        {batchResult.details.slice(0, isCasesExpanded ? batchResult.details.length : 10).map((item, i) => (
                          <tr key={i}>
                            <td>{item.applicant.id}</td>
                            <td>{item.applicant.name}</td>
                            <td>₦{item.applicant.income.toLocaleString()}</td>
                            <td>₦{Number(item.applicant.loanAmount || 0).toLocaleString()}</td>
                            <td><MapPin size={14} style={{ marginRight: 4 }} />{item.applicant.location}</td>
                            <td>{item.applicant.gender}</td>
                            <td><Smartphone size={14} style={{ marginRight: 4 }} />{item.applicant.deviceType}</td>
                            <td>
                              <span className={`status-dot ${item.approved ? 'status-approved' : 'status-denied'}`}></span>
                              {item.approved ? 'Approved' : 'Rejected'}
                            </td>
                            <td>
                              <button
                                onClick={() => importToSimulator(item)}
                                style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', borderRadius: '6px', backgroundColor: '#7462f3', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                              >
                                <ArrowRight size={12} /> Sim
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>


                </div>
              </>
            )}
          </>
        )}

        {/* TAB 1B: FULL AUDIT LOG PAGE */}
        {activeTab === 'batch-full-log' && batchResult && (
          <div>
            {/* Back Button & Title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <button
                onClick={() => setActiveTab('batch')}
                style={{
                  padding: '0.5rem 0.8rem',
                  borderRadius: '8px',
                  backgroundColor: 'transparent',
                  color: 'var(--text-primary)',
                  border: '2px solid var(--border-color)',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.target.style.borderColor = '#7462f3'}
                onMouseOut={(e) => e.target.style.borderColor = 'var(--border-color)'}
              >
                <ChevronLeft size={18} /> Back to Summary
              </button>
              <h1 style={{ fontSize: '1.3rem', fontWeight: '700' }}>Full Audit Log (100 Cases)</h1>
            </div>

            {/* Search & Filter Bar */}
            <div className="full-log-controls" style={{ display: 'flex', gap: '0.8rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <input
                  type="text"
                  placeholder="Search by name, ID, location, or gender..."
                  value={fullLogSearch}
                  onChange={(e) => setFullLogSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '2px solid var(--border-color)',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#7462f3'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                />
              </div>

              <select
                value={fullLogFilter}
                onChange={(e) => setFullLogFilter(e.target.value)}
                style={{
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  border: '2px solid var(--border-color)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                <option value="all">All Cases ({batchResult.details.length})</option>
                <option value="approved">Approved ({batchResult.details.filter(d => d.approved).length})</option>
                <option value="denied">Denied ({batchResult.details.filter(d => !d.approved).length})</option>
              </select>

              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', display: 'flex', alignItems: 'center' }}>
                Showing {getFilteredFullLog().length} of {batchResult.details.length} cases
              </div>
            </div>

            {/* Full Audit Table */}
            <div className="audit-log-card glass">
              <div className="audit-table-wrap" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                <table className="audit-table">
                  <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--bg-secondary)', zIndex: 10 }}>
                    <tr>
                      <th>#</th>
                      <th>ID</th>
                      <th>NAME</th>
                      <th>INCOME</th>
                      <th>LOAN</th>
                      <th>CREDIT SCORE</th>
                      <th>LOCATION</th>
                      <th>GENDER</th>
                      <th>DEVICE</th>
                      <th>STATUS</th>
                      <th>WHAT-IF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getFilteredFullLog().map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{idx + 1}</td>
                        <td>{item.applicant.id}</td>
                        <td>{item.applicant.name}</td>
                        <td>₦{item.applicant.income.toLocaleString()}</td>
                        <td>₦{Number(item.applicant.loanAmount || 0).toLocaleString()}</td>
                        <td>{item.applicant.creditScore}</td>
                        <td><MapPin size={14} style={{ marginRight: 4, display: 'inline' }} />{item.applicant.location}</td>
                        <td>{item.applicant.gender}</td>
                        <td><Smartphone size={14} style={{ marginRight: 4, display: 'inline' }} />{item.applicant.deviceType}</td>
                        <td>
                          <span className={`status-dot ${item.approved ? 'status-approved' : 'status-denied'}`}></span>
                          {item.approved ? 'Approved' : 'Rejected'}
                        </td>
                        <td>
                          <button
                            onClick={() => importToSimulator(item)}
                            style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', borderRadius: '6px', backgroundColor: '#7462f3', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                          >
                            <ArrowRight size={12} /> Sim
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {getFilteredFullLog().length === 0 && (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No cases match your filters. Try adjusting your search or status filter.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: SINGLE APPLICANT SIMULATOR */}
        {activeTab === 'single' && (
          <div className="single-sim-layout" style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 0.9fr) minmax(360px, 1.1fr)', gap: '0.8rem', alignItems: 'start' }}>
            {/* Form Side */}
            <div className="card glass simulator-section" style={{ padding: '1rem', borderRadius: '10px' }}>
              <h2 className="gradient-text" style={{ fontSize: '1.05rem', marginBottom: '0.8rem' }}>Applicant Profile</h2>
              <div className="form-grid compact-form-grid">
                <div className="input-group">
                  <label style={{ display: 'block', marginBottom: '0.4rem', color: '#ccc' }}>Applicant Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '0.6rem', borderRadius: '8px', border: '1px solid #444', backgroundColor: '#111', color: '#fff' }}
                  />
                </div>

                <div className="input-group">
                  <label style={{ display: 'block', marginBottom: '0.4rem', color: '#ccc' }}>Monthly Income (₦)</label>
                  <input
                    type="number"
                    value={formData.income}
                    onChange={(e) => setFormData({ ...formData, income: parseInt(e.target.value) || 0 })}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '0.6rem', borderRadius: '8px', border: '1px solid #444', backgroundColor: '#111', color: '#fff' }}
                  />
                </div>

                <div className="input-group">
                  <label style={{ display: 'block', marginBottom: '0.4rem', color: '#ccc' }}>Loan Amount (₦)</label>
                  <input
                    type="number"
                    value={formData.loanAmount}
                    onChange={(e) => setFormData({ ...formData, loanAmount: parseInt(e.target.value) || 0 })}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '0.6rem', borderRadius: '8px', border: '1px solid #444', backgroundColor: '#111', color: '#fff' }}
                  />
                </div>

                <div className="input-group">
                  <label style={{ display: 'block', marginBottom: '0.4rem', color: '#ccc' }}>Location (State)</label>
                  <select
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '0.6rem', borderRadius: '8px', border: '1px solid #444', backgroundColor: '#111', color: '#fff' }}
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
                    style={{ width: '100%', boxSizing: 'border-box', padding: '0.6rem', borderRadius: '8px', border: '1px solid #444', backgroundColor: '#111', color: '#fff' }}
                  >
                    <option>Male</option>
                    <option>Female</option>
                  </select>
                </div>

                <div className="input-group">
                  <label style={{ display: 'block', marginBottom: '0.4rem', color: '#ccc' }}>Device Type</label>
                  <select
                    value={formData.deviceType || 'Redmi Note'}
                    onChange={(e) => setFormData({ ...formData, deviceType: e.target.value })}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '0.6rem', borderRadius: '8px', border: '1px solid #444', backgroundColor: '#111', color: '#fff' }}
                  >
                    <option value="iPhone">iPhone (High End)</option>
                    <option value="Samsung S22">Samsung S22 (High End)</option>
                    <option value="Redmi Note">Redmi Note (Mid End)</option>
                    <option value="Infinix Note">Infinix Note (Low End - Proxy)</option>
                    <option value="Tecno Spark">Tecno Spark (Low End - Proxy)</option>
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

                  <div style={{ backgroundColor: '#111', border: '1px solid #222', borderRadius: '10px', padding: '1rem' }}>
                    <h4 style={{ fontSize: '0.95rem', color: '#ccc', marginBottom: '0.6rem' }}>Why this decision was made</h4>
                    <p style={{ fontSize: '0.86rem', color: '#aaa', lineHeight: 1.6 }}>
                      {singleResult.explanation || 'LEBA reviewed the applicant details and produced this result based on the audit score.'}
                    </p>
                    {singleResult.aiPrediction && (
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.8rem' }}>
                        <span style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', borderRadius: '6px', backgroundColor: singleResult.aiPrediction.enabled ? 'rgba(16,185,129,0.14)' : 'rgba(251,191,36,0.14)', color: singleResult.aiPrediction.enabled ? '#10b981' : '#fbbf24' }}>
                          AI: {singleResult.aiPrediction.enabled ? 'Connected' : 'Fallback used'}
                        </span>
                        <span style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', borderRadius: '6px', backgroundColor: '#222', color: '#aaa' }}>
                          Model: {singleResult.aiPrediction.model}
                        </span>
                        {singleResult.aiPrediction.enabled && (
                          <span style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', borderRadius: '6px', backgroundColor: '#222', color: '#aaa' }}>
                            Confidence: {Number(singleResult.aiPrediction.confidence).toFixed(1)}%
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="explainability-panel">
                    <h4 style={{ fontSize: '0.95rem', color: '#ccc', marginBottom: '0.8rem' }}>Algorithmic Weight Breakdowns</h4>
                    <div className="factor-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      {(singleResult.factors || []).map((f, i) => (
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

        {/* TAB 3: AI DOC AUDITOR */}
        {activeTab === 'ai-audit' && (
          <div>
            {/* Dropzone */}
            <div
              className={`doc-dropzone ${isDragOver ? 'drag-over' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.json,.txt"
                style={{ display: 'none' }}
                onChange={handleFileSelect}
              />
              <Upload size={40} style={{ color: '#7462f3', marginBottom: '1rem' }} />
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Drop your applicant dataset here</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Accepts <strong>.csv</strong>, <strong>.json</strong> files with columns: Name, Income, LoanAmount, CreditScore, Location, Gender, DeviceType, Approved
              </p>
              {docFile && (
                <div style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: 'rgba(116,98,243,0.15)', borderRadius: '8px', border: '1px solid #7462f3', fontSize: '0.85rem' }}>
                  <FileText size={14} style={{ marginRight: 6 }} />
                  {docFile.name}
                </div>
              )}
            </div>

            {/* Sample CSV hint */}
            <div style={{ marginTop: '1rem', padding: '0.8rem 1rem', background: 'var(--bg-secondary)', borderRadius: '12px', border: '2px solid var(--border-color)', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--text-primary)' }}>Sample CSV format:</strong>
              <pre style={{ marginTop: '0.4rem', fontSize: '0.75rem', overflowX: 'auto' }}>
                {`Name,Income,LoanAmount,CreditScore,Location,Gender,DeviceType,Approved
Ade Bello,250000,400000,720,Lagos,Male,iPhone,true
Fatima Sule,80000,300000,410,Kano,Female,Tecno Spark,false`}
              </pre>
            </div>

            {isDocAuditing && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem', gap: '1rem' }}>
                <div className="status-dot status-approved animate-pulse" style={{ width: 36, height: 36 }}></div>
                <p style={{ color: 'var(--text-secondary)' }}>Analysing document for bias patterns...</p>
              </div>
            )}

            {docError && (
              <div style={{ marginTop: '1rem', background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '1rem', borderRadius: '12px', border: '1px solid #ef4444' }}>
                <strong>Error:</strong> {docError}
              </div>
            )}

            {docAuditResult && !isDocAuditing && (
              <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>

                {/* KPI Row */}
                <div className="kpi-grid">
                  <div className="kpi-card">
                    <label>Records Processed</label>
                    <h2>{docAuditResult.summary.totalProcessed}</h2>
                    <div className="kpi-trend trend-up">Uploaded Dataset</div>
                  </div>
                  <div className="kpi-card">
                    <label>Approval Rate</label>
                    <h2>{docAuditResult.summary.overallApprovalRate}%</h2>
                    <div className="kpi-trend trend-up">Overall</div>
                  </div>
                  <div className="kpi-card">
                    <label>Disparate Impact</label>
                    <h2>{docAuditResult.summary.disparateImpactRatio}</h2>
                    <div className={`kpi-trend ${docAuditResult.summary.disparateImpactRatio < 0.8 ? 'trend-down' : 'trend-up'}`}>
                      {docAuditResult.summary.disparateImpactRatio < 0.8 ? 'Below Threshold' : 'Healthy'}
                    </div>
                  </div>
                  <div className="kpi-card">
                    <label>Bias Index</label>
                    <h2>{docAuditResult.summary.biasIndex}</h2>
                    <div className={`kpi-trend ${docAuditResult.summary.biasIndex > 0.2 ? 'trend-down' : 'trend-up'}`}>
                      {docAuditResult.summary.biasIndex > 0.2 ? 'High Bias' : 'Low Bias'}
                    </div>
                  </div>
                </div>

                {/* Compliance Checklist */}
                <div className="chart-card">
                  <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ShieldCheck size={18} /> Regulatory Compliance Checklist (CBN / NDPR)
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {docAuditResult.complianceChecklist.map((item, i) => (
                      <div key={i} className="compliance-item">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <span className={`compliance-badge compliance-${item.status.toLowerCase()}`}>
                            {item.status === 'Pass' ? <CheckCircle2 size={14} /> : item.status === 'Fail' ? <XCircle size={14} /> : '⚠️'}
                            {item.status}
                          </span>
                          <strong style={{ fontSize: '0.88rem' }}>{item.criterion}</strong>
                        </div>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.3rem', paddingLeft: '1.8rem' }}>{item.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* AI Recommendations */}
                <div className="chart-card">
                  <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Brain size={18} /> AI Audit Recommendations
                  </h3>
                  {docAuditResult.recommendations.length === 0 ? (
                    <p style={{ color: '#10b981', fontSize: '0.9rem' }}>✅ No significant bias patterns detected in this dataset.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                      {docAuditResult.recommendations.map((rec, i) => (
                        <div key={i} style={{ padding: '0.8rem 1rem', borderRadius: '10px', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: '1.6' }}>
                          <span style={{ color: '#ef4444', fontWeight: 'bold' }}>⚠ </span>{rec}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        )}

        {/* TAB 4: AUDIT HISTORY LOG */}
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
