import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  MapPin,
  CreditCard,
  AlertCircle,
  CheckCircle,
  BarChart3,
  Play,
  Zap
} from 'lucide-react';
import './Dashboard.css';

const Dashboard = () => {
  const [formData, setFormData] = useState({
    name: '',
    income: 150000,
    employment: 'Private Sector',
    creditScore: 650,
    location: 'Lagos',
    criminalRecord: false,
  });

  const [biasSettings, setBiasSettings] = useState({
    penalizeLocation: false,
    genderBias: false,
    strictCriminalRecord: true,
  });

  const [result, setResult] = useState(null);
  const [batchResult, setBatchResult] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isBatchLoading, setIsBatchLoading] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'https://coffeescript.onrender.com';

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch(`${API_URL}/api/metrics`);
        const data = await response.json();
        setMetrics(data);
      } catch (e) {
        console.error(e);
      }
    };
    fetchMetrics();
  }, []);

  const runSimulation = async () => {
    setIsLoading(true);
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
      setIsLoading(false);
    }
  };

  const runBatchAudit = async () => {
    setIsBatchLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/audit/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: 30, biasSettings })
      });
      const data = await response.json();
      setBatchResult(data);
    } catch (error) {
      console.error('Batch Audit failed:', error);
    } finally {
      setIsBatchLoading(false);
    }
  };

  const hasBias = Object.values(biasSettings).some(v => v);

  return (
    <div className="dashboard">
      <header className="header">
        <div className="header-content">
          <h1>LEBA Auditor</h1>
          <span className={`status-badge ${hasBias ? 'active' : 'clean'}`}>
            {hasBias ? 'Bias Mode' : 'Standard'}
          </span>
        </div>
      </header>

      <main className="main-content">
        <section className="panel simulator-panel">
          <h2>Application</h2>

          <div className="form">
            <div className="form-group">
              <label htmlFor="income">Monthly Income (₦)</label>
              <input
                id="income"
                type="number"
                value={formData.income}
                onChange={(e) => setFormData({ ...formData, income: e.target.value })}
                placeholder="150000"
              />
            </div>

            <div className="form-group">
              <label htmlFor="location">State</label>
              <select
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              >
                <option>Lagos</option>
                <option>Abuja</option>
                <option>Kano</option>
                <option>Rivers</option>
                <option>Delta</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="credit">Credit Score</label>
              <div className="input-with-value">
                <input
                  id="credit"
                  type="range"
                  min="300"
                  max="850"
                  value={formData.creditScore}
                  onChange={(e) => setFormData({ ...formData, creditScore: e.target.value })}
                />
                <span className="value">{formData.creditScore}</span>
              </div>
            </div>

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.criminalRecord}
                onChange={(e) => setFormData({ ...formData, criminalRecord: e.target.checked })}
              />
              <span>Criminal Record</span>
            </label>
          </div>

          <button
            className="btn-primary"
            onClick={runSimulation}
            disabled={isLoading}
          >
            <Play size={16} />
            {isLoading ? 'Running...' : 'Run Audit'}
          </button>
        </section>

        <section className="panel result-panel">
          <AnimatePresence mode="wait">
            {!result ? (
              <motion.div
                key="empty"
                className="empty-state"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <AlertCircle size={32} />
                <p>Run an audit to see results</p>
              </motion.div>
            ) : (
              <motion.div
                key="result"
                className="result-content"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className={`result-badge ${result.approved ? 'approved' : 'denied'}`}>
                  {result.approved ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                  <span>{result.approved ? 'APPROVED' : 'DENIED'}</span>
                </div>

                <div className="score-section">
                  <div className="score-label">Fairness Score</div>
                  <div className="score-bar">
                    <div
                      className="score-fill"
                      style={{ width: `${Math.max(0, result.score)}%` }}
                    ></div>
                  </div>
                  <div className="score-value">{result.score}%</div>
                </div>

                {result.factors && result.factors.length > 0 && (
                  <div className="factors-section">
                    <h3>Factors</h3>
                    <div className="factors-list">
                      {result.factors.map((f, i) => (
                        <div key={i} className="factor-row">
                          <span className="factor-name">{f.name}</span>
                          <span className={`factor-impact ${f.impact > 0 ? 'positive' : 'negative'}`}>
                            {f.impact > 0 ? '+' : ''}{f.impact}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {metrics && (
            <div className="metrics-section">
              <h3>Regional Rates</h3>
              <div className="metrics-grid">
                {Object.entries(metrics.approvalRates).map(([region, rate]) => (
                  <div key={region} className="metric-item">
                    <span className="metric-label">{region}</span>
                    <div className="metric-bar">
                      <div
                        className="metric-fill"
                        style={{ width: `${rate * 100}%` }}
                      ></div>
                    </div>
                    <span className="metric-value">{(rate * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>

      <aside className="controls-panel">
        <div className="controls-section">
          <h3>Bias Controls</h3>
          <div className="toggles">
            <button
              className={`toggle-btn ${biasSettings.penalizeLocation ? 'active' : ''}`}
              onClick={() => setBiasSettings({ ...biasSettings, penalizeLocation: !biasSettings.penalizeLocation })}
            >
              <span>Regional Penalty</span>
              <div className="toggle-indicator"></div>
            </button>
            <button
              className={`toggle-btn ${biasSettings.genderBias ? 'active' : ''}`}
              onClick={() => setBiasSettings({ ...biasSettings, genderBias: !biasSettings.genderBias })}
            >
              <span>Gender Bias</span>
              <div className="toggle-indicator"></div>
            </button>
            <button
              className={`toggle-btn ${biasSettings.strictCriminalRecord ? 'active' : ''}`}
              onClick={() => setBiasSettings({ ...biasSettings, strictCriminalRecord: !biasSettings.strictCriminalRecord })}
            >
              <span>Strict Policy</span>
              <div className="toggle-indicator"></div>
            </button>
          </div>
        </div>

        <button
          className="btn-secondary"
          onClick={runBatchAudit}
          disabled={isBatchLoading}
        >
          <Zap size={16} />
          {isBatchLoading ? 'Processing...' : 'Batch Audit (30)'}
        </button>

        {batchResult && (
          <motion.div
            className="batch-report"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h3>Batch Report</h3>
            <div className="report-grid">
              <div className="report-item">
                <span className="report-label">Fairness</span>
                <span className="report-value">{batchResult.summary.fairnessScore}%</span>
              </div>
              <div className="report-item">
                <span className="report-label">Disparity</span>
                <span className="report-value">{batchResult.metrics.genderParity.disparateImpactRatio}</span>
              </div>
            </div>
          </motion.div>
        )}
      </aside>
    </div>
  );
};

export default Dashboard;