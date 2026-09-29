// Shared GLSL used by the hero water and the 3D pool interior.

export const COMMON = /* glsl */ `
#define TAU 6.28318530718

float hash12(vec2 p){
  vec3 p3 = fract(vec3(p.xyx) * .1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1,0)), u.x),
             mix(hash12(i + vec2(0,1)), hash12(i + vec2(1,1)), u.x), u.y);
}

// Tileable water caustic (after Dave Hoskins / joltz0r).
float caustic(vec2 uv, float time){
  vec2 p = mod(uv * TAU, TAU) - 250.0;
  vec2 i = p;
  float c = 1.0;
  float inten = .005;
  for (int n = 0; n < 4; n++){
    float t = time * (1.0 - (3.5 / float(n + 1)));
    i = p + vec2(cos(t - i.x) + sin(t + i.y), sin(t - i.y) + cos(t + i.x));
    c += 1.0 / length(vec2(p.x / (sin(i.x + t) / inten), p.y / (cos(i.y + t) / inten)));
  }
  c /= 4.0;
  c = 1.17 - pow(c, 1.4);
  return pow(abs(c), 8.0);
}

// Cheap caustics for large surfaces: one sharp layer and one broad layer.
vec3 causticsMono(vec2 p, float time){
  vec2 q = p * 0.42;
  float g = caustic(q, time);
  float g2 = caustic(q * 0.61 + 3.7, time * 0.73);
  return vec3(clamp(g * 0.75 + g2 * 0.45, 0.0, 2.5));
}

// Chromatic caustics: each channel is focused at a slightly different depth.
vec3 causticsRGB(vec2 p, float time){
  vec2 q = p * 0.42;
  float r = caustic(q + vec2(0.0035, 0.0), time);
  float g = caustic(q, time);
  float b = caustic(q - vec2(0.0035, 0.0), time);
  // second, larger, slower layer breaks up the tiling
  float g2 = caustic(q * 0.61 + 3.7, time * 0.73);
  return clamp(vec3(r, g, b) * 0.7 + g2 * 0.45, 0.0, 2.5);
}

// Glass mosaic pool tiles with grout, bevel and blended tone clouds.
vec3 poolTiles(vec2 p){
  float ts = 0.055;
  vec2 q = p / ts;
  vec2 id = floor(q);
  vec2 f = fract(q);
  vec2 fw = fwidth(q) * 0.9;
  float gw = 0.075;
  vec2 m = smoothstep(vec2(gw) - fw, vec2(gw) + fw, f) *
           (1.0 - smoothstep(vec2(1.0 - gw) - fw, vec2(1.0 - gw) + fw, f));
  float tileMask = m.x * m.y;

  float r = hash12(id);
  float cloud = vnoise(id * 0.07) * 0.65 + vnoise(id * 0.21) * 0.35;
  vec3 c;
  if (r < 0.42) c = vec3(0.36, 0.70, 0.82);
  else if (r < 0.72) c = vec3(0.45, 0.79, 0.88);
  else if (r < 0.90) c = vec3(0.27, 0.60, 0.76);
  else c = vec3(0.66, 0.89, 0.92);
  c = mix(c, c * vec3(0.62, 0.8, 0.95), smoothstep(0.55, 0.85, cloud) * 0.5);
  c *= 0.92 + 0.14 * hash12(id + 17.31);

  float edge = min(min(f.x, f.y), min(1.0 - f.x, 1.0 - f.y));
  c *= 0.82 + 0.18 * smoothstep(0.0, 0.28, edge);
  vec3 grout = vec3(0.74, 0.80, 0.81);
  return mix(grout, c, tileMask);
}

vec3 acesTonemap(vec3 x){
  const float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}
`;
