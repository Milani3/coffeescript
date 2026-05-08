import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  MapPin, 
  Briefcase, 
  CreditCard, 
  ShieldAlert, 
  ToggleLeft, 
  ToggleRight,
  Info,
  ChevronRight,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import './Dashboard.css';

const Dashboard = () => {
  // 1. Simulation State
  const [formData, setFormData] = useState({
    name: '',
    income: 150000,
    employment: 'Private Sector',
    creditScore: 650,
    location: 'Lagos',
    criminalRecord: false,
    gender: 'Male'
  });

  // 2. Bias Injection State
  const [biasSettings, setBiasSettings] = useState({
    penalizeLocation: false,
    weightIncomeHeavily: false,
    strictCriminalRecord: true,
    genderBias: false
  });

  // 3. Result State
  const [result, setResult] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [isAuditing, setIsAuditing] = useState(false);

  // 4. API Calls
  const API_URL = import.meta.env.VITE_API_URL || 'https://coffeescript.onrender.com';

  const fetchMetrics = async () => {
    try {
      const response = await fetch(`${API_URL}/api/metrics`);
      const data = await response.json();
      setMetrics(data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchMetrics(); }, []);

  const runSimulation = async () => {
    setIsAuditing(true);
    try {
      const response = await fetch(`${API_URL}/api/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formData, biasSettings })
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Audit failed:', error);
    } finally {
      setIsAuditing(false);
    }
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h2 className="gradient-text">LEBA Auditor Dashboard</h2>
        <div className="bias-mode-indicator">
          {Object.values(biasSettings).some(v => v) ? (
            <span className="mode-tag warning"><AlertTriangle size={14} /> Bias Injected</span>
          ) : (
            <span className="mode-tag success">Standard Mode</span>
          )}
        </div>
      </header>

      <div className="dashboard-grid">
        {/* Column 1: Simulator Form */}
        <div className="card glass simulator-section">
          <div className="card-header">
            <User size={20} />
            <h3>Loan Application Simulator</h3>
          </div>
          
          <div className="form-grid">
            <div className="input-group">
              <label>Monthly Income (₦)</label>
              <input 
                type="number" 
                value={formData.income} 
                onChange={(e) => setFormData({...formData, income: e.target.value})}
              />
            </div>

            <div className="input-group">
              <label>Location (State)</label>
              <select value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})}>
                <option>Lagos</option>
                <option>Abuja</option>
                <option>Kano</option>
                <option>Rivers</option>
                <option>Delta</option>
              </select>
            </div>

            <div className="input-group">
              <label>Credit Score (300-850)</label>
              <input 
                type="range" min="300" max="850" 
                value={formData.creditScore} 
                onChange={(e) => setFormData({...formData, creditScore: e.target.value})}
              />
              <span className="value-display">{formData.creditScore}</span>
            </div>

            <div className="input-group checkbox">
              <label>Criminal Record</label>
              <input 
                type="checkbox" 
                checked={formData.criminalRecord} 
                onChange={(e) => setFormData({...formData, criminalRecord: e.target.checked})}
              />
            </div>
          </div>

          <button className="btn-primary w-full" onClick={runSimulation} disabled={isAuditing}>
            {isAuditing ? 'Auditing Algorithm...' : 'Run Prediction'}
          </button>
        </div>

        {/* Column 2: Result & Explainability */}
        <div className="card glass result-section">
          <AnimatePresence mode="wait">
            {!result ? (
              <motion.div 
                key="empty"
                className="empty-state"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              >
                <Info size={48} />
                <p>Run a simulation to see the audit results.</p>
              </motion.div>
            ) : (
              <motion.div 
                key="result"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <div className={`status-badge ${result.approved ? 'approved' : 'denied'}`}>
                  {result.approved ? 'LOAN APPROVED' : 'LOAN DENIED'}
                </div>
                
                <div className="score-meter">
                  <div className="meter-label">Fairness Score: {result.score}%</div>
                  <div className="meter-bar">
                    <div className="meter-fill" style={{ width: `${Math.max(0, result.score)}%` }}></div>
                  </div>
                </div>

                <div className="explainability-panel">
                  <h4>Key Factors Affecting Decision</h4>
                  <div className="factor-list">
                    {result.factors.map((f, i) => (
                      <div key={i} className="factor-item">
                        <span>{f.name}</span>
                        <span className={f.impact > 0 ? 'pos' : 'neg'}>
                          {f.impact > 0 ? '+' : ''}{f.impact}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Column 3: Bias Injection & What-If */}
        <div className="side-panel">
          <div className="card glass bias-injection-section">
            <div className="card-header">
              <ShieldAlert size={20} className="neg" />
              <h3>Bias Injection Mode</h3>
            </div>
            <p className="card-hint">Manually alter weights to simulate discriminatory patterns.</p>

            <div className="toggle-list">
              <div className="toggle-item">
                <span>Penalize Specific Regions</span>
                <button onClick={() => setBiasSettings({...biasSettings, penalizeLocation: !biasSettings.penalizeLocation})}>
                  {biasSettings.penalizeLocation ? <ToggleRight className="neg" /> : <ToggleLeft />}
                </button>
              </div>
              <div className="toggle-item">
                <span>Gender Bias (Simulated)</span>
                <button onClick={() => setBiasSettings({...biasSettings, genderBias: !biasSettings.genderBias})}>
                  {biasSettings.genderBias ? <ToggleRight className="neg" /> : <ToggleLeft />}
                </button>
              </div>
              <div className="toggle-item">
                <span>Strict Criminal Policy</span>
                <button onClick={() => setBiasSettings({...biasSettings, strictCriminalRecord: !biasSettings.strictCriminalRecord})}>
                  {biasSettings.strictCriminalRecord ? <ToggleRight className="neg" /> : <ToggleLeft />}
                </button>
              </div>
            </div>
          </div>

          <div className="card glass metrics-section">
            <div className="card-header">
              <TrendingUp size={20} className="pos" />
              <h3>Regional Approval Rates</h3>
            </div>
            {metrics && (
              <div className="metrics-list">
                {Object.entries(metrics.approvalRates).map(([region, rate]) => (
                  <div key={region} className="metric-bar-group">
                    <div className="metric-label">
                      <span>{region}</span>
                      <span>{(rate * 100).toFixed(0)}%</span>
                    </div>
                    <div className="mini-bar">
                      <div className="mini-fill" style={{ width: `${rate * 100}%`, background: rate < 0.5 ? '#ef4444' : 'var(--accent-secondary)' }}></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
