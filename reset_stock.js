const supabase = require('./config/supabaseClient');

async function resetStock() {
  console.log('Resetting inventory movements...');
  const { error: moveError } = await supabase
    .from('inventory_movements')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Supabase requires a filter for bulk delete

  if (moveError) {
    console.error('Error deleting movements:', moveError);
    return;
  }
  console.log('Movements deleted.');

  console.log('Resetting items stock to 0...');
  const { error: itemError } = await supabase
    .from('inventory_items')
    .update({ stock: 0 })
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Supabase requires a filter for bulk update

  if (itemError) {
    console.error('Error updating items:', itemError);
    return;
  }
  console.log('Items stock reset.');
  console.log('Done!');
}

resetStock();
