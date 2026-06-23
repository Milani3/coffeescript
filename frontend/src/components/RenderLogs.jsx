import React, { useEffect, useState } from 'react';
import { Activity, AlertTriangle, Bot, CheckCircle2, RefreshCw, Server, ShieldAlert } from 'lucide-react';

const emptyState = {
  status: 'loading'
};

const badgeClass = (value) => {
  if (value === true) return 'ok';
  if (value === false) return 'error';
  if (value === 'ok' || value === 'connected') return 'ok';
  if (value === 'warning' || value === 'fallback' || value === 'missing token') return 'warning';
  return 'error';
};

const RenderLogs = ({ apiUrl }) => {
  const [health, setHealth] = useState(emptyState);
  const [logs, setLogs] = useState([]);
  const [aiStatus, setAiStatus] = useState(emptyState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const load = async () => {
    if (!apiUrl) {
      setError('API URL is not set.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      const [healthRes, logsRes, aiRes] = await Promise.all([
        fetch(`${apiUrl}/api/health`),
        fetch(`${apiUrl}/api/debug/logs`),
        fetch(`${apiUrl}/api/debug/ai-status`)
      ]);

      const [healthJson, logsJson, aiJson] = await Promise.all([
        healthRes.json(),
        logsRes.json(),
        aiRes.json()
      ]);

      setHealth(healthJson);
      setLogs(Array.isArray(logsJson.logs) ? logsJson.logs : []);
      setAiStatus(aiJson);
      setLastUpdated(new Date().toLocaleString());
    } catch (err) {
      setError(err.message || 'Unable to load Render diagnostics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const timer = setInterval(load, 20000);
    return () => clearInterval(timer);
  }, [apiUrl]);

  return (
    <div className="render-logs">
      <div className="render-logs-header">
        <div>
          <h1>Render Logs</h1>
          <p>Backend connection, health checks, and AI error visibility.</p>
        </div>
        <button className="render-refresh" onClick={load} disabled={loading}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      <div className="render-grid">
        <section className="render-card">
          <div className="render-card-title">
            <Server size={16} />
            <span>Backend Connection</span>
          </div>
          <div className={`render-badge ${badgeClass(health.status)}`}>{health.status || 'unknown'}</div>
          <div className="render-meta">{health.renderUrl || 'Local or hosted backend'}</div>
          <div className="render-meta">Last checked: {lastUpdated || 'not yet'}</div>
        </section>

        <section className="render-card">
          <div className="render-card-title">
            <Activity size={16} />
            <span>Connection Health</span>
          </div>
          <div className={`render-badge ${badgeClass(health.hfConfigured)}`}>
            {health.hfConfigured ? 'AI configured' : 'AI missing'}
          </div>
          <div className="render-meta">Simulator model: {health.hfModel || 'n/a'}</div>
          <div className="render-meta">Audit model: {health.hfAuditModel || 'n/a'}</div>
        </section>

        <section className="render-card">
          <div className="render-card-title">
            <Bot size={16} />
            <span>AI Status</span>
          </div>
          <div className={`render-badge ${badgeClass(aiStatus.configured ? 'ok' : 'error')}`}>
            {aiStatus.configured ? 'connected' : 'fallback'}
          </div>
          <div className="render-meta">Simulator: {aiStatus.simulator?.note || aiStatus.simulator || 'n/a'}</div>
          <div className="render-meta">Audit: {aiStatus.audit?.note || aiStatus.audit || 'n/a'}</div>
        </section>
      </div>

      {error && (
        <section className="render-alert">
          <AlertTriangle size={16} />
          <span>{error}</span>
        </section>
      )}

      <section className="render-card render-log-list">
        <div className="render-card-title">
          <ShieldAlert size={16} />
          <span>Recent Backend Logs</span>
        </div>
        {loading && logs.length === 0 ? (
          <div className="render-empty">Loading logs...</div>
        ) : logs.length === 0 ? (
          <div className="render-empty">No backend logs yet.</div>
        ) : (
          <div className="render-rows">
            {logs.map((log, index) => (
              <div key={`${log.timestamp}-${index}`} className="render-row">
                <div className={`render-badge ${badgeClass(log.level)}`}>{log.level}</div>
                <div className="render-row-main">
                  <div className="render-row-head">
                    <strong>{log.category}</strong>
                    <span>{log.timestamp}</span>
                  </div>
                  <div>{log.message}</div>
                  {log.details && <pre>{JSON.stringify(log.details, null, 2)}</pre>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="render-footer">Updated from {apiUrl || 'local API'}</div>
    </div>
  );
};

export default RenderLogs;
