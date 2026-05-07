import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, BarChart3, Users, ArrowRight, CheckCircle2, Globe, LayoutDashboard, Home, LogOut } from 'lucide-react';
import { supabase } from './lib/supabase';
import Dashboard from './components/Dashboard';
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
        <button onClick={() => setView('dashboard')} className={currentView === 'dashboard' ? 'active' : ''}>
          Dashboard
        </button>
        {session ? (
          <button className="btn-secondary logout-btn" onClick={() => supabase.auth.signOut()}>
            <LogOut size={18} /> Sign Out
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '1rem' }}>
             <button onClick={() => setView('auth')} className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
              Sign In
            </button>
            <button className="btn-primary" onClick={() => setView('auth')} style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
              Get Started
            </button>
          </div>
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
  const canvasRef = useRef(null);
  const mouse = useRef({ x: -1000, y: -1000, vx: 0, vy: 0, lastX: 0, lastY: 0 });
  const particles = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrame;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const createParticles = () => {
      const count = 300; // Increased count to fill empty spaces
      const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#38bdf8', '#fbbf24', '#ffffff'];
      particles.current = Array.from({ length: count }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 1.5 + 0.5, // Slightly smaller for higher density
        baseSize: Math.random() * 1.5 + 0.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: 0,
        vy: -Math.random() * 0.6 - 0.2, // Slower base float
        scatter: 0
      }));
    };

    const handleMouseMove = (e) => {
      mouse.current.vx = e.clientX - mouse.current.lastX;
      mouse.current.vy = e.clientY - mouse.current.lastY;
      mouse.current.lastX = e.clientX;
      mouse.current.lastY = e.clientY;
      mouse.current.x = e.clientX;
      mouse.current.y = e.clientY;
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const mouseSpeed = Math.sqrt(mouse.current.vx ** 2 + mouse.current.vy ** 2);
      
      particles.current.forEach(p => {
        const dx = mouse.current.x - p.x;
        const dy = mouse.current.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        
        const targetRadius = 80; // The ring radius
        const threshold = 150; // Interaction zone

        // Ring Gravity effect
        if (dist < threshold && mouseSpeed < 4) {
          const distFromRing = dist - targetRadius;
          const pullStrength = 0.003; // Minimal gravitational pull
          
          // Force towards the target ring radius
          const force = distFromRing * pullStrength;
          p.vx += (dx / dist) * force;
          p.vy += (dy / dist) * force;
          
          // Coordinated damping
          p.vx *= 0.96;
          p.vy *= 0.96;
        } else if (dist < 100 && mouseSpeed >= 4) {
          // Minimal scatter
          p.scatter = 30;
          p.vx -= mouse.current.vx * 0.1;
          p.vy -= mouse.current.vy * 0.1;
        }

        // Apply velocities
        p.x += p.vx;
        p.y += p.vy;

        // Friction / Return to normal
        p.vx *= 0.98;
        if (p.scatter > 0) {
          p.scatter--;
        } else {
          // Normal float behavior
          p.vy += (-0.5 - p.vy) * 0.02;
          p.size += (p.baseSize - p.size) * 0.05;
        }

        // Screen wrap
        if (p.y < -20) p.y = canvas.height + 20;
        if (p.x < -20) p.x = canvas.width + 20;
        if (p.x > canvas.width + 20) p.x = -20;

        // Draw
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowBlur = p.color === '#ffffff' ? 5 : 12;
        ctx.shadowColor = p.color;
        ctx.globalAlpha = 0.6;
        ctx.fill();
      });

      // Decay mouse velocity
      mouse.current.vx *= 0.9;
      mouse.current.vy *= 0.9;

      animationFrame = requestAnimationFrame(animate);
    };

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', handleMouseMove);
    resize();
    createParticles();
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrame);
    };
  }, []);

  return <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />;
};

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
