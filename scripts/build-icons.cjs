// Build script to generate a custom Lucide icons subset
const fs = require('fs');
const path = require('path');

const allIcons = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'node_modules', 'lucide-static', 'icon-nodes.json'), 'utf8')
);

const needed = [
  'alert-circle','alert-triangle','arrow-right','banknote','calendar','calendar-days',
  'camera','check','check-check','check-circle','chevron-down','chevron-left',
  'chevron-right','circle','clock','eye','facebook','folder-plus','image','instagram',
  'loader-2','lock','log-out','mail','map-pin','menu','minus','pencil','phone','play',
  'plus','refresh-cw','save','send','trash-2','upload','user','user-plus','x','x-circle',
  'scissors','palette','sparkles','heart','star','wind','layout-dashboard','users','settings'
];

// Some icons were renamed in newer Lucide versions - map old names to new
const aliases = {
  'alert-circle': 'circle-alert',
  'alert-triangle': 'triangle-alert', 
  'check-circle': 'circle-check-big',
  'loader-2': 'loader-circle',
  'x-circle': 'circle-x',
};

const subset = {};
const missing = [];
for (const name of needed) {
  if (allIcons[name]) {
    subset[name] = allIcons[name];
  } else if (aliases[name] && allIcons[aliases[name]]) {
    subset[name] = allIcons[aliases[name]]; // Map under old name for compatibility
  } else {
    missing.push(name);
  }
}

console.log('Found:', Object.keys(subset).length, '/', needed.length, 'icons');
if (missing.length) console.log('Missing:', missing.join(', '));

const js = [
  '// Lucide Icons - Custom subset for Studio Natali',
  '// Auto-generated with ' + Object.keys(subset).length + ' icons. Run: node scripts/build-icons.js',
  '(function(){',
  '"use strict";',
  'var icons=' + JSON.stringify(subset) + ';',
  'var da={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":2,"stroke-linecap":"round","stroke-linejoin":"round"};',
  'function ce(t,a){var e=document.createElementNS("http://www.w3.org/2000/svg",t);for(var k in a)if(a.hasOwnProperty(k))e.setAttribute(k,a[k]);return e}',
  'function createIcons(o){var r=(o&&o.root)||document;var els=r.querySelectorAll("[data-lucide]");for(var i=0;i<els.length;i++){var el=els[i];var n=el.getAttribute("data-lucide");if(!n||!icons[n])continue;if(el.tagName.toLowerCase()==="svg")continue;var s=ce("svg",da);if(el.className)s.setAttribute("class",typeof el.className==="string"?el.className:el.getAttribute("class")||"");var nd=icons[n];for(var j=0;j<nd.length;j++)s.appendChild(ce(nd[j][0],nd[j][1]));el.parentNode.replaceChild(s,el)}}',
  'window.lucide={createIcons:createIcons,icons:icons};',
  '})();',
].join('\n');

const outPath = path.join(__dirname, '..', 'public', 'lucide-icons.js');
fs.writeFileSync(outPath, js);
console.log('Written', outPath, '(' + (js.length / 1024).toFixed(1) + ' KB)');
