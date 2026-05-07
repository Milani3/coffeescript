const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Supabase Client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'LEBA API is active' });
});

/**
 * Endpoint for Loan Eligibility Prediction with Bias Injection
 */
app.post('/api/predict', async (req, res) => {
  try {
    const { formData, biasSettings } = req.body;
    
    let score = 0;
    let factors = [];

    // 1. Base Logic (Simulating a neutral model)
    const income = Number(formData.income);
    const creditScore = Number(formData.creditScore);

    // Income Factor
    if (income > 500000) { 
      score += 45; 
      factors.push({ name: 'High Monthly Income', impact: 45 }); 
    } else if (income > 200000) { 
      score += 30; 
      factors.push({ name: 'Stable Monthly Income', impact: 30 }); 
    } else { 
      score += 10; 
      factors.push({ name: 'Low Income Bracket', impact: 10 }); 
    }

    // Credit Score Factor
    if (creditScore > 750) { 
      score += 35; 
      factors.push({ name: 'Excellent Credit History', impact: 35 }); 
    } else if (creditScore > 600) { 
      score += 20; 
      factors.push({ name: 'Fair Credit History', impact: 20 }); 
    } else { 
      score -= 10; 
      factors.push({ name: 'Poor Credit History', impact: -10 }); 
    }

    // 2. Bias Injection Logic (The "Audit" part)
    
    // Location Bias (e.g., penalizing northern or specific southern regions based on mock risk data)
    if (biasSettings.penalizeLocation) {
      const penalizedStates = ['Kano', 'Kaduna', 'Delta', 'Rivers'];
      if (penalizedStates.includes(formData.location)) {
        score -= 30;
        factors.push({ name: 'Regional Risk Adjustment (Biased)', impact: -30 });
      }
    }

    // Gender Bias Simulation
    if (biasSettings.genderBias && formData.gender === 'Female') {
      score -= 20;
      factors.push({ name: 'Gender Weighting (Biased)', impact: -20 });
    }

    // Strict Criminal Policy
    if (formData.criminalRecord) {
      const penalty = biasSettings.strictCriminalRecord ? 60 : 20;
      score -= penalty;
      factors.push({ name: 'Criminal Record Penalty', impact: -penalty });
    }

    const approved = score >= 50;

    const results = {
      timestamp: new Date().toISOString(),
      approved,
      score: Math.min(100, Math.max(0, score)),
      factors,
      metadata: {
        model: 'LEBA-Audit-v1',
        region: 'Nigeria-Localized'
      }
    };

    res.json(results);
  } catch (error) {
    console.error('Prediction Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * Placeholder for Dashboard Metrics
 */
app.get('/api/metrics', (req, res) => {
  res.json({
    approvalRates: {
      Lagos: 0.72,
      Abuja: 0.68,
      Kano: 0.35,
      Rivers: 0.42
    },
    biasIndex: 0.24,
    totalAudits: 1240
  });
});

app.listen(port, () => {
  console.log(`LEBA Backend running on port ${port}`);
});
