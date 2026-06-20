const supabase = require('./config/supabaseClient');
require('dotenv').config();

async function dumpSchema() {
  const tables = ['branches', 'users', 'inventory_items', 'inventory_movements', 'categories', 'suppliers', 'programs'];
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.error('Error fetching', table, error);
    } else {
      console.log('TABLE:', table);
      if (data.length > 0) {
        const row = data[0];
        for (const [key, value] of Object.entries(row)) {
          console.log('  ' + key + ': ' + typeof value + (value === null ? ' (nullable)' : ''));
        }
      } else {
        console.log('  (Empty table)');
      }
    }
  }
}
dumpSchema();
