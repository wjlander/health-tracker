import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const configError: string | null = (() => {
  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.trim() === '' || supabaseAnonKey.trim() === '') {
    return `Supabase configuration missing. Please check your .env file:
- VITE_SUPABASE_URL should contain your Supabase project URL
- VITE_SUPABASE_ANON_KEY should contain your Supabase anon key

Current values:
- VITE_SUPABASE_URL: ${supabaseUrl || 'undefined'}
- VITE_SUPABASE_ANON_KEY: ${supabaseAnonKey ? 'present' : 'undefined'}

Make sure to restart the development server after updating .env`;
  }
  
  try {
    new URL(supabaseUrl);
    return null;
  } catch {
    return 'Invalid Supabase URL format. Please check your VITE_SUPABASE_URL.';
  }
})();

export const supabase = configError ? null : createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  },
  global: {
    headers: {
      'X-Client-Info': 'enhanced-health-tracker@2.0.0'
    }
  }
});

if (supabase) {
  console.log('✅ Supabase client initialized successfully');
} else {
  console.error('❌ Supabase client initialization failed:', configError);
}