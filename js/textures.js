// Procedural canvas textures, so the scene needs no image downloads.
import * as THREE from 'three';

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

function rand(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function toTexture(c, { repeat = [1, 1], srgb = true, aniso = 8 } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...repeat);
  t.anisotropy = aniso;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Balau hardwood decking: long grain running along U.
export function woodTextures() {
  const [c, g] = canvas(2048, 128);
  const [b, bg] = canvas(2048, 128);
  const r = rand(7);
  g.fillStyle = '#7a4a2e'; g.fillRect(0, 0, 2048, 128);
  bg.fillStyle = '#808080'; bg.fillRect(0, 0, 2048, 128);
  for (let i = 0; i < 520; i++) {
    const y = r() * 128, amp = 1 + r() * 5, freq = 0.002 + r() * 0.01, ph = r() * 6.28;
    const light = r() > 0.5;
    g.strokeStyle = light ? `rgba(196,128,86,${0.05 + r() * 0.12})` : `rgba(58,30,16,${0.06 + r() * 0.16})`;
    bg.strokeStyle = light ? `rgba(160,160,160,${0.2})` : `rgba(90,90,90,${0.25})`;
    g.lineWidth = bg.lineWidth = 0.4 + r() * 1.6;
    g.beginPath(); bg.beginPath();
    for (let x = 0; x <= 2048; x += 16) {
      const yy = y + Math.sin(x * freq + ph) * amp;
      x ? (g.lineTo(x, yy), bg.lineTo(x, yy)) : (g.moveTo(x, yy), bg.moveTo(x, yy));
    }
    g.stroke(); bg.stroke();
  }
  // a few knots and weathering patches
  for (let i = 0; i < 3; i++) {
    const x = r() * 2048, y = 20 + r() * 88, rad = 3 + r() * 5;
    const grd = g.createRadialGradient(x, y, 0, x, y, rad * 3);
    grd.addColorStop(0, 'rgba(50,24,12,0.35)'); grd.addColorStop(1, 'rgba(50,24,12,0)');
    g.fillStyle = grd; g.beginPath(); g.ellipse(x, y, rad * 3, rad, 0, 0, 6.28); g.fill();
  }
  const img = g.getImageData(0, 0, 2048, 128);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (r() - 0.5) * 14;
    img.data[i] += n; img.data[i + 1] += n * 0.8; img.data[i + 2] += n * 0.6;
  }
  g.putImageData(img, 0, 0);
  return { map: toTexture(c), bump: toTexture(b, { srgb: false }) };
}

// Sandstone coping / pavers.
export function stoneTexture(tint = [214, 206, 190], seed = 3) {
  const [c, g] = canvas(512, 512);
  const r = rand(seed);
  const img = g.createImageData(512, 512);
  for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
    const i = (y * 512 + x) * 4;
    const n = (r() - 0.5) * 22 + Math.sin(x * 0.05 + Math.sin(y * 0.03) * 2) * 5;
    img.data[i] = tint[0] + n; img.data[i + 1] = tint[1] + n; img.data[i + 2] = tint[2] + n * 0.9; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  for (let i = 0; i < 90; i++) {
    g.fillStyle = `rgba(${r() > 0.5 ? '120,105,85' : '240,235,225'},${0.05 + r() * 0.1})`;
    g.beginPath(); g.arc(r() * 512, r() * 512, 1 + r() * 10, 0, 6.28); g.fill();
  }
  return toTexture(c);
}

// Painted plaster wall.
export function plasterTexture() {
  const [c, g] = canvas(512, 512);
  const r = rand(11);
  const img = g.createImageData(512, 512);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (r() - 0.5) * 10;
    img.data[i] = 196 + n; img.data[i + 1] = 192 + n; img.data[i + 2] = 184 + n; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  for (let i = 0; i < 400; i++) {
    g.fillStyle = `rgba(${r() > 0.5 ? '255,255,255' : '150,150,140'},0.05)`;
    g.beginPath(); g.ellipse(r() * 512, r() * 512, 3 + r() * 20, 2 + r() * 8, r() * 3, 0, 6.28); g.fill();
  }
  return toTexture(c, { repeat: [4, 1.2] });
}

// Solar pool-heating mat: fine black risers between headers.
export function solarTexture() {
  const [c, g] = canvas(512, 1024);
  g.fillStyle = '#0c0d0f'; g.fillRect(0, 0, 512, 1024);
  for (let x = 0; x < 512; x += 8) {
    const grd = g.createLinearGradient(x, 0, x + 8, 0);
    grd.addColorStop(0, '#060708'); grd.addColorStop(0.45, '#2c3136'); grd.addColorStop(1, '#060708');
    g.fillStyle = grd; g.fillRect(x, 40, 8, 944);
  }
  g.fillStyle = '#1b1e22'; g.fillRect(0, 0, 512, 44); g.fillRect(0, 980, 512, 44);
  return toTexture(c);
}

// Corrugated roof sheeting.
export function roofTexture() {
  const [c, g] = canvas(256, 256);
  for (let x = 0; x < 256; x++) {
    const v = 120 + Math.sin(x / 256 * Math.PI * 2 * 8) * 30;
    g.fillStyle = `rgb(${v * 0.62},${v * 0.66},${v * 0.7})`; g.fillRect(x, 0, 1, 256);
  }
  return toTexture(c, { repeat: [8, 2] });
}

export function grassTexture() {
  const [c, g] = canvas(512, 512);
  const r = rand(5);
  g.fillStyle = '#56663a'; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 26000; i++) {
    const s = r();
    g.fillStyle = s > 0.6 ? 'rgba(128,140,78,0.4)' : s > 0.3 ? 'rgba(40,58,26,0.4)' : 'rgba(160,156,104,0.3)';
    g.fillRect(r() * 512, r() * 512, 1, 2 + r() * 4);
  }
  return toTexture(c, { repeat: [40, 40] });
}

// Tileable water normal map from a sum of integer-frequency waves.
export function waterNormalTexture(size = 512) {
  const [c, g] = canvas(size, size);
  const r = rand(21);
  const waves = [];
  for (let i = 0; i < 26; i++) {
    const kx = Math.round((r() - 0.5) * 22), ky = Math.round((r() - 0.5) * 22);
    if (!kx && !ky) continue;
    const k = Math.hypot(kx, ky);
    waves.push([kx, ky, 1 / Math.pow(k, 1.25), r() * 6.283]);
  }
  const h = new Float32Array(size * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let s = 0;
    for (const [kx, ky, a, p] of waves) s += a * Math.sin(((kx * x + ky * y) / size) * 6.2832 + p);
    h[y * size + x] = s;
  }
  const img = g.createImageData(size, size);
  const k = 5.0;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const hl = h[y * size + ((x - 1 + size) % size)], hr = h[y * size + ((x + 1) % size)];
    const hd = h[((y - 1 + size) % size) * size + x], hu = h[((y + 1) % size) * size + x];
    let nx = (hl - hr) * k, ny = (hd - hu) * k, nz = 1;
    const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
    const i = (y * size + x) * 4;
    img.data[i] = (nx * 0.5 + 0.5) * 255; img.data[i + 1] = (ny * 0.5 + 0.5) * 255; img.data[i + 2] = (nz * 0.5 + 0.5) * 255; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return toTexture(c, { srgb: false, repeat: [2, 1.2] });
}
