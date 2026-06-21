const fs = require('fs');
const code = `
/* ─── Mobile UX Optimizations ─────────────────────── */

button:active, .icon-btn:active, .nav-item:active {
  transform: scale(0.96);
  transition: transform 0.1s ease;
}

@media(max-width: 540px) {
  /* Forms & Touch Targets */
  input, select, textarea {
    font-size: 16px !important; /* Prevent iOS zoom */
    min-height: 44px;
  }
  .icon-btn, .primary-btn, .secondary-btn {
    min-height: 44px;
    min-width: 44px;
    justify-content: center;
  }
  .login-input-wrap input {
    font-size: 16px !important;
    min-height: 48px;
  }
  .login-btn {
    height: 48px;
    font-size: 16px;
    width: 100%;
  }
  
  /* Topbar Adjustments */
  .topbar {
    flex-wrap: wrap;
    gap: 12px;
  }
  .admin-only select {
    width: 100%;
    margin-top: 8px;
    min-height: 44px;
  }
  .page-title h1 {
    font-size: 16px;
  }

  /* Hamburger target */
  .hamburger {
    width: 44px;
    height: 44px;
  }

  /* Tables to Stacked Cards */
  table, thead, tbody, th, td, tr {
    display: block;
    width: 100%;
  }
  thead {
    display: none;
  }
  tbody tr {
    margin-bottom: 16px;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--white);
    box-shadow: var(--shadow-sm);
    overflow: hidden;
  }
  tbody td {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid var(--border-light);
    text-align: right;
    min-height: 44px;
  }
  tbody td:last-child {
    border-bottom: none;
  }
  tbody td::before {
    content: attr(data-label);
    font-weight: 600;
    color: var(--text-secondary);
    text-align: left;
    margin-right: 16px;
  }
  
  /* Override for first column (Header style) */
  tbody td:first-child {
    background: var(--bg-alt);
    border-bottom: 1px solid var(--border);
    justify-content: flex-start;
  }
  tbody td:first-child::before {
    display: none;
  }
  .item-name-cell {
    flex-direction: row;
    width: 100%;
  }
  .item-name-cell .item-info {
    text-align: left;
  }
  
  .card-footer button {
    min-height: 44px;
    padding: 0 12px;
  }
}
`;
fs.appendFileSync('styles.css', code);
console.log('Appended to styles.css');
