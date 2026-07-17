const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'styles.css');
let code = fs.readFileSync(file, 'utf8');

// The bold, filled background SVG String
const svgContent = `
<svg xmlns="http://www.w3.org/2000/svg" width="500" height="500" viewBox="0 0 500 500">
  <g fill="rgba(255,255,255,0.12)" stroke="none">
    
    <!-- Thick Medical Cross 1 -->
    <g transform="translate(60, 60) scale(1.5)">
      <path d="M 10 0 H 22 V 10 H 32 V 22 H 22 V 32 H 10 V 22 H 0 V 10 H 10 Z"/>
    </g>

    <!-- Thick Medical Cross 2 -->
    <g transform="translate(380, 200) scale(1)">
      <path d="M 10 0 H 22 V 10 H 32 V 22 H 22 V 32 H 10 V 22 H 0 V 10 H 10 Z"/>
    </g>

    <!-- Thick DNA-like structure (stylized blocky helix) -->
    <g transform="translate(300, 50) scale(1.2) rotate(30)">
      <path d="M 0 0 C 10 -10, 20 -10, 30 0 C 20 10, 10 10, 0 0 Z M 5 2 L 10 10 L 15 2 Z" stroke="rgba(255,255,255,0.12)" stroke-width="4" fill="none"/>
      <path d="M 0 0 Q 15 -15 30 0 Q 45 15 60 0" stroke="rgba(255,255,255,0.12)" stroke-width="5" fill="none"/>
      <path d="M 0 0 Q 15 15 30 0 Q 45 -15 60 0" stroke="rgba(255,255,255,0.12)" stroke-width="5" fill="none"/>
      <line x1="10" y1="-8" x2="10" y2="8" stroke="rgba(255,255,255,0.12)" stroke-width="3"/>
      <line x1="20" y1="-12" x2="20" y2="12" stroke="rgba(255,255,255,0.12)" stroke-width="3"/>
      <line x1="40" y1="-12" x2="40" y2="12" stroke="rgba(255,255,255,0.12)" stroke-width="3"/>
      <line x1="50" y1="-8" x2="50" y2="8" stroke="rgba(255,255,255,0.12)" stroke-width="3"/>
    </g>

    <!-- Thick Stethoscope -->
    <g transform="translate(80, 280) scale(1.5)">
      <path d="M 10 0 A 10 10 0 0 0 0 10 V 20 A 15 15 0 0 0 30 20 V 10 A 10 10 0 0 0 20 0 H 15 V 5 H 20 A 5 5 0 0 1 25 10 V 20 A 10 10 0 0 1 5 20 V 10 A 5 5 0 0 1 10 5 H 15 V 0 Z"/>
      <circle cx="38" cy="20" r="5"/>
      <path d="M 30 20 H 33" stroke="rgba(255,255,255,0.12)" stroke-width="3"/>
    </g>

    <!-- Thick Heartbeat / ECG -->
    <g transform="translate(250, 380) scale(1.5)">
      <path d="M 0 15 H 10 L 15 5 L 25 35 L 30 15 H 40" stroke="rgba(255,255,255,0.12)" stroke-width="5" fill="none" stroke-linejoin="miter"/>
    </g>
    
    <!-- Bold Pill -->
    <g transform="translate(420, 380) scale(1.2) rotate(-45)">
      <rect x="0" y="0" width="40" height="20" rx="10" fill="rgba(255,255,255,0.12)"/>
      <line x1="20" y1="0" x2="20" y2="20" stroke="var(--dark-green)" stroke-width="3"/>
    </g>

    <!-- Bold Drops / Dots -->
    <circle cx="200" cy="150" r="4" />
    <circle cx="450" cy="80" r="4" />
    <circle cx="50" cy="450" r="4" />
    <circle cx="250" cy="250" r="4" />

  </g>
</svg>
`.replace(/\n/g, '').replace(/"/g, "'");

const regex = /background-image: url\('.*?'\);/g;
code = code.replace(regex, `background-image: url("data:image/svg+xml;utf8,${svgContent}");`);

// Let's also update the animation to pan 500px 
code = code.replace(/background-size: 400px 400px;/g, `background-size: 500px 500px;`);
code = code.replace(/to { transform: translate\(400px, 400px\); }/g, `to { transform: translate(500px, 500px); }`);

// Decrease the login box size
// .login-form-container {
//   width: 100%;
//   max-width: 400px;
//   background: #fff;
//   padding: 48px 40px;
const formContainerRegex = /\.login-form-container\s*\{[^}]+\}/;
code = code.replace(formContainerRegex, 
`.login-form-container {
  width: 100%;
  max-width: 350px;
  background: #fff;
  padding: 32px 32px;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
  animation: slideUpFade 1s cubic-bezier(0.23, 1, 0.32, 1) 0.2s both;
  position: relative;
  z-index: 10;
}`
);

fs.writeFileSync(file, code);
console.log("styles.css patched for bold SVG and smaller box.");
