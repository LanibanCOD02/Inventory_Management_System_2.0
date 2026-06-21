const fs = require('fs');
const code = `
  /* Empty state overrides for mobile cards */
  tbody td[colspan] {
    display: block;
    width: 100%;
    text-align: center !important;
    padding: 32px !important;
    background: transparent !important;
    border: none !important;
  }
  tbody td[colspan]::before {
    display: none !important;
  }
`;
// Need to insert this inside the @media (max-width: 540px) block.
// Let's just append another media query block at the end.
const css = `
@media(max-width: 540px) {
${code}
}
`;
fs.appendFileSync('styles.css', css);
console.log('Appended empty state fix to styles.css');
