// Hero: a top-down, interactive swimming pool rendered in a single shader.
// A GPU height-field simulation drives the ripples; the render pass refracts
// the view through that surface onto a mosaic floor lit by caustics.
import * as THREE from 'three';
import { COMMON } from './glsl.js?v=18';

const VERT = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const DROP = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uCenter;
uniform float uRadius, uStrength, uAspect;
void main(){
  vec4 info = texture2D(uTex, vUv);
  vec2 d = vUv - uCenter; d.x *= uAspect;
  float drop = max(0.0, 1.0 - length(d) / uRadius);
  drop = 0.5 - cos(drop * 3.14159265) * 0.5;
  info.r += drop * uStrength;
  gl_FragColor = info;
}
`;

const UPDATE = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uDelta;
void main(){
  vec4 info = texture2D(uTex, vUv);
  vec2 dx = vec2(uDelta.x, 0.0), dy = vec2(0.0, uDelta.y);
  float avg = (texture2D(uTex, vUv - dx).r + texture2D(uTex, vUv + dx).r +
               texture2D(uTex, vUv - dy).r + texture2D(uTex, vUv + dy).r) * 0.25;
  info.g += (avg - info.r) * 2.0;
  info.g *= 0.993;
  info.r += info.g;
  info.r *= 0.998;
  gl_FragColor = info;
}
`;

const NORMALS = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uDelta;
void main(){
  vec4 info = texture2D(uTex, vUv);
  float s = 6.5;
  vec3 dx = vec3(uDelta.x, (texture2D(uTex, vec2(vUv.x + uDelta.x, vUv.y)).r - info.r) * s, 0.0);
  vec3 dy = vec3(0.0, (texture2D(uTex, vec2(vUv.x, vUv.y + uDelta.y)).r - info.r) * s, uDelta.y);
  info.ba = normalize(cross(dy, dx)).xz;
  gl_FragColor = info;
}
`;

const RENDER = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D uWater;
uniform float uTime, uAspect, uFade;
${COMMON}

float wind(vec2 p, float t){
  return vnoise(p * 0.9 + vec2(t * 0.16, t * 0.1)) * 0.7 +
         vnoise(p * 2.1 - vec2(t * 0.22, -t * 0.09)) * 0.3;
}

void main(){
  vec2 uv = vUv;
  vec4 info = texture2D(uWater, uv);
  vec3 n = vec3(info.b, sqrt(max(0.0, 1.0 - dot(info.ba, info.ba))), info.a);

  vec3 p = vec3((uv.x - 0.5) * uAspect, 0.0, (0.5 - uv.y)) * 3.4;

  // fine wind chop on top of the simulated ripples
  vec2 wp = p.xz * 2.4;
  float e = 0.015;
  float h0 = wind(wp, uTime);
  vec2 g = vec2(wind(wp + vec2(e, 0.0), uTime) - h0, wind(wp + vec2(0.0, e), uTime) - h0) / e;
  n = normalize(n + vec3(-g.x, 0.0, -g.y) * 0.0075);
  p.y = info.r * 0.12;

  vec3 eye = vec3(0.35, 7.0, 1.1);
  vec3 I = normalize(p - eye);
  vec3 T = refract(I, n, 1.0 / 1.333);

  float depth = mix(1.05, 1.9, smoothstep(-3.0, 3.0, p.x + p.z * 0.4));
  float t = (-depth - p.y) / T.y;
  vec3 fp = p + T * t;

  vec3 tile = poolTiles(fp.xz);
  // ripples bend the light on its way down, so they shift the caustic pattern
  vec3 caus = causticsRGB(fp.xz * 4.2 - n.xz * 0.9, uTime * 0.45);
  float focus = 1.0 + clamp(-info.r * 6.0, -0.5, 0.8);
  vec3 col = tile * (0.34 + caus * 2.6 * focus);

  float L = t;
  col *= exp(-L * vec3(0.46, 0.105, 0.075));
  col = mix(col, vec3(0.015, 0.25, 0.34), 1.0 - exp(-L * 0.2));

  vec3 R = reflect(I, n);
  vec3 sky = mix(vec3(0.62, 0.74, 0.82), vec3(0.24, 0.46, 0.72), clamp(R.y, 0.0, 1.0));
  float fres = 0.02 + 0.98 * pow(1.0 - max(dot(-I, n), 0.0), 5.0);
  col = mix(col, sky, fres);

  vec3 sun = normalize(vec3(-0.22, 1.0, 0.18));
  float s = max(dot(R, sun), 0.0);
  col += vec3(1.0, 0.95, 0.86) * (pow(s, 2200.0) * 40.0 + pow(s, 260.0) * 0.45);

  // soft falloff towards the edges keeps the headline area calm
  float vig = smoothstep(1.25, 0.25, length((uv - vec2(0.5, 0.55)) * vec2(uAspect * 0.8, 1.0)));
  col *= mix(0.55, 1.0, vig);

  col = acesTonemap(col * 1.15);
  col = pow(col, vec3(1.0 / 2.2));
  col += (hash12(gl_FragCoord.xy + fract(uTime)) - 0.5) / 255.0;
  gl_FragColor = vec4(col * uFade, 1.0);
}
`;

export function initHeroWater(canvas, { reducedMotion = false } = {}) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  } catch (e) {
    canvas.classList.add('no-webgl');
    return null;
  }
  const maxDpr = Math.min(window.devicePixelRatio, 1.5);
  let dpr = maxDpr;
  renderer.setPixelRatio(dpr);
  renderer.autoClear = false;

  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const scene = new THREE.Scene();
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
  quad.frustumCulled = false;
  scene.add(quad);

  const mk = (frag, uniforms) => new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false });
  const dropMat = mk(DROP, { uTex: { value: null }, uCenter: { value: new THREE.Vector2() }, uRadius: { value: 0.03 }, uStrength: { value: 0.01 }, uAspect: { value: 1 } });
  const updateMat = mk(UPDATE, { uTex: { value: null }, uDelta: { value: new THREE.Vector2() } });
  const normalMat = mk(NORMALS, { uTex: { value: null }, uDelta: { value: new THREE.Vector2() } });
  const renderMat = mk(RENDER, { uWater: { value: null }, uTime: { value: 0 }, uAspect: { value: 1 }, uFade: { value: 0 } });

  let rtA, rtB, aspect = 1;
  const rtOpts = {
    type: THREE.HalfFloatType, format: THREE.RGBAFormat,
    minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
    wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping, depthBuffer: false,
  };

  function pass(mat, target) {
    mat.uniforms.uTex && (mat.uniforms.uTex.value = rtA.texture);
    quad.material = mat;
    renderer.setRenderTarget(target);
    renderer.render(scene, cam);
    const t = rtA; rtA = rtB; rtB = t;
  }

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    aspect = w / h;
    const simH = 256, simW = Math.round(simH * aspect);
    rtA?.dispose(); rtB?.dispose();
    rtA = new THREE.WebGLRenderTarget(simW, simH, rtOpts);
    rtB = new THREE.WebGLRenderTarget(simW, simH, rtOpts);
    for (const rt of [rtA, rtB]) { renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 0); renderer.clear(); }
    updateMat.uniforms.uDelta.value.set(1 / simW, 1 / simH);
    normalMat.uniforms.uDelta.value.set(1 / simW, 1 / simH);
    dropMat.uniforms.uAspect.value = aspect;
    renderMat.uniforms.uAspect.value = aspect;
  }

  function drop(x, y, radius, strength) {
    dropMat.uniforms.uCenter.value.set(x, y);
    dropMat.uniforms.uRadius.value = radius;
    dropMat.uniforms.uStrength.value = strength;
    pass(dropMat, rtB);
  }

  // pointer: a trail of small drops, a bigger splash on press
  let last = null;
  function toUv(e) {
    const r = canvas.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height];
  }
  const pending = [];
  const target = canvas.parentElement;
  target.addEventListener('pointermove', (e) => {
    const [x, y] = toUv(e);
    if (last) {
      const dx = (x - last[0]) * aspect, dy = y - last[1];
      const dist = Math.hypot(dx, dy);
      const steps = Math.min(8, Math.ceil(dist / 0.012));
      for (let i = 1; i <= steps; i++) {
        pending.push([last[0] + (x - last[0]) * i / steps, last[1] + (y - last[1]) * i / steps, 0.022, 0.007]);
      }
    }
    last = [x, y];
  }, { passive: true });
  target.addEventListener('pointerleave', () => { last = null; });
  target.addEventListener('pointerdown', (e) => {
    const [x, y] = toUv(e);
    pending.push([x, y, 0.045, 0.028]);
  });

  resize();
  window.addEventListener('resize', resize);

  // a few opening drops so the surface is alive before anyone touches it
  for (let i = 0; i < 6; i++) pending.push([Math.random(), Math.random(), 0.03, (Math.random() > 0.5 ? 1 : -1) * 0.02]);

  let visible = true, time = 0, prev = performance.now(), fade = 0, nextAmbient = 0, slowAvg = 1 / 60, frames = 0;
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(canvas);

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - prev) / 1000, 0.05); prev = now;
    if (!visible) return;
    if (!reducedMotion) time += dt;
    fade = Math.min(1, fade + dt * 0.9);

    if (!reducedMotion && now > nextAmbient) {
      pending.push([Math.random(), Math.random(), 0.018 + Math.random() * 0.02, (Math.random() - 0.5) * 0.02]);
      nextAmbient = now + 500 + Math.random() * 1400;
    }
    while (pending.length) drop(...pending.shift());
    const steps = reducedMotion ? 1 : 2;
    for (let i = 0; i < steps; i++) pass(updateMat, rtB);
    pass(normalMat, rtB);

    renderMat.uniforms.uWater.value = rtA.texture;
    renderMat.uniforms.uTime.value = time;
    renderMat.uniforms.uFade.value = fade * fade * (3 - 2 * fade);
    quad.material = renderMat;
    renderer.setRenderTarget(null);
    renderer.render(scene, cam);

    // lower the render resolution on slow GPUs; the simulation size is unaffected
    slowAvg = slowAvg * 0.95 + dt * 0.05;
    if (++frames % 90 === 0 && slowAvg > 1 / 40 && dpr > 0.6) {
      dpr = Math.max(0.6, dpr - 0.2);
      renderer.setPixelRatio(dpr);
      renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    }
  }
  requestAnimationFrame(frame);
  return { drop };
}
