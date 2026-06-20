const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase URL and Service Role Key must be provided in the .env file.');
}

// We use the service role key so the backend has admin access to bypass RLS,
// but all route access is governed by our own JWT and middleware logic.
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
