const db = require('./config/db');

function cleanupLedger() {
  console.log("Starting ledger cleanup...");

  const movements = db.prepare(`SELECT id, party_name, from_block_id, to_block_id, to_branch_id, branch_id FROM inventory_movements WHERE party_name LIKE 'Transfer to %' OR party_name LIKE 'Transfer from %'`).all();

  console.log(`Found ${movements.length} transfer entries to check...`);

  let updatedCount = 0;

  const updateStmt = db.prepare('UPDATE inventory_movements SET party_name = ? WHERE id = ?');

  const updateTx = db.transaction(() => {
    for (const mov of movements) {
      const isOutward = mov.party_name.startsWith('Transfer to ');
      
      // Attempt to extract what might be a UUID from the party_name
      const extractedStr = isOutward ? mov.party_name.replace('Transfer to ', '') : mov.party_name.replace('Transfer from ', '');

      // Check if it's a UUID (length 36, contains hyphens)
      const isUUID = extractedStr.length === 36 && extractedStr.includes('-');

      if (isUUID) {
        // It's a bad entry! Fix it.
        const isInternal = mov.branch_id === mov.to_branch_id; // In original DB schema, branch_id was the operating branch
        
        let newName = '';
        
        const fromBranch = db.prepare('SELECT name FROM branches WHERE id = ?').get(mov.branch_id);
        const toBranch = db.prepare('SELECT name FROM branches WHERE id = ?').get(mov.to_branch_id);
        const fromBlock = mov.from_block_id ? db.prepare('SELECT name FROM branch_blocks WHERE id = ?').get(mov.from_block_id) : null;
        const toBlock = mov.to_block_id ? db.prepare('SELECT name FROM branch_blocks WHERE id = ?').get(mov.to_block_id) : null;

        if (isInternal) {
          if (isOutward) {
            if (mov.to_block_id) newName = `Transfer to Block ${toBlock ? toBlock.name : 'Unknown'}`;
            else newName = `Transfer to Same Branch`;
          } else {
            if (mov.from_block_id) newName = `Transfer from Block ${fromBlock ? fromBlock.name : 'Unknown'}`;
            else newName = `Transfer from Main Inventory`;
          }
        } else {
          // External
          if (isOutward) {
            let toStr = `${toBranch ? toBranch.name : 'Unknown'}`;
            if (mov.to_block_id) toStr += ` (Block ${toBlock ? toBlock.name : 'Unknown'})`;
            newName = `Transfer to Branch ${toStr}`;
          } else {
            // For INWARD records, the old code used 'from_branch_id' embedded in party_name. 
            // In the DB, inward records have `branch_id` as the destination, and `party_name` had the source UUID.
            const sourceBranch = db.prepare('SELECT name FROM branches WHERE id = ?').get(extractedStr);
            let fromStr = `${sourceBranch ? sourceBranch.name : 'Unknown'}`;
            if (mov.from_block_id) fromStr += ` (Block ${fromBlock ? fromBlock.name : 'Unknown'})`;
            newName = `Transfer from Branch ${fromStr}`;
          }
        }

        updateStmt.run(newName, mov.id);
        updatedCount++;
        console.log(`Updated: [${mov.id}] '${mov.party_name}' -> '${newName}'`);
      }
    }
  });

  updateTx();

  console.log(`Cleanup complete! Updated ${updatedCount} entries.`);
}

cleanupLedger();
