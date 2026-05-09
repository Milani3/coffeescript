import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Shield, Mail, Lock, User } from 'lucide-react';
import './Auth.css';

const Auth = ({ onBack }) => {
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    age: '',
    gender: '',
    maritalStatus: '',
    employmentStatus: '',
    residentialLocation: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isRegister) {
        const { error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              full_name: formData.fullName,
              age: formData.age,
              gender: formData.gender,
              marital_status: formData.maritalStatus,
              employment_status: formData.employmentStatus,
              location: formData.residentialLocation
            }
          }
        });
        if (error) throw error;
        alert('Registration successful!');
        setIsRegister(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
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
    <div className="leba-auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <Shield size={20} className="logo-icon" />
            <span>leba</span>
          </div>
          <h1>{isRegister ? 'Create account' : 'Welcome back'}</h1>
        </div>

        <form onSubmit={handleAuth} className="auth-form">
          <div className="input-group">
            <input 
              type="email" 
              name="email"
              placeholder="Email address" 
              value={formData.email}
              onChange={handleChange}
              required 
            />
          </div>

          <div className="input-group password-group">
            <input 
              type="password" 
              name="password"
              placeholder="Password" 
              value={formData.password}
              onChange={handleChange}
              required 
            />
            <button type="button" className="password-toggle">
              <Lock size={16} />
            </button>
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'Processing...' : (isRegister ? 'Create account' : 'Log in')}
          </button>
        </form>

        <div className="social-divider">
          <span>or {isRegister ? 'sign up' : 'log in'} with</span>
        </div>

        <div className="social-links">
          <button className="social-btn"><Mail size={20} /></button>
          <button className="social-btn"><Shield size={20} /></button>
          <button className="social-btn"><User size={20} /></button>
        </div>

        <p className="legal-text">
          By creating an account you agree to LEBA's<br />
          <a href="#">Terms of Services</a> and <a href="#">Privacy Policy</a>.
        </p>

        <div className="auth-footer">
          {isRegister ? 'Have an account?' : "Don't have an account?"}
          <button onClick={() => setIsRegister(!isRegister)}>
            {isRegister ? 'Log in' : 'Sign up'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
