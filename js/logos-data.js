// Logo concepts for Johnny's Pool Services. Each returns SVG markup.
// theme: 'light' = artwork for light backgrounds, 'dark' = for dark backgrounds.

export const C = {
  abyss: '#04303f',
  mosaic: '#16a9c2',
  mosaicDeep: '#0b7f98',
  glint: '#bff4f7',
  coping: '#e9ecea',
  balau: '#a4623b',
  ink: '#062530',
  white: '#f7fcfc',
};

const FONT = "'Bricolage Grotesque', 'Segoe UI', sans-serif";
export const FONT_IMPORT = "@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&amp;display=swap');";

let uid = 0;
const id = (p) => `${p}${++uid}`;

const WAVE = 'M0 66 C10 60 20 60 30 66 S50 72 60 66 S80 60 90 66 S110 72 120 66';

// 1. Refraction: the J is half in the water and bends at the waterline.
function refractionMark(theme) {
  const c = id('c'), a = id('a'), b = id('b');
  const J = 'M71 25 V67 A15.5 15.5 0 0 1 40 67';
  return `
  <defs>
    <clipPath id="${c}"><circle cx="60" cy="60" r="56"/></clipPath>
    <clipPath id="${a}"><path d="${WAVE} V0 H0 Z"/></clipPath>
    <clipPath id="${b}"><path d="${WAVE} V120 H0 Z"/></clipPath>
  </defs>
  <circle cx="60" cy="60" r="56" fill="${C.abyss}"/>
  <g clip-path="url(#${c})">
    <path d="${WAVE} V120 H0 Z" fill="${C.mosaic}"/>
    <path d="${WAVE}" fill="none" stroke="${C.glint}" stroke-width="2.4" opacity=".9"/>
    <path d="${J}" clip-path="url(#${a})" fill="none" stroke="${C.white}" stroke-width="13" stroke-linecap="round"/>
    <g clip-path="url(#${b})"><path d="${J}" transform="translate(5 2)" fill="none" stroke="${C.abyss}" stroke-width="13" stroke-linecap="round"/></g>
  </g>
  ${theme === 'dark' ? `<circle cx="60" cy="60" r="56.5" fill="none" stroke="${C.glint}" stroke-opacity=".35" stroke-width="1.5"/>` : ''}`;
}

// 2. Mosaic: a J laid in pool tiles.
function mosaicMark() {
  const J = ['.XXXX', '...X.', '...X.', 'X..X.', '.XX..'];
  const tones = [C.mosaic, C.mosaicDeep, '#0a6d86', '#1394ad', C.mosaicDeep, '#0c5f75'];
  const s = 21.2, g = 2.4, o = 3.4;
  let seed = 11, out = `<rect width="120" height="120" rx="20" fill="${C.abyss}"/>`;
  for (let r = 0; r < 5; r++) for (let q = 0; q < 5; q++) {
    seed = (seed * 16807) % 2147483647;
    const on = J[r][q] === 'X';
    const fill = on ? C.white : tones[seed % tones.length];
    out += `<rect x="${(o + q * (s + g)).toFixed(1)}" y="${(o + r * (s + g)).toFixed(1)}" width="${s}" height="${s}" rx="3.2" fill="${fill}"/>`;
  }
  return out;
}

// 3. Pool plan: a plunge pool from above, set in a timber deck.
function planMark() {
  const d = id('d'), w = id('w');
  let planks = '';
  for (let y = 12; y < 120; y += 10.5) planks += `<line x1="0" y1="${y}" x2="120" y2="${y}" stroke="#000" stroke-opacity=".2" stroke-width="1.2"/>`;
  return `
  <defs>
    <clipPath id="${d}"><rect width="120" height="120" rx="24"/></clipPath>
    <linearGradient id="${w}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5fd0df"/><stop offset="1" stop-color="${C.mosaicDeep}"/></linearGradient>
  </defs>
  <g clip-path="url(#${d})">
    <rect width="120" height="120" fill="${C.balau}"/>${planks}
  </g>
  <rect x="19" y="27" width="82" height="66" rx="7" fill="${C.coping}"/>
  <rect x="26" y="34" width="68" height="52" rx="3" fill="url(#${w})"/>
  <path d="M33 50 q6 -5 12 0 t12 0 M49 64 q6 -5 12 0 t12 0 M36 76 q5 -4 10 0 t10 0 M66 45 q5 -4 10 0 t10 0" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="2" stroke-linecap="round"/>
  <path d="M79 22 v22 M87 22 v22 M79 29 h8 M79 37 h8" fill="none" stroke="#dfe6e9" stroke-width="3" stroke-linecap="round"/>`;
}

// 4. Bay badge: sun over the mountains and False Bay water, ringed with the name.
function badgeMark(theme) {
  const top = id('t'), bot = id('bt'), inner = id('i');
  const ring = theme === 'dark' ? C.glint : C.white;
  return `
  <defs>
    <path id="${top}" d="M15 60 A45 45 0 0 1 105 60"/>
    <path id="${bot}" d="M9 60 A51 51 0 0 0 111 60"/>
    <clipPath id="${inner}"><circle cx="60" cy="60" r="38"/></clipPath>
  </defs>
  <circle cx="60" cy="60" r="58" fill="${C.abyss}"/>
  <circle cx="60" cy="60" r="38" fill="${C.mosaicDeep}"/>
  <g clip-path="url(#${inner})">
    <rect x="0" y="0" width="120" height="66" fill="#0f93ad"/>
    <circle cx="60" cy="54" r="13" fill="${C.glint}"/>
    <path d="M20 68 L36 55 L44 60 L58 46 L70 57 L78 52 L100 68 Z" fill="${C.abyss}"/>
    <rect x="0" y="67" width="120" height="60" fill="${C.mosaic}"/>
    <path d="M22 76 q6 -4 12 0 t12 0 t12 0 t12 0 t12 0 t12 0 M28 86 q6 -4 12 0 t12 0 t12 0 t12 0 t12 0" fill="none" stroke="${C.white}" stroke-width="2.2" stroke-linecap="round" opacity=".85"/>
  </g>
  <circle cx="60" cy="60" r="38" fill="none" stroke="${ring}" stroke-width="1.6"/>
  <text font-family="${FONT}" font-weight="700" font-size="10" letter-spacing="1.6" fill="${ring}">
    <textPath href="#${top}" startOffset="50%" text-anchor="middle">JOHNNY'S POOL SERVICES</textPath>
  </text>
  <text font-family="${FONT}" font-weight="600" font-size="9" letter-spacing="2.2" fill="${ring}" opacity=".85">
    <textPath href="#${bot}" startOffset="50%" text-anchor="middle">GORDON'S BAY</textPath>
  </text>
  <circle cx="11.5" cy="60" r="2" fill="${C.mosaic}"/><circle cx="108.5" cy="60" r="2" fill="${C.mosaic}"/>`;
}

// 5. Droplet: a single drop, echoed as the apostrophe in the wordmark.
function dropletMark() {
  const g = id('g');
  return `
  <defs><linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4cc4d6"/><stop offset="1" stop-color="${C.mosaicDeep}"/></linearGradient></defs>
  <path d="M60 8 C60 8 22 52 22 78 A38 38 0 0 0 98 78 C98 52 60 8 60 8 Z" fill="url(#${g})"/>
  <path d="M40 78 A20 20 0 0 0 56 97" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="5" stroke-linecap="round"/>
  <path d="M66 40 V76 A11 11 0 0 1 46 80" fill="none" stroke="${C.abyss}" stroke-width="9" stroke-linecap="round"/>`;
}

const DROP_SMALL = (x, y, s, fill) => `<path transform="translate(${x} ${y}) scale(${s})" d="M10 0 C10 0 0 12 0 19 A10 10 0 0 0 20 19 C20 12 10 0 10 0 Z" fill="${fill}"/>`;

// Standard lockup: mark on the left, name and descriptor on the right.
function lockup(markSvg, theme, opts = {}) {
  const name = theme === 'dark' ? C.white : C.ink;
  const sub = theme === 'dark' ? C.glint : C.mosaicDeep;
  return `
  <g>${markSvg}</g>
  <text x="142" y="66" font-family="${FONT}" font-weight="760" font-size="50" letter-spacing="-1" fill="${name}" textLength="${opts.nameLen || 222}" lengthAdjust="spacingAndGlyphs">Johnny's</text>
  <text x="144" y="99" font-family="${FONT}" font-weight="500" font-size="22" fill="${sub}" textLength="${opts.subLen || 152}" lengthAdjust="spacingAndGlyphs">Pool Services</text>`;
}

function dropletWordmark(theme) {
  const name = theme === 'dark' ? C.white : C.ink;
  const sub = theme === 'dark' ? C.glint : C.mosaicDeep;
  return `
  <text x="0" y="68" font-family="${FONT}" font-weight="800" font-size="72" letter-spacing="-2.5" fill="${name}" textLength="238" lengthAdjust="spacingAndGlyphs">johnny</text>
  ${DROP_SMALL(241, 14, 1.0, C.mosaic)}
  <text x="264" y="68" font-family="${FONT}" font-weight="800" font-size="72" fill="${name}" textLength="36" lengthAdjust="spacingAndGlyphs">s</text>
  <text x="3" y="104" font-family="${FONT}" font-weight="500" font-size="24" fill="${sub}" textLength="304" lengthAdjust="spacingAndGlyphs">pool services, gordon's bay</text>`;
}

export const LOGOS = [
  {
    id: 'refraction',
    name: 'Refraction',
    idea: 'The J stands half in the water and shifts at the waterline, the way a pole bends when you look into a pool. It works from a van door down to a favicon.',
    mark: refractionMark,
    lockup: (t) => lockup(refractionMark(t), t),
    lockupBox: '0 0 380 120',
  },
  {
    id: 'mosaic',
    name: 'Mosaic',
    idea: 'A J laid in glass pool tiles. It feels crafted and hands-on, and suits stickers, uniforms and invoices.',
    mark: mosaicMark,
    lockup: (t) => lockup(mosaicMark(t), t),
    lockupBox: '0 0 380 120',
  },
  {
    id: 'plan',
    name: 'Pool Plan',
    idea: 'A plunge pool seen from above, set in a balau deck with a ladder. It says "in and around the pool" in one picture.',
    mark: planMark,
    lockup: (t) => lockup(planMark(t), t),
    lockupBox: '0 0 380 120',
  },
  {
    id: 'badge',
    name: 'Bay Badge',
    idea: 'A round local badge: sun over the mountains and the bay, ringed with the name and town. It suits shirts, caps and the Facebook profile picture.',
    mark: badgeMark,
    lockup: (t) => lockup(badgeMark(t), t),
    lockupBox: '0 0 380 120',
  },
  {
    id: 'droplet',
    name: 'Droplet',
    idea: 'A friendly lowercase wordmark where the apostrophe is a water drop. The drop mark carries a J and works on its own as an app-style icon.',
    mark: dropletMark,
    lockup: (t) => dropletWordmark(t),
    lockupBox: '0 0 304 112',
  },
];

export function svgDoc(inner, viewBox, { standalone = false, title = '' } = {}) {
  const style = standalone ? `<style>${FONT_IMPORT}</style>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" role="img" aria-label="${title}">${style}${inner}</svg>`;
}
