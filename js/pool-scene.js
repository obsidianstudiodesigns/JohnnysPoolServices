// The services showcase: a plunge-pool setup the camera tours as you scroll.
// Background, ground and lighting come from a real South African garden panorama
// (Poly Haven "Pretoria Gardens", CC0); deck, coping and walls use CC0 photo textures.
import * as THREE from 'three';
import { GroundedSkybox } from 'three/addons/objects/GroundedSkybox.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { COMMON } from './glsl.js?v=20';
import * as TX from './textures.js?v=20';

const ASSETS = 'assets/3d/';
const POOL = { x: 2, z: 1.2, depth: 1.4, water: -0.1 };
const LED_POS = new THREE.Vector3(0, -0.62, -1.19);
const GROUND_Y = -0.15;

// The sun's position in the panorama (u 0.60, v 0.21), so shadows match the photo.
const SUN_DIR = (() => {
  const el = THREE.MathUtils.degToRad(52), az = (0.6005 - 0.5) * Math.PI * 2;
  return new THREE.Vector3(Math.cos(az) * Math.cos(el), Math.sin(el), Math.sin(az) * Math.cos(el)).normalize();
})();

// Camera shots, one per service. pos / look-at target.
export const SHOTS = {
  overview: { pos: [7.4, 2.3, 8.0], target: [-0.6, 0.7, -1.6] },
  care:     { pos: [1.7, 2.3, 2.7], target: [-0.1, -0.9, -0.3] },
  pumps:    { pos: [5.9, 1.55, 0.2], target: [3.75, 0.45, -2.8] },
  heating:  { pos: [0.9, 4.6, 2.6], target: [-2.9, 3.0, -5.4] },
  lighting: { pos: [-1.3, 1.25, 2.9], target: [0.1, -0.7, -1.1], dusk: true },
  decking:  { pos: [-5.6, 1.6, 4.0], target: [-3.0, 0, 0.3] },
  repairs:  { pos: [-3.0, 3.4, 3.1], target: [0.4, -1.1, -0.1] },
};

const POOL_VERT = /* glsl */ `
varying vec3 vWorld;
varying vec3 vNormalW;
void main(){
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

const POOL_FRAG = /* glsl */ `
varying vec3 vWorld;
varying vec3 vNormalW;
uniform float uTime, uSun, uLed;
uniform vec3 uSunDir, uLedPos;
uniform vec2 uHalf;
uniform float uWater;
${COMMON}
void main(){
  vec3 N = normalize(vNormalW);
  bool floorFace = N.y > 0.5;
  vec2 tc = floorFace ? vWorld.xz : (abs(N.x) > 0.5 ? vWorld.zy : vWorld.xy);
  float below = max(0.0, uWater - vWorld.y);
  // seen through moving water, the tiles wobble
  vec2 wob = vec2(vnoise(vWorld.xz * 2.3 + vec2(uTime * 0.35, uTime * 0.2)), vnoise(vWorld.zx * 2.1 - vec2(uTime * 0.28, -uTime * 0.31))) - 0.5;
  tc += wob * 0.045 * smoothstep(0.0, 0.4, below);
  vec3 tile = poolTiles(tc);

  // darker feature band at the waterline, like a real pool
  if (!floorFace && vWorld.y > uWater - 0.14) tile *= vec3(0.35, 0.55, 0.75);

  // is this point lit through the water opening, or shaded by the pool wall?
  vec3 Ld = refract(-uSunDir, vec3(0.0, 1.0, 0.0), 1.0 / 1.333);
  float t = (uWater - vWorld.y) / -Ld.y;
  vec2 hit = vWorld.xz - Ld.xz * t;
  vec2 outside = abs(hit) - uHalf;
  float lit = 1.0 - smoothstep(-0.06, 0.06, max(outside.x, outside.y));
  lit *= smoothstep(-0.05, 0.1, dot(N, -Ld));

  vec3 caus = causticsMono(hit * 1.6 + wob * 0.3, uTime * 0.55) * smoothstep(0.0, 0.25, below);
  vec3 col = tile * (0.2 + uSun * lit * (0.55 + caus * 1.5));

  col *= exp(-below * vec3(0.55, 0.13, 0.09));
  col = mix(col, vec3(0.02, 0.24, 0.32) * (0.15 + uSun * 0.85), 1.0 - exp(-below * 0.35));

  float d = distance(vWorld, uLedPos);
  col += uLed * vec3(0.10, 0.45, 1.0) * (1.6 / (1.0 + d * d * 3.5));

  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

// Box-project UVs in metres so photo textures keep real-world scale on any box.
function worldUV(geo, size) {
  const pos = geo.attributes.position, nor = geo.attributes.normal, uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const nx = Math.abs(nor.getX(i)), ny = Math.abs(nor.getY(i));
    if (ny > 0.5) uv.setXY(i, x / size, z / size);
    else if (nx > 0.5) uv.setXY(i, z / size, y / size);
    else uv.setXY(i, x / size, y / size);
  }
  uv.needsUpdate = true;
  return geo;
}

export function initPoolScene(container, { reducedMotion = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  const maxDpr = Math.min(window.devicePixelRatio, 1.5);
  let dpr = maxDpr;
  renderer.setPixelRatio(dpr);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.9;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);
  // if the GPU drops the context, fall back to the photo behind the canvas
  renderer.domElement.addEventListener('webglcontextlost', () => container.classList.remove('is-ready'));
  renderer.domElement.addEventListener('webglcontextrestored', () => container.classList.add('is-ready'));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 400);

  // ----- loading: reveal the stage once the photographic assets are in -----
  const manager = new THREE.LoadingManager(() => container.classList.add('is-ready'));
  const texLoader = new THREE.TextureLoader(manager);
  const aniso = renderer.capabilities.getMaxAnisotropy();
  const tex = (file, { srgb = false, repeat = 1 } = {}) => {
    const t = texLoader.load(ASSETS + file);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = aniso;
    t.repeat.set(repeat, repeat);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  const pbr = (name, opts = {}) => new THREE.MeshStandardMaterial({
    map: tex(`${name}-color.jpg?v=3`, { srgb: true }),
    normalMap: tex(`${name}-normal.jpg?v=2`),
    roughnessMap: tex(`${name}-rough.jpg`),
    ...opts,
  });

  // ----- real garden: panorama as sky and ground, HDR for the lighting -----
  const pano = texLoader.load(ASSETS + 'garden-panorama.jpg?v=2');
  pano.mapping = THREE.EquirectangularReflectionMapping;
  pano.colorSpace = THREE.SRGBColorSpace;
  const skybox = new GroundedSkybox(pano, 1.8, 80, 96);
  skybox.position.y = 1.8 + GROUND_Y;
  skybox.material.toneMapped = false;
  scene.add(skybox);

  new RGBELoader(manager).load(ASSETS + 'garden-light-1k.hdr', (hdr) => {
    hdr.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = hdr;
  });
  scene.environmentIntensity = 0.75;

  // the panorama ground can't catch shadows, so an invisible plane does it
  const shadowCatcher = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({ opacity: 0.38 }));
  shadowCatcher.rotation.x = -Math.PI / 2;
  shadowCatcher.position.y = GROUND_Y + 0.002;
  shadowCatcher.receiveShadow = true;
  scene.add(shadowCatcher);

  const sunDir = SUN_DIR.clone();
  const sun = new THREE.DirectionalLight(0xfff4e6, 2.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 50 });
  sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.03;
  sun.position.copy(sunDir).multiplyScalar(25);
  scene.add(sun, sun.target);

  // ----- materials -----
  const deckMat = pbr('deck', { color: 0xffffff, roughness: 1 });
  [deckMat.map, deckMat.normalMap, deckMat.roughnessMap].forEach((t) => t.repeat.set(1 / 1.44, 1 / 1.44));
  const copingMat = pbr('coping', { color: new THREE.Color(1.55, 1.5, 1.42) });
  const stucco = pbr('stucco', { color: 0xf2efe8 });
  const steel = new THREE.MeshStandardMaterial({ color: 0xb5bcc2, metalness: 1, roughness: 0.18 });
  const pvc = new THREE.MeshPhysicalMaterial({ color: 0xe9ecee, roughness: 0.35, clearcoat: 0.3 });
  const tankMat = new THREE.MeshPhysicalMaterial({ color: 0x7d858c, roughness: 0.55, clearcoat: 0.2 });
  const blackPlastic = new THREE.MeshPhysicalMaterial({ color: 0x16181a, roughness: 0.4, clearcoat: 0.4 });
  const clearLid = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, transparent: true, opacity: 0.35 });

  const poolUniforms = {
    uTime: { value: 0 }, uSun: { value: 1 }, uLed: { value: 0 },
    uSunDir: { value: sunDir }, uLedPos: { value: LED_POS },
    uHalf: { value: new THREE.Vector2(POOL.x, POOL.z) }, uWater: { value: POOL.water },
  };
  const poolMat = new THREE.ShaderMaterial({ vertexShader: POOL_VERT, fragmentShader: POOL_FRAG, uniforms: poolUniforms });

  const add = (geo, mat, pos = [0, 0, 0], { cast = true, receive = true, rot, parent = scene } = {}) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(...pos);
    if (rot) m.rotation.set(...rot);
    m.castShadow = cast; m.receiveShadow = receive;
    parent.add(m);
    return m;
  };

  // ----- pool shell (open-topped, inward-facing) -----
  const { x: px, z: pz, depth: pd } = POOL;
  add(new THREE.PlaneGeometry(px * 2, pz * 2), poolMat, [0, -pd, 0], { rot: [-Math.PI / 2, 0, 0], cast: false });
  add(new THREE.PlaneGeometry(px * 2, pd), poolMat, [0, -pd / 2, -pz], { cast: false });
  add(new THREE.PlaneGeometry(px * 2, pd), poolMat, [0, -pd / 2, pz], { rot: [0, Math.PI, 0], cast: false });
  add(new THREE.PlaneGeometry(pz * 2, pd), poolMat, [-px, -pd / 2, 0], { rot: [0, Math.PI / 2, 0], cast: false });
  add(new THREE.PlaneGeometry(pz * 2, pd), poolMat, [px, -pd / 2, 0], { rot: [0, -Math.PI / 2, 0], cast: false });

  // LED light fitting on the back wall
  const ledMat = new THREE.MeshStandardMaterial({ color: 0x0b1a26, emissive: 0x4fb4ff, emissiveIntensity: 0, roughness: 0.2 });
  add(new THREE.CircleGeometry(0.11, 48), ledMat, [LED_POS.x, LED_POS.y, -pz + 0.012], { cast: false });
  add(new THREE.TorusGeometry(0.12, 0.018, 12, 48), steel, [LED_POS.x, LED_POS.y, -pz + 0.01], { cast: false });
  const ledLight = new THREE.PointLight(0x3aa6ff, 0, 6, 1.6);
  ledLight.position.set(0, -0.3, -0.7);
  scene.add(ledLight);

  // ----- water surface: reflects the real garden panorama -----
  const normalTex = TX.waterNormalTexture();
  const waterUniforms = {
    uTime: { value: 0 }, uSun: { value: 1 }, uSunDir: { value: sunDir }, uNormal: { value: normalTex }, uPano: { value: pano },
  };
  const waterMat = new THREE.ShaderMaterial({
    uniforms: waterUniforms,
    transparent: true, depthWrite: false,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    vertexShader: `
      varying vec3 vWorld;
      void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `
      varying vec3 vWorld;
      uniform float uTime, uSun;
      uniform vec3 uSunDir;
      uniform sampler2D uNormal, uPano;
      void main(){
        vec2 uv = vWorld.xz;
        vec3 a = texture2D(uNormal, uv * 0.55 + vec2(uTime * 0.021, uTime * 0.012)).xyz * 2.0 - 1.0;
        vec3 b = texture2D(uNormal, uv * 1.1 - vec2(uTime * 0.017, -uTime * 0.026)).xyz * 2.0 - 1.0;
        vec2 slope = (a.xy + b.xy * 0.6) * 0.12;
        vec3 n = normalize(vec3(slope.x, 1.0, slope.y));
        vec3 V = normalize(cameraPosition - vWorld);
        float F = 0.02 + 0.98 * pow(1.0 - max(dot(n, V), 0.0), 5.0);
        vec3 R = reflect(-V, n);
        R.y = max(R.y, 0.02);
        vec2 puv = vec2(atan(R.z, R.x) * 0.15915494 + 0.5, asin(clamp(R.y, -1.0, 1.0)) * 0.31830989 + 0.5);
        vec3 sky = texture2D(uPano, puv).rgb * mix(0.06, 1.0, uSun);
        float s = max(dot(R, uSunDir), 0.0);
        vec3 spec = vec3(1.0, 0.95, 0.88) * uSun * (pow(s, 900.0) * 30.0 + pow(s, 90.0) * 0.2);
        vec3 col = sky * F + spec + vec3(0.01, 0.05, 0.06) * uSun;
        gl_FragColor = vec4(col, clamp(F + 0.05, 0.0, 1.0));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  add(new THREE.PlaneGeometry(px * 2, pz * 2), waterMat, [0, POOL.water, 0], { rot: [-Math.PI / 2, 0, 0], cast: false, receive: false });

  // ----- coping ring -----
  const cw = 0.32, ct = 0.07;
  const holeX = px + cw, holeZ = pz + cw;
  const cope = (w, d, x, z) => add(worldUV(new RoundedBoxGeometry(w, ct, d, 3, 0.022), 0.9), copingMat, [x, 0.02, z]);
  cope(px * 2 + cw * 2, cw, 0, -pz - cw / 2);
  cope(px * 2 + cw * 2, cw, 0, pz + cw / 2);
  cope(cw, pz * 2, -px - cw / 2, 0);
  cope(cw, pz * 2, px + cw / 2, 0);

  // ----- balau deck: one solid slab with the pool cut out exactly at the coping edge -----
  const DX = 5.2, DZ0 = -4.4, DZ1 = 4.4, DT = -GROUND_Y;
  const deckShape = new THREE.Shape([[-DX, -DZ1], [DX, -DZ1], [DX, -DZ0], [-DX, -DZ0]].map(([x, y]) => new THREE.Vector2(x, y)));
  deckShape.holes.push(new THREE.Path([[-holeX, -holeZ], [-holeX, holeZ], [holeX, holeZ], [holeX, -holeZ]].map(([x, y]) => new THREE.Vector2(x, y))));
  const deckGeo = new THREE.ExtrudeGeometry(deckShape, { depth: DT, bevelEnabled: false });
  // after this rotation the shape's y axis becomes -z, and the slab's top sits at y = 0
  deckGeo.rotateX(-Math.PI / 2);
  deckGeo.translate(0, -DT, 0);
  deckGeo.computeVertexNormals();
  const deck = add(worldUV(deckGeo, 1), deckMat, [0, 0, 0], { cast: false });
  deck.receiveShadow = true;

  // ----- garden wall and pool house, plastered -----
  add(worldUV(new THREE.BoxGeometry(6.2, 1.3, 0.22), 2), stucco, [2.1, 0.5, -4.51]);
  add(worldUV(new RoundedBoxGeometry(6.3, 0.07, 0.3, 2, 0.02), 0.9), copingMat, [2.1, 1.18, -4.51]);

  add(worldUV(new THREE.BoxGeometry(4.6, 2.75, 2.6), 2), stucco, [-2.9, 1.225, -5.8]);
  add(new THREE.BoxGeometry(0.9, 2.0, 0.05), new THREE.MeshStandardMaterial({ color: 0x5a3a26, roughness: 0.55 }), [-3.6, 1.0, -4.485]);
  add(new THREE.BoxGeometry(0.06, 0.06, 0.05), steel, [-3.25, 1.0, -4.45]);
  const roof = new THREE.Group();
  roof.position.set(-2.9, 2.62, -4.4);
  roof.rotation.x = 0.3;
  scene.add(roof);
  add(new THREE.BoxGeometry(5.0, 0.1, 3.1), new THREE.MeshStandardMaterial({ map: TX.roofTexture(), metalness: 0.5, roughness: 0.45 }), [0, 0, -1.5], { parent: roof });
  const solarMat = new THREE.MeshPhysicalMaterial({ map: TX.solarTexture(), roughness: 0.38, clearcoat: 0.6, clearcoatRoughness: 0.25 });
  for (let i = -1.5; i <= 1.5; i++) add(new THREE.BoxGeometry(1.1, 0.025, 2.5), solarMat, [i * 1.16, 0.07, -1.55], { parent: roof });
  for (const zz of [-0.22, -2.88]) add(new THREE.CylinderGeometry(0.035, 0.035, 4.8, 16), pvc, [0, 0.1, zz], { rot: [0, 0, Math.PI / 2], parent: roof });

  // ----- frameless glass fence with polished spigots -----
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xd6ece6, metalness: 0, roughness: 0.02, transparent: true, opacity: 0.16, envMapIntensity: 1.8, depthWrite: false });
  for (let i = 0; i < 3; i++) {
    const x = -px - cw + 0.78 + i * 1.56;
    add(new THREE.BoxGeometry(1.5, 1.2, 0.012), glass, [x, 0.72, -holeZ - 0.22], { cast: false });
    for (const sx of [-0.45, 0.45]) {
      add(new THREE.CylinderGeometry(0.028, 0.03, 0.22, 24), steel, [x + sx, 0.11, -holeZ - 0.22]);
      add(new THREE.CylinderGeometry(0.05, 0.05, 0.012, 24), steel, [x + sx, 0.006, -holeZ - 0.22]);
    }
  }

  // ----- equipment pad: sand filter, pump and pipework (like the install in "Our work") -----
  add(worldUV(new THREE.BoxGeometry(1.7, 0.09, 1.2), 0.9), copingMat, [3.8, 0.045, -3.2]);
  const F = [3.35, -3.3];
  const tank = add(new THREE.SphereGeometry(0.34, 48, 32), tankMat, [F[0], 0.47, F[1]]);
  tank.scale.set(1, 1.05, 1);
  add(new THREE.CylinderGeometry(0.33, 0.3, 0.14, 48), tankMat, [F[0], 0.16, F[1]]);
  add(new THREE.CylinderGeometry(0.12, 0.12, 0.03, 32), blackPlastic, [F[0], 0.83, F[1]]);
  // multiport valve on the side, as on modern side-mount filters
  add(new THREE.CylinderGeometry(0.11, 0.11, 0.1, 6), blackPlastic, [F[0] + 0.05, 0.42, F[1] + 0.36], { rot: [Math.PI / 2, 0, 0] });
  add(new THREE.BoxGeometry(0.05, 0.16, 0.04), blackPlastic, [F[0] + 0.05, 0.46, F[1] + 0.43]);

  const P = [4.3, -3.05];
  add(new THREE.CylinderGeometry(0.14, 0.14, 0.36, 40), blackPlastic, [P[0] + 0.28, 0.27, P[1]], { rot: [0, 0, Math.PI / 2] });
  add(new THREE.CylinderGeometry(0.16, 0.16, 0.18, 40), blackPlastic, [P[0], 0.27, P[1]], { rot: [0, 0, Math.PI / 2] });
  add(new THREE.CylinderGeometry(0.11, 0.1, 0.24, 32), blackPlastic, [P[0] - 0.22, 0.27, P[1]]);
  add(new THREE.CylinderGeometry(0.115, 0.115, 0.05, 32), clearLid, [P[0] - 0.22, 0.41, P[1]], { cast: false });
  add(new THREE.BoxGeometry(0.5, 0.1, 0.3), blackPlastic, [P[0] + 0.1, 0.12, P[1]]);

  const tube = (pts, rad = 0.028) => add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)), false, 'catmullrom', 0.08), 48, rad, 14), pvc);
  tube([[P[0], 0.43, P[1]], [P[0], 0.62, P[1]], [P[0] - 0.3, 0.62, P[1] + 0.35], [F[0] + 0.05, 0.42, F[1] + 0.47]]);
  tube([[F[0] - 0.05, 0.42, F[1] + 0.45], [F[0] - 0.45, 0.42, F[1] + 0.5], [F[0] - 0.55, 0.3, F[1] + 0.55], [F[0] - 0.55, 0.05, F[1] + 0.6]]);
  tube([[P[0] - 0.33, 0.27, P[1]], [P[0] - 0.6, 0.27, P[1] + 0.25], [P[0] - 0.7, 0.05, P[1] + 0.6]]);
  // solar feed and return running down the pool-house wall into the deck
  tube([[-0.62, 2.55, -4.45], [-0.55, 2.3, -4.45], [-0.55, 0.0, -4.45]], 0.024);
  tube([[-0.74, 2.5, -4.45], [-0.67, 2.25, -4.45], [-0.67, 0.0, -4.45]], 0.024);

  // ----- sun lounger -----
  const cushion = new THREE.MeshPhysicalMaterial({ color: 0xd6d1c6, roughness: 0.9, sheen: 1, sheenColor: new THREE.Color(0xffffff), sheenRoughness: 0.7 });
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x2a2d30, metalness: 0.6, roughness: 0.4 });
  const lounger = new THREE.Group();
  lounger.position.set(-3.75, 0, 0.6);
  lounger.rotation.y = 0.12;
  scene.add(lounger);
  add(new RoundedBoxGeometry(0.7, 0.1, 1.35, 4, 0.045), cushion, [0, 0.36, 0.3], { parent: lounger });
  add(new RoundedBoxGeometry(0.7, 0.1, 0.72, 4, 0.045), cushion, [0, 0.55, -0.62], { rot: [-0.55, 0, 0], parent: lounger });
  add(new THREE.BoxGeometry(0.74, 0.05, 1.95), frameMat, [0, 0.29, 0.05], { parent: lounger });
  for (const [x, z] of [[-0.33, 0.9], [0.33, 0.9], [-0.33, -0.8], [0.33, -0.8]]) add(new THREE.CylinderGeometry(0.02, 0.02, 0.28, 12), frameMat, [x, 0.14, z], { parent: lounger });

  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.fov = w / h < 0.9 ? 52 : 38;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(container);
  resize();

  // ----- camera tour -----
  const cur = { pos: new THREE.Vector3(...SHOTS.overview.pos), target: new THREE.Vector3(...SHOTS.overview.target) };
  const goal = { pos: cur.pos.clone(), target: cur.target.clone(), dusk: 0 };
  let dusk = 0;
  function setShot(name) {
    const s = SHOTS[name] || SHOTS.overview;
    goal.pos.set(...s.pos); goal.target.set(...s.target); goal.dusk = s.dusk ? 1 : 0;
    if (reducedMotion) { cur.pos.copy(goal.pos); cur.target.copy(goal.target); dusk = goal.dusk; }
  }

  const skyDay = new THREE.Color(1, 1, 1), skyDusk = new THREE.Color(0.07, 0.09, 0.17);
  let visible = false, time = 0, prev = performance.now(), slowAvg = 1 / 60, frames = 0;
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; }, { rootMargin: '100px' }).observe(container);
  const sway = new THREE.Vector3();

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - prev) / 1000, 0.05); prev = now;
    if (!visible) return;
    time += reducedMotion ? 0 : dt;

    const k = 1 - Math.exp(-dt * 2.1);
    cur.pos.lerp(goal.pos, k);
    cur.target.lerp(goal.target, k);
    dusk += (goal.dusk - dusk) * (1 - Math.exp(-dt * 1.6));

    const s = reducedMotion ? 0 : 1;
    camera.position.copy(cur.pos).add(sway.set(Math.sin(time * 0.21) * 0.08 * s, Math.sin(time * 0.17) * 0.04 * s, 0));
    camera.lookAt(cur.target);

    // day ↔ night: the garden darkens and the LED takes over
    sun.intensity = THREE.MathUtils.lerp(2.6, 0.02, dusk);
    scene.environmentIntensity = THREE.MathUtils.lerp(0.75, 0.05, dusk);
    renderer.toneMappingExposure = THREE.MathUtils.lerp(0.9, 1.1, dusk);
    skybox.material.color.lerpColors(skyDay, skyDusk, dusk);
    shadowCatcher.material.opacity = 0.38 * (1 - dusk);
    poolUniforms.uSun.value = THREE.MathUtils.lerp(1, 0.04, dusk);
    poolUniforms.uLed.value = dusk * 1.3;
    ledMat.emissiveIntensity = dusk * 6;
    ledLight.intensity = dusk * 5;

    poolUniforms.uTime.value = time;
    waterUniforms.uTime.value = time;
    waterUniforms.uSun.value = poolUniforms.uSun.value;

    renderer.render(scene, camera);

    // keep integrated GPUs and phones smooth: drop resolution if frames run long
    slowAvg = slowAvg * 0.95 + dt * 0.05;
    if (++frames % 90 === 0) {
      if (slowAvg > 1 / 38 && dpr > 0.7) { dpr = Math.max(0.7, dpr - 0.15); renderer.setPixelRatio(dpr); resize(); }
      else if (slowAvg < 1 / 58 && dpr < maxDpr) { dpr = Math.min(maxDpr, dpr + 0.1); renderer.setPixelRatio(dpr); resize(); }
    }
  }
  requestAnimationFrame(frame);

  return { setShot };
}
