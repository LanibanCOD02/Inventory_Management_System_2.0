const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'styles.css');
let code = fs.readFileSync(file, 'utf8');

// The background SVG String
const svgContent = `
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
  <g fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    
    <!-- Cross 1 -->
    <g transform="translate(40, 40) scale(1.5)">
      <path d="M12 2v20M2 12h20"/>
    </g>

    <!-- Stethoscope -->
    <g transform="translate(180, 50) scale(1.5)">
      <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/>
      <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/>
      <circle cx="20" cy="10" r="2"/>
    </g>

    <!-- DNA Strand -->
    <g transform="translate(320, 120) scale(1.8) rotate(45)">
      <path d="M2 15c6.667-6 13.333 0 20-6"/>
      <path d="M9 22c1.798-1.998 2.518-3.995 2.807-5.993"/>
      <path d="M15 2c-1.798 1.998-2.518 3.995-2.807 5.993"/>
      <path d="m17 6-2.5-2.5"/><path d="m14 8-1-1"/>
      <path d="m7 18 2.5 2.5"/><path d="m3.5 14.5.5.5"/>
      <path d="m20 9 .5.5"/><path d="m6.5 9.5 1 1"/>
      <path d="m16.5 14.5 1 1"/><path d="m21 15-2-2"/>
      <path d="m3 9 2-2"/>
    </g>

    <!-- ECG Heartbeat -->
    <g transform="translate(60, 200) scale(2)">
      <path d="M2 12h4l3-9 5 18 3-9h5"/>
    </g>

    <!-- Caduceus/Pill/Syringe (We'll use Syringe and Pill from Lucide) -->
    <!-- Pill -->
    <g transform="translate(220, 250) scale(1.5)">
      <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/>
      <path d="m8.5 8.5 7 7"/>
    </g>
    
    <!-- Syringe -->
    <g transform="translate(80, 320) scale(1.5)">
      <path d="m18 2 4 4"/><path d="m17 7 3-3"/><path d="M19 9 8.7 19.3c-1 1-2.5 1-3.4 0l-.6-.6c-1-1-1-2.5 0-3.4L15 5"/><path d="m9 11 4 4"/><path d="m5 19-3 3"/><path d="m14 4 6 6"/>
    </g>

    <!-- Cross 2 -->
    <g transform="translate(320, 320) scale(1.2)">
      <path d="M12 2v20M2 12h20"/>
    </g>

    <!-- Extra scattered dots -->
    <circle cx="150" cy="150" r="1.5" />
    <circle cx="350" cy="60" r="1.5" />
    <circle cx="40" cy="150" r="1.5" />
    <circle cx="280" cy="190" r="1.5" />
    <circle cx="150" cy="350" r="1.5" />

  </g>
</svg>
`.replace(/\n/g, '').replace(/"/g, "'");

const regex = /background-image: url\('.*?'\);/g;
code = code.replace(regex, `background-image: url("data:image/svg+xml;utf8,${svgContent}");`);

// Let's also update the animation to pan 400px instead of 160px
code = code.replace(/background-size: 160px 160px;/g, `background-size: 400px 400px;`);
code = code.replace(/to { transform: translate\(160px, 160px\); }/g, `to { transform: translate(400px, 400px); }`);

fs.writeFileSync(file, code);
console.log("CSS SVG patched.");
