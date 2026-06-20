// createInitialUser.js
require('dotenv').config();
const bcrypt = require('bcrypt');
const supabase = require('./config/supabaseClient');

async function createAdmin() {
  const username = 'admin@msctrust.org';
  const plainTextPassword = 'Admin@123';
  const role = 'Admin';

  console.log(`Hashing password for ${username}...`);
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(plainTextPassword, saltRounds);

  console.log('Inserting into Supabase...');
  const { data, error } = await supabase
    .from('users')
    .insert([{ username: username, password_hash: passwordHash, role: role }])
    .select();

  if (error) {
    console.error('Error creating user:', error.message);
  } else {
    console.log('Successfully created initial Admin user!');
    console.log(data);
  }
}

createAdmin();
