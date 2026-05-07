import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, BarChart3, Users, ArrowRight, CheckCircle2, Globe, LayoutDashboard, Home, LogOut } from 'lucide-react';
import { supabase } from './lib/supabase';
import Dashboard from './components/Dashboard';
import Auth from './components/Auth';
import './App.css';

const Navbar = ({ currentView, setView, session }) => (
  <nav className="navbar glass">
    <div className="container nav-content">
      <div className="logo" onClick={() => setView('home')} style={{ cursor: 'pointer' }}>
        <Shield className="logo-icon" />
        <span>LEBA</span>
      </div>
      <div className="nav-links">
        <button onClick={() => setView('home')} className={currentView === 'home' ? 'active' : ''}>
          <Home size={18} /> Home
        </button>
        <button onClick={() => setView('dashboard')} className={currentView === 'dashboard' ? 'active' : ''}>
          <LayoutDashboard size={18} /> Dashboard
        </button>
        {session ? (
          <button className="btn-secondary logout-btn" onClick={() => supabase.auth.signOut()}>
            <LogOut size={18} /> Sign Out
          </button>
        ) : (
          currentView === 'home' && (
            <button className="btn-primary" onClick={() => setView('auth')}>
              Get Started
            </button>
          )
        )}
      </div>
    </div>
  </nav>
);

const FeatureCard = ({ icon: Icon, title, description, delay }) => (
  <motion.div 
    className="feature-card glass"
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    viewport={{ once: true }}
  >
    <div className="feature-icon-wrapper">
      <Icon className="feature-icon" />
    </div>
    <h3>{title}</h3>
    <p>{description}</p>
  </motion.div>
);

function App() {
  const [view, setView] = useState('home');
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        setView('dashboard');
      } else {
        setView('home');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleDashboardAccess = () => {
    if (session) {
      setView('dashboard');
    } else {
      setView('auth');
    }
  };

  return (
    <div className="app">
      <Navbar currentView={view} setView={view === 'auth' ? setView : (v) => v === 'dashboard' ? handleDashboardAccess() : setView(v)} session={session} />
      
      <AnimatePresence mode="wait">
        {view === 'home' && (
          <motion.main 
            key="home"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            {/* Hero Section */}
            <section className="hero">
              <div className="container hero-content">
                <motion.div 
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8 }}
                >
                  <h1 className="hero-title">
                    Auditing <span className="gradient-text">Bias</span> in Nigerian <br /> 
                    Loan Eligibility Algorithms
                  </h1>
                  <p className="hero-subtitle">
                    Ensure fairness, transparency, and regulatory compliance for financial institutions with LEBA's state-of-the-art bias detection engine.
                  </p>
                  <div className="hero-actions">
                    <button className="btn-primary" onClick={handleDashboardAccess}>
                      Start Audit <ArrowRight size={20} />
                    </button>
                    <button className="btn-secondary">
                      View Demo
                    </button>
                  </div>
                </motion.div>
                
                <motion.div 
                  className="hero-visual"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.8 }}
                >
                  <div className="visual-circle glass">
                    <BarChart3 size={120} className="visual-icon" />
                  </div>
                  <div className="visual-decoration decoration-1"></div>
                  <div className="visual-decoration decoration-2"></div>
                </motion.div>
              </div>
            </section>

            {/* Features Section */}
            <section id="features" className="features">
              <div className="container">
                <div className="section-header">
                  <h2 className="gradient-text">Powerful Auditing Tools</h2>
                  <p>Designed for the unique landscape of the Nigerian financial sector.</p>
                </div>
                
                <div className="features-grid">
                  <FeatureCard 
                    icon={BarChart3}
                    title="Fairness Metrics"
                    description="Comprehensive analysis using Disparate Impact, Equal Opportunity, and Statistical Parity metrics."
                    delay={0.1}
                  />
                  <FeatureCard 
                    icon={Users}
                    title="Demographic Analysis"
                    description="Identify bias across gender, age, location, and socio-economic groups relevant to Nigeria."
                    delay={0.2}
                  />
                  <FeatureCard 
                    icon={Globe}
                    title="Localized Context"
                    description="Tailored models that understand regional data nuances and regulatory requirements (CBN/NDPR)."
                    delay={0.3}
                  />
                </div>
              </div>
            </section>
          </motion.main>
        )}

        {view === 'auth' && (
          <motion.div 
            key="auth"
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
          >
            <Auth onBack={() => setView('home')} />
          </motion.div>
        )}

        {view === 'dashboard' && session && (
          <motion.div 
            key="dashboard"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
          >
            <Dashboard user={session.user} />
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="footer">
        <div className="container">
          <p>&copy; {new Date().getFullYear()} LEBA - Loan Eligibility Bias Auditor. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
