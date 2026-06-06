import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials missing. Please check your .env file.')
}

let currentSession = null;
try {
  const stored = localStorage.getItem('leba_mock_session');
  if (stored) {
    currentSession = JSON.parse(stored);
  }
} catch (e) {
  console.error('Failed to parse mock session', e);
}

const listeners = new Set();

const notifyListeners = (event, session) => {
  listeners.forEach(cb => {
    try {
      cb(event, session);
    } catch (err) {
      console.error(err);
    }
  });
};

const mockClient = {
  auth: {
    getSession: async () => ({ data: { session: currentSession }, error: null }),
    onAuthStateChange: (callback) => {
      listeners.add(callback);
      // Trigger callback immediately with current session state
      setTimeout(() => {
        callback('SIGNED_IN', currentSession);
      }, 0);
      return {
        data: {
          subscription: {
            unsubscribe: () => {
              listeners.delete(callback);
            }
          }
        }
      };
    },
    signUp: async ({ email, password, options }) => {
      const user = {
        id: 'mock-user-' + Math.random().toString(36).substring(2, 9),
        email,
        user_metadata: options?.data || {}
      };
      currentSession = { user, access_token: 'mock-access-token' };
      localStorage.setItem('leba_mock_session', JSON.stringify(currentSession));
      notifyListeners('SIGNED_IN', currentSession);
      return { data: { user, session: currentSession }, error: null };
    },
    signInWithPassword: async ({ email, password }) => {
      const user = {
        id: 'mock-user-' + Math.random().toString(36).substring(2, 9),
        email,
        user_metadata: {
          full_name: email.split('@')[0],
          age: '30',
          gender: 'Male',
          marital_status: 'Single',
          employment_status: 'Employed',
          location: 'Lagos'
        }
      };
      currentSession = { user, access_token: 'mock-access-token' };
      localStorage.setItem('leba_mock_session', JSON.stringify(currentSession));
      notifyListeners('SIGNED_IN', currentSession);
      return { data: { user, session: currentSession }, error: null };
    },
    signOut: async () => {
      currentSession = null;
      localStorage.removeItem('leba_mock_session');
      notifyListeners('SIGNED_OUT', null);
      return { error: null };
    }
  }
};

const isConfigured = supabaseUrl && supabaseAnonKey && 
                    !supabaseUrl.includes('placeholder') && 
                    !supabaseAnonKey.includes('placeholder');

export const supabase = isConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : mockClient;



