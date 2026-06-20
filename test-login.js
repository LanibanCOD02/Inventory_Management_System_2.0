require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  console.log('Testing connection to Supabase...');
  console.log('URL:', process.env.SUPABASE_URL);
  
  const { data, error } = await supabase.from('users').select('*');
  if (error) {
    console.error('Error fetching users:', error);
    return;
  }
  
  console.log('Users found:', data);
  
  if (data.length > 0) {
    const user = data[0];
    console.log('Testing bcrypt compare for Admin@123...');
    const isValid = await bcrypt.compare('Admin@123', user.password_hash);
    console.log('Is password valid?', isValid);
  }
}

test();
