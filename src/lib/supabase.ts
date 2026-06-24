import { createClient } from '@supabase/supabase-js';

const rawUrl = (import.meta.env && import.meta.env.VITE_SUPABASE_URL) ? import.meta.env.VITE_SUPABASE_URL : 'https://bgtrdcskvggpvdtkkpfx.supabase.co';
const rawKey = (import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY) ? import.meta.env.VITE_SUPABASE_ANON_KEY : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJndHJkY3NrdmdncHZkdGtrcGZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMDA2MDMsImV4cCI6MjA5Nzg3NjYwM30.YB1-5uJ0AQPBogDtub9EWIpo6V8Ok_tMLRPUHdWBSak';

// Strip quotes if they were accidentally included
const supabaseUrl = rawUrl.replace(/^["'](.+(?=["']$))["']$/, '$1').trim();
const supabaseAnonKey = rawKey.replace(/^["'](.+(?=["']$))["']$/, '$1').trim();

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase URL or Anon Key is missing.");
}

export const supabase = createClient(
  supabaseUrl.startsWith('http') ? supabaseUrl : 'https://bgtrdcskvggpvdtkkpfx.supabase.co',
  supabaseAnonKey
);
