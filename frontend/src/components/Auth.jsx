import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import { LogIn, UserPlus, Mail, Lock, ShieldCheck, ArrowLeft } from 'lucide-react';
import './Auth.css';

const Auth = ({ onBack }) => {
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isRegister) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        alert('Registration successful! You can now sign in.');
        setIsRegister(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <motion.div 
        className="auth-card glass"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <button className="back-btn" onClick={onBack}>
          <ArrowLeft size={20} />
        </button>

        <div className="auth-header">
          <div className="auth-logo">
            <ShieldCheck size={40} className="pos" />
          </div>
          <h2>{isRegister ? 'Create Auditor Account' : 'Auditor Login'}</h2>
          <p>{isRegister ? 'Join the LEBA platform to start auditing.' : 'Welcome back to the LEBA platform.'}</p>
        </div>

        <form onSubmit={handleAuth} className="auth-form">
          <div className="auth-input-group">
            <Mail size={18} className="input-icon" />
            <input 
              type="email" 
              placeholder="Email Address" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
          </div>

          <div className="auth-input-group">
            <Lock size={18} className="input-icon" />
            <input 
              type="password" 
              placeholder="Password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" className="btn-primary auth-submit" disabled={loading}>
            {loading ? 'Processing...' : (isRegister ? 'Sign Up' : 'Sign In')}
            {isRegister ? <UserPlus size={20} /> : <LogIn size={20} />}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            {isRegister ? 'Already have an account?' : "Don't have an account?"}
            <button onClick={() => setIsRegister(!isRegister)}>
              {isRegister ? 'Sign In' : 'Register Now'}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
