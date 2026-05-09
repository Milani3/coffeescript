import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, BarChart3, Users, ArrowRight, CheckCircle2, Globe, LayoutDashboard, Home, LogOut } from 'lucide-react';
import { supabase } from './lib/supabase';
import Dashboard from './components/Dashboard';
import DashboardV2 from './components/DashboardV2';
import Auth from './components/Auth';
import './App.css';

// Custom Icons
import demographicsIcon from './assets/demographics.png';
import metricsIcon from './assets/metrics.png';
import localizedIcon from './assets/localized.png';

const Navbar = ({ currentView, setView, session }) => (
  <nav className="navbar">
    <div className="container nav-content">
      <div className="logo" onClick={() => setView('home')} style={{ cursor: 'pointer' }}>
        <Shield className="logo-icon" size={24} />
        <span style={{ letterSpacing: '2px', fontSize: '1.2rem' }}>LEBA</span>
      </div>
      <div className="nav-links">
        <button onClick={() => setView('home')} className={currentView === 'home' ? 'active' : ''}>
          Features
        </button>
        {session ? (
          <button className="btn-secondary logout-btn" onClick={() => supabase.auth.signOut()}>
            <LogOut size={18} /> Sign Out
          </button>
        ) : (
          <button className="btn-primary" onClick={() => setView('auth')}>
            Get Started
          </button>
        )}
      </div>
    </div>
  </nav>
);

const FeatureCard = ({ icon, title, description, delay }) => {
  const Icon = icon;
  const isImageIcon = typeof icon === 'string';

  return (
    <motion.div 
      className="feature-card glass"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      viewport={{ once: true }}
    >
      <div className="feature-icon-wrapper">
        {isImageIcon ? (
          <img src={icon} alt={title} className="feature-icon-img" />
        ) : (
          <Icon className="feature-icon" />
        )}
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
    </motion.div>
  );
};

const Stardust = () => {
  const stars = Array.from({ length: 150 });
  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#38bdf8', '#fbbf24'];
  
  return (
    <div className="stardust">
      {stars.map((_, i) => {
        const isColored = Math.random() < 0.4;
        const color = isColored ? colors[Math.floor(Math.random() * colors.length)] : 'white';
        const parallaxFactor = Math.random() * 20 + 10;
        
        return (
          <div 
            key={i} 
            className="star-wrapper" 
            style={{
              left: `${Math.random() * 100}%`,
              top: '0',
              '--parallax': parallaxFactor
            }}
          >
            <div 
              className="star" 
              style={{
                width: `${Math.random() * (isColored ? 5 : 3) + 2}px`,
                height: `${Math.random() * (isColored ? 5 : 3) + 2}px`,
                background: color,
                boxShadow: isColored ? `0 0 15px ${color}` : '0 0 10px rgba(255, 255, 255, 0.6)',
                '--duration': `${Math.random() * 15 + 10}s`,
                animationDelay: `${Math.random() * 20}s`
              }}
            />
          </div>
        );
      })}
    </div>
  );
};

function App() {
  const [view, setView] = useState('home');
  const [session, setSession] = useState(null);

  console.log('Current view:', view);

  // Mouse tracking for subtle parallax
  useEffect(() => {
    const handleMouseMove = (e) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      document.documentElement.style.setProperty('--mouse-x', x);
      document.documentElement.style.setProperty('--mouse-y', y);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

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
              <div className="hero-visual-bg">
                <Stardust />
              </div>
              
              <div className="container hero-content">
                <motion.div 
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                >
                  <h1 className="hero-title">
                    Auditing <span className="gradient-text">Bias</span> in Nigerian <br /> 
                    Loan Algorithms
                  </h1>
                  <p className="hero-subtitle">
                    Ensure fairness, transparency, and regulatory compliance for financial institutions with LEBA's state-of-the-art bias detection engine.
                  </p>
                  <div className="hero-actions">
                    <button className="btn-primary" onClick={handleDashboardAccess}>
                      Get Started Free <ArrowRight size={20} />
                    </button>
                    <button className="btn-secondary">
                      View Audit Demo
                    </button>
                  </div>
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
                    icon={metricsIcon}
                    title="Fairness Metrics"
                    description="Comprehensive analysis using Disparate Impact, Equal Opportunity, and Statistical Parity metrics."
                    delay={0.1}
                  />
                  <FeatureCard 
                    icon={demographicsIcon}
                    title="Demographic Analysis"
                    description="Identify bias across gender, age, location, and socio-economic groups relevant to Nigeria."
                    delay={0.2}
                  />
                  <FeatureCard 
                    icon={localizedIcon}
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
          <div className="auth-page-wrapper">
            <Auth onBack={() => setView('home')} />
          </div>
        )}

        {view === 'dashboard' && session && (
          <motion.div 
            key="dashboard"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <DashboardV2 user={session.user} />
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
