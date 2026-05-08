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
    <div className="cosmos-auth">
      <div className="cosmos-card">
        <div className="cosmos-logo-container">
          <div className="cosmos-outer-circle">
            <div className="cosmos-inner-dot"></div>
          </div>
          <h1>COSMOS</h1>
          <p className="stellar-subtitle">STELLAR AUTHENTICATION PORTAL</p>
        </div>

        <div className="auth-tabs">
          <button 
            className={`tab-btn ${!isRegister ? 'active' : ''}`}
            onClick={() => setIsRegister(false)}
          >
            SIGN IN
          </button>
          <button 
            className={`tab-btn ${isRegister ? 'active' : ''}`}
            onClick={() => setIsRegister(true)}
          >
            SIGN UP
          </button>
          <div className={`tab-indicator ${isRegister ? 'on-signup' : 'on-signin'}`} />
        </div>

        <form onSubmit={handleAuth} className="cosmos-form">
          <div className="form-scroll-area">
            <div className="input-field">
              <label>EMAIL ADDRESS</label>
              <div className="input-wrapper">
                <input 
                  type="email" 
                  name="email"
                  placeholder="you@universe.com" 
                  value={formData.email}
                  onChange={handleChange}
                  required 
                />
              </div>
            </div>

            <div className="input-field">
              <label>PASSWORD</label>
              <div className="input-wrapper">
                <input 
                  type="password" 
                  name="password"
                  placeholder="••••••••" 
                  value={formData.password}
                  onChange={handleChange}
                  required 
                />
              </div>
            </div>

            {isRegister && (
              <div className="register-fields">
                <div className="input-field">
                  <label>FULL NAME</label>
                  <div className="input-wrapper">
                    <input type="text" name="fullName" placeholder="Full Name" value={formData.fullName} onChange={handleChange} required />
                  </div>
                </div>
                <div className="input-grid">
                   <div className="input-field">
                    <label>AGE</label>
                    <div className="input-wrapper">
                      <input type="number" name="age" placeholder="Age" value={formData.age} onChange={handleChange} required />
                    </div>
                  </div>
                  <div className="input-field">
                    <label>GENDER</label>
                    <div className="input-wrapper">
                      <select name="gender" value={formData.gender} onChange={handleChange} required>
                        <option value="">SELECT</option>
                        <option value="male">MALE</option>
                        <option value="female">FEMALE</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="input-field">
                  <label>MARITAL STATUS</label>
                  <div className="input-wrapper">
                    <select name="maritalStatus" value={formData.maritalStatus} onChange={handleChange} required>
                      <option value="">SELECT</option>
                      <option value="single">SINGLE</option>
                      <option value="married">MARRIED</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {error && <div className="auth-error-msg">{error}</div>}

          <button type="submit" className="launch-btn" disabled={loading}>
            {loading ? 'PROCESSING...' : `LAUNCH ${isRegister ? 'SIGN UP' : 'SIGN IN'}`}
          </button>
        </form>

        <div className="auth-switch">
          <p>
            {isRegister ? 'Already have an account?' : "Don't have an account?"}
            <button onClick={() => setIsRegister(!isRegister)}>
              {isRegister ? 'Sign in' : 'Sign up'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
