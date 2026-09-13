// ============================================================================
// Dream Knight — KINOWY POTOK RENDEROWANIA (v3.1 „Wersja Kinowa”)
// ----------------------------------------------------------------------------
// Architektura inspirowana potokami AAA / DLSS:
//
//   [jittered camera]──► SCENE ──► rtScene (0.7–0.85×, HDR RGBA16F + depth)
//                              │
//                              ├─► SSAO (½ wewn.) ─► blur ─► aoTex
//                              ├─► BLOOM (bright-pass + piramida 4 poziomy)
//                              ─► TAA RESOLVE (full res):
//                                    aktualna klatka (bilinear upscale)
//                                  + historia (reprojekcja po wektorach ruchu
//                                    liczonych z depth + macierzy VP)
//                                  → neighbourhood clamp = brak ghostingu
//                              ─► COMPOSITE (full res → ekran):
//                                    DoF (bokeh) → AO → bloom → wyostrzenie
//                                    → ekspozycja → ACES → grading „Natural”
//                                    → sRGB → winieta + ziarno filmowe
//
//   ODDZIELNIE: PMREMGenerator.fromScene(proceduralne niebo) → scene.environment
//               (IBL dla materiałów PBR, odświeżane co ~4 s wraz z cyklem dnia)
//
// fallback: brak EXT_color_buffer_float albo jakość „low” → klasyczny
//           renderer.render() z ACES (pełna zgodność ze starym wyglądem).
// ============================================================================

import * as THREE from 'three';

// --- sekwencja Haltona (8 wzorów ditheringu subpikselowego dla TAA) ---
const HALTON = [
  [0.5, 0.3333], [0.25, 0.6667], [0.75, 0.1111], [0.125, 0.4444],
  [0.625, 0.7778], [0.375, 0.2222], [0.875, 0.5556], [0.0625, 0.8889],
];

// --- jądro próbek SSAO: spiralna hemisfera (12 kierunków, deterministycznie) ---
function buildKernel(n = 12) {
  const k = [];
  for (let i = 0; i < n; i++) {
    const z = 0.18 + 0.82 * ((i + 0.5) / n);            // wysokość nad powierzchnią
    const rr = Math.sqrt(Math.max(0, 1 - z * z)) * Math.sqrt(((i % 4) + 0.5) / 4);
    const a = i * 2.39996323;                            // złoty kąt
    k.push(new THREE.Vector3(Math.cos(a) * rr, Math.sin(a) * rr, z).normalize());
  }
  return k;
}

const VERT = /* glsl */`
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

// ------------------------------- TAA ---------------------------------------
// Temporal Anti-Aliasing + upscaling. Wektory ruchu liczone w shaderze z
// bufora głębi (reprojekcja: invVP(curr) → world → VP(prev)).
const FRAG_TAA = /* glsl */`
varying vec2 vUv;
uniform sampler2D uCur;      // kolor sceny (wewn. rozdzielczość, linear HDR)
uniform sampler2D uDepth;    // głębia sceny (NEAREST)
uniform sampler2D uHist;     // historia (pełna rozdzielczość)
uniform mat4 uInvVP;         // odwrotna VP bieżącej klatki (z jitterem)
uniform mat4 uPrevVP;        // VP poprzedniej klatki (z jitterem)
uniform vec2 uResIn;         // rozdzielczość wewnętrzna
uniform vec2 uResOut;        // rozdzielczość wyjściowa
uniform float uBlend;        // bazowa waga historii
uniform float uReset;        // 1 = zignoruj historię (teleport / resize)

float getDepth(vec2 uv) { return texture2D(uDepth, uv).x; }

void main() {
  vec2 uv = vUv;
  vec3 cur = texture2D(uCur, uv).rgb;
  vec2 px = 1.0 / uResIn;

  // dylatacja głębi: najbliższy piksel z sąsiedztwa (mniej ghostingu na krawędziach)
  float d = getDepth(uv);
  float dMin = min(min(getDepth(uv + vec2(px.x, 0.0)), getDepth(uv - vec2(px.x, 0.0))),
                   min(getDepth(uv + vec2(0.0, px.y)), getDepth(uv - vec2(0.0, px.y))));
  dMin = min(d, dMin);

  // wektor ruchu piksela (reprojekcja przez przestrzeń świata)
  vec4 ndc = vec4(uv * 2.0 - 1.0, dMin * 2.0 - 1.0, 1.0);
  vec4 wp = uInvVP * ndc; wp /= wp.w;
  vec4 pc = uPrevVP * wp;
  vec2 prevUV = pc.xy / pc.w * 0.5 + 0.5;
  vec2 vel = (uv - prevUV) * uResOut;

  // variance clipping: clamp historii do μ ± 1.25σ sąsiedztwa (mniej ghostingu,
  // lepsza ostrość niż przy czystym min/max)
  vec3 m1 = vec3(0.0), m2 = vec3(0.0);
  for (int i = -1; i <= 1; i++) {
    for (int j = -1; j <= 1; j++) {
      vec3 c = texture2D(uCur, uv + vec2(float(i), float(j)) * px).rgb;
      m1 += c; m2 += c * c;
    }
  }
  vec3 mu = m1 / 9.0;
  vec3 sigma = sqrt(max(m2 / 9.0 - mu * mu, vec3(0.0)));
  vec3 hist = clamp(texture2D(uHist, prevUV).rgb, mu - sigma * 1.25, mu + sigma * 1.25);

  float blend = uBlend;
  blend *= clamp(1.6 - length(vel) / 40.0, 0.25, 1.0);   // szybki ruch = mniej historii
  bool ok = prevUV.x > 0.0 && prevUV.x < 1.0 && prevUV.y > 0.0 && prevUV.y < 1.0;
  if (uReset > 0.5 || !ok || d >= 0.99995) blend = 0.0;

  gl_FragColor = vec4(mix(cur, hist, blend), 1.0);
}
`;

// ------------------------------- SSAO ---------------------------------------
// Połowa rozdzielczości wewnętrznej. Normalna rekonstruowana z głębi,
// 12 rotowanych próbki hemisferycznych + range-check (brak halo).
const FRAG_SSAO = /* glsl */`
varying vec2 vUv;
uniform sampler2D uDepth;
uniform mat4 uInvProj;
uniform mat4 uProj;
uniform vec2 uRes;
uniform float uRadius;
uniform float uIntensity;
uniform vec3 uSamples[12];

float getDepth(vec2 uv) { return texture2D(uDepth, uv).x; }

vec3 viewPos(vec2 uv, float d) {
  vec4 c = vec4(uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0);
  vec4 v = uInvProj * c;
  return v.xyz / v.w;
}

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

void main() {
  vec2 uv = vUv;
  float d = getDepth(uv);
  if (d >= 0.99995) { gl_FragColor = vec4(1.0); return; }   // niebo
  vec3 p = viewPos(uv, d);
  vec2 px = 1.0 / uRes;

  // normalna z pochodnych głębi (screen-space)
  vec3 pr = viewPos(uv + vec2(px.x, 0.0), getDepth(uv + vec2(px.x, 0.0)));
  vec3 pu = viewPos(uv + vec2(0.0, px.y), getDepth(uv + vec2(0.0, px.y)));
  vec3 n = normalize(cross(pr - p, pu - p));
  if (n.z < 0.0) n = -n;

  float ang = hash12(uv * uRes) * 6.2831853;
  float ca = cos(ang), sa = sin(ang);

  float occ = 0.0;
  for (int i = 0; i < 12; i++) {
    vec3 s = uSamples[i];
    s = vec3(ca * s.x - sa * s.y, sa * s.x + ca * s.y, s.z);   // rotacja per-piksel
    float len = uRadius * (0.35 + 0.65 * hash12(uv * uRes + float(i) * 7.31));
    vec3 sp = p + s * len;
    vec4 clip = uProj * vec4(sp, 1.0);
    vec2 suv = clip.xy / clip.w * 0.5 + 0.5;
    if (suv.x < 0.0 || suv.x > 1.0 || suv.y < 0.0 || suv.y > 1.0) continue;
    float sceneZ = -viewPos(suv, getDepth(suv)).z;
    float sampleZ = -sp.z;
    float diff = sampleZ - sceneZ;          // > 0: geometria zasłania próbkę
    if (diff > 0.02) {
      occ += smoothstep(0.0, 0.08, diff) * (1.0 - smoothstep(uRadius * 0.6, uRadius * 1.4, diff));
    }
  }
  float ao = 1.0 - clamp(occ / 12.0 * uIntensity, 0.0, 1.0);
  gl_FragColor = vec4(ao, ao, ao, 1.0);
}
`;

// wygładzanie AO (namiot 3×3, ta sama rozdzielczość)
const FRAG_BLUR = /* glsl */`
varying vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uTexel;
void main() {
  vec3 c = texture2D(uTex, vUv).rgb * 4.0;
  c += texture2D(uTex, vUv + uTexel * vec2(-1.0, -1.0)).rgb;
  c += texture2D(uTex, vUv + uTexel * vec2( 1.0, -1.0)).rgb;
  c += texture2D(uTex, vUv + uTexel * vec2(-1.0,  1.0)).rgb;
  c += texture2D(uTex, vUv + uTexel * vec2( 1.0,  1.0)).rgb;
  gl_FragColor = vec4(c / 8.0, 1.0);
}
`;

// ------------------------------- BLOOM --------------------------------------
// bright-pass (miękkie kolano) + downsample 4×4
const FRAG_BRIGHT = /* glsl */`
varying vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uTexel;
uniform float uThreshold;
uniform float uKnee;
vec3 tap(vec2 o) { return texture2D(uTex, vUv + o * uTexel).rgb; }
void main() {
  vec3 c = (tap(vec2(-0.5, -0.5)) + tap(vec2(0.5, -0.5)) + tap(vec2(-0.5, 0.5)) + tap(vec2(0.5, 0.5))) * 0.25;
  float br = max(c.r, max(c.g, c.b));
  float soft = clamp(br - uThreshold + uKnee, 0.0, 2.0 * uKnee);
  soft = soft * soft / (4.0 * uKnee + 1e-4);
  float w = max(soft, br - uThreshold) / max(br, 1e-4);
  gl_FragColor = vec4(c * w, 1.0);
}
`;

const FRAG_DOWN = /* glsl */`
varying vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uTexel;
vec3 tap(vec2 o) { return texture2D(uTex, vUv + o * uTexel).rgb; }
void main() {
  vec3 c = (tap(vec2(-0.5, -0.5)) + tap(vec2(0.5, -0.5)) + tap(vec2(-0.5, 0.5)) + tap(vec2(0.5, 0.5))) * 0.25;
  gl_FragColor = vec4(c, 1.0);
}
`;

// upsample (namiot) nakładany addytywnie na niższy poziom piramidy
const FRAG_UP = /* glsl */`
varying vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uTexel;
void main() {
  vec3 c = texture2D(uTex, vUv + uTexel * vec2(-1.0, -1.0)).rgb;
  c += texture2D(uTex, vUv + uTexel * vec2(1.0, -1.0)).rgb;
  c += texture2D(uTex, vUv + uTexel * vec2(-1.0, 1.0)).rgb;
  c += texture2D(uTex, vUv + uTexel * vec2(1.0, 1.0)).rgb;
  gl_FragColor = vec4(c * 0.25, 1.0);
}
`;

// ----------------------------- COMPOSITE ------------------------------------
// DoF (bokeh, złoty kąt) → AO → bloom → wyostrzenie (styl DLSS) → ekspozycja
// → ACES filmic → grading „Natural/Photographic” → sRGB → winieta + ziarno.
const FRAG_COMPOSITE = /* glsl */`
varying vec2 vUv;
uniform sampler2D uColor;    // wynik TAA (pełna rozdz., linear HDR)
uniform sampler2D uAO;
uniform sampler2D uBloom;
uniform sampler2D uDepth;    // głębia sceny (do CoC)
uniform mat4 uInvProj;
uniform vec2 uRes;
uniform float uAOStr, uBloomStr, uExposure, uSharpen;
uniform float uAOOn, uDoFOn, uBloomOn;
uniform float uFocus;        // dystans ostrości (świat)
uniform float uTime;

vec3 viewPos(vec2 uv, float d) {
  vec4 c = vec4(uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0);
  vec4 v = uInvProj * c;
  return v.xyz / v.w;
}
float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

// ACES (Narkowicz fit) — filmowy tonemapping
vec3 aces(vec3 x) {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

void main() {
  vec2 uv = vUv;
  vec3 col = texture2D(uColor, uv).rgb;

  // wyostrzenie po temporalnym upscalingu (z clampem — bez halo)
  if (uSharpen > 0.001) {
    vec2 px = 1.0 / uRes;
    vec3 n1 = texture2D(uColor, uv + vec2(px.x, 0.0)).rgb;
    vec3 n2 = texture2D(uColor, uv - vec2(px.x, 0.0)).rgb;
    vec3 n3 = texture2D(uColor, uv + vec2(0.0, px.y)).rgb;
    vec3 n4 = texture2D(uColor, uv - vec2(0.0, px.y)).rgb;
    vec3 nb = (n1 + n2 + n3 + n4) * 0.25;
    col = clamp(col + (col - nb) * uSharpen, min(min(n1, n2), min(n3, n4)), max(max(n1, n2), max(n3, n4)));
  }

  // bokeh DoF — tylko tło (golden-angle spiral, subtelnie)
  if (uDoFOn > 0.5) {
    float d = texture2D(uDepth, uv).x;
    float dist = -viewPos(uv, d).z;
    float coc = clamp((dist - uFocus) / max(uFocus * 2.4, 1.0), 0.0, 1.0);
    coc = coc * coc;
    if (coc > 0.02) {
      float maxR = 5.0 * (uRes.y / 1080.0);
      vec3 acc = vec3(0.0);
      for (int i = 0; i < 16; i++) {
        float fi = float(i) + 0.5;
        float a = fi * 2.39996323;
        float r = sqrt(fi / 16.0) * coc * maxR;
        vec2 off = vec2(cos(a), sin(a)) * r / uRes;
        acc += texture2D(uColor, uv + off).rgb;
      }
      col = mix(col, acc / 16.0, clamp(coc * 1.15, 0.0, 0.8));
    }
  }

  // AO z ochroną świateł (nie gasimy błysków i nieba)
  if (uAOOn > 0.5) {
    float ao = texture2D(uAO, uv).r;
    float hi = smoothstep(0.7, 1.3, luma(col));
    col *= mix(mix(1.0, ao, uAOStr), 1.0, hi * 0.75);
  }

  // bloom (rozbłyski)
  if (uBloomOn > 0.5) col += texture2D(uBloom, uv).rgb * uBloomStr;

  // ekspozycja + tonemapping filmowy
  col *= uExposure;
  col = aces(col);

  // --- grading „Natural / Photographic” ---
  // łagodna krzywa S (filmowy kontrast, bez „plastiku” WebGL)
  col = mix(col, col * col * (3.0 - 2.0 * col), 0.32);
  // stonowane barwy
  float l = luma(col);
  col = mix(vec3(l), col, 0.93);
  // split-toning: chłodne cienie, ciepłe światła
  col *= mix(vec3(0.975, 0.99, 1.045), vec3(1.04, 1.0, 0.955), smoothstep(0.22, 0.78, l));

  // sRGB
  col = mix(col * 12.92, 1.055 * pow(col, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, col));

  // winieta + subtelne ziarno filmowe
  vec2 q = uv - 0.5;
  col *= clamp(1.0 - dot(q, q) * 0.38, 0.0, 1.0);
  float g = fract(sin(dot(uv * uRes + mod(uTime * 61.7, 1000.0), vec2(12.9898, 78.233))) * 43758.5453);
  col += (g - 0.5) * 0.02 * (1.0 - l * 0.6);

  gl_FragColor = vec4(col, 1.0);
}
`;

// Progi jakościowe potoku (wewnętrzna skala = odpowiednik trybu DLSS Quality)
const TIERS = {
  low: null,                                                          // potok wyłączony
  medium: { scale: 0.85, ssao: false, dof: false, sharpen: 0.22 },
  high: { scale: 0.75, ssao: true, dof: false, sharpen: 0.28 },
  ultra: { scale: 0.70, ssao: true, dof: true, sharpen: 0.32 },
};

export class RenderPipeline {
  constructor(renderer, scene, camera, world, opts = {}) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.world = world;
    this.opts = opts;
    this.enabled = false;
    this._frame = 0;
    this._reset = true;
    this._dynScale = 1;
    this._tier = null;
    this._basePR = 1;
    this._envT = 99;          // wymuś pierwsze odświeżenie środowiska
    this._t = 0;
    this._jitterAmp = 0.75;   // w pikselach rozdzielczości wewnętrznej

    // macierze robocze (bez alokacji w pętli)
    this._baseProj = new THREE.Matrix4();
    this._proj = new THREE.Matrix4();
    this._view = new THREE.Matrix4();
    this._vp = new THREE.Matrix4();
    this._invVP = new THREE.Matrix4();
    this._prevVP = new THREE.Matrix4();
    this._prevCamPos = new THREE.Vector3(1e9, 1e9, 1e9);

    // zdolność GPU: HDR render targety (RGBA16F) wymagają EXT_color_buffer_float
    this._capable = renderer.capabilities.isWebGL2 !== false &&
      !!renderer.extensions.get('EXT_color_buffer_float');

    if (!this._capable) {
      console.info('[postfx] GPU bez EXT_color_buffer_float — pozostaję przy klasycznym renderingu');
      return;
    }

    this._buildMaterials();
    this._buildFsQuad();
    this._buildEnvScene();
  }

  // ------------------------------ jakość ------------------------------------
  setQuality(name, basePR, dynScale = 1) {
    this._basePR = basePR || 1;
    this._dynScale = dynScale;
    const tier = TIERS[name] || null;
    this._tier = tier;
    const wasEnabled = this.enabled;
    this.enabled = !!tier && this._capable;

    if (!this.enabled) {
      // powrót do klasycznego potoku: ACES w materiale + pełny pixel ratio
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.05;
      this.renderer.setPixelRatio(this._basePR * this._dynScale);
      if (wasEnabled) this._disposeTargets();
      return;
    }
    // tonemapping przenosimy do passu COMPOSITE (potrzebny linear HDR)
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.setPixelRatio(this._basePR);
    this._applyScale();
    // ciepłe odświeżenie IBL od razu po włączeniu (bez przeskoku przy 1. klatce)
    if (this.scene && !this.scene.environment) this.updateEnvironment();
  }

  // dynamiczna skala od gubernatora FPS (zakres 0.55..1 → wewn. 0.5..1)
  setDynScale(s) {
    this._dynScale = s || 1;
    if (this.enabled) this._applyScale();
  }

  _applyScale() {
    const s = Math.max(0.5, Math.min(1, (this._tier?.scale ?? 1) * this._dynScale));
    this._scale = s;
    this.resize(true);
    this.resetHistory();
  }

  resize(force = false) {
    if (!this.enabled && !force) return;
    const size = this.renderer.getDrawingBufferSize(new THREE.Vector2());
    const wOut = Math.max(2, Math.floor(size.x));
    const hOut = Math.max(2, Math.floor(size.y));
    const wIn = Math.max(2, Math.floor(wOut * this._scale));
    const hIn = Math.max(2, Math.floor(hOut * this._scale));
    // realokuj cele tylko przy realnej zmianie rozmiaru (gubernator FPS wyczuwalny rzadko)
    if (wOut === this._wOut && hOut === this._hOut && wIn === this._wIn && hIn === this._hIn && this.rtScene) return;
    this._wOut = wOut; this._hOut = hOut; this._wIn = wIn; this._hIn = hIn;
    this._allocTargets();
    this.resetHistory();
  }

  resetHistory() { this._reset = true; }

  // ------------------------------ cele renderu -------------------------------
  _allocTargets() {
    const wIn = this._wIn, hIn = this._hIn;

    // scena: linear HDR + tekstura głębi (NEAREST — wektory ruchu / SSAO / CoC)
    const sceneRT = () => {
      const rt = new THREE.WebGLRenderTarget(wIn, hIn, {
        type: THREE.HalfFloatType, format: THREE.RGBAFormat,
        minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: true,
      });
      rt.depthTexture = new THREE.DepthTexture(wIn, hIn);
      rt.depthTexture.type = THREE.UnsignedIntType;
      return rt;
    };
    this._disposeTargets();
    this.rtScene = sceneRT();
    this.rtAO = new THREE.WebGLRenderTarget(Math.max(2, wIn >> 1), Math.max(2, hIn >> 1), {
      type: THREE.UnsignedByteType, format: THREE.RedFormat,
      minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false,
    });
    this.rtAO2 = this.rtAO.clone();

    // piramida bloom (od ½ wewn. w dół, min 8 px)
    this.rtBloom = [];
    let bw = Math.max(2, wIn >> 1), bh = Math.max(2, hIn >> 1);
    for (let i = 0; i < 4; i++) {
      if (bw < 8 || bh < 8) break;
      this.rtBloom.push(new THREE.WebGLRenderTarget(bw, bh, {
        type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false,
      }));
      bw = Math.max(2, bw >> 1); bh = Math.max(2, bh >> 1);
    }

    // historia TAA: pełna rozdzielczość wyjściowa, ping-pong
    this.rtHist = [
      new THREE.WebGLRenderTarget(this._wOut, this._hOut, {
        type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false,
      }),
      null,
    ];
    this.rtHist[1] = this.rtHist[0].clone();
    this._histIdx = 0;
  }

  _disposeTargets() {
    for (const rt of [this.rtScene, this.rtAO, this.rtAO2, ...(this.rtBloom || []), ...(this.rtHist || [])]) {
      if (rt) { rt.depthTexture?.dispose(); rt.dispose(); }
    }
    this.rtScene = this.rtAO = this.rtAO2 = null;
    this.rtBloom = []; this.rtHist = [];
  }

  // ------------------------------ materiały ---------------------------------
  _buildMaterials() {
    const kernel = buildKernel(12);
    this.matTAA = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG_TAA, depthTest: false, depthWrite: false,
      uniforms: {
        uCur: { value: null }, uDepth: { value: null }, uHist: { value: null },
        uInvVP: { value: new THREE.Matrix4() }, uPrevVP: { value: new THREE.Matrix4() },
        uResIn: { value: new THREE.Vector2() }, uResOut: { value: new THREE.Vector2() },
        uBlend: { value: 0.88 }, uReset: { value: 1 },
      },
    });
    this.matSSAO = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG_SSAO, depthTest: false, depthWrite: false,
      uniforms: {
        uDepth: { value: null },
        uInvProj: { value: new THREE.Matrix4() }, uProj: { value: new THREE.Matrix4() },
        uRes: { value: new THREE.Vector2() },
        uRadius: { value: 1.35 }, uIntensity: { value: 1.35 },
        uSamples: { value: kernel },
      },
    });
    this.matBlur = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG_BLUR, depthTest: false, depthWrite: false,
      uniforms: { uTex: { value: null }, uTexel: { value: new THREE.Vector2() } },
    });
    this.matBright = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG_BRIGHT, depthTest: false, depthWrite: false,
      uniforms: {
        uTex: { value: null }, uTexel: { value: new THREE.Vector2() },
        uThreshold: { value: 0.85 }, uKnee: { value: 0.45 },
      },
    });
    this.matDown = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG_DOWN, depthTest: false, depthWrite: false,
      uniforms: { uTex: { value: null }, uTexel: { value: new THREE.Vector2() } },
    });
    this.matUp = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG_UP,
      transparent: true, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false,
      uniforms: { uTex: { value: null }, uTexel: { value: new THREE.Vector2() } },
    });
    this.matComposite = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG_COMPOSITE, depthTest: false, depthWrite: false,
      uniforms: {
        uColor: { value: null }, uAO: { value: null }, uBloom: { value: null }, uDepth: { value: null },
        uInvProj: { value: new THREE.Matrix4() }, uRes: { value: new THREE.Vector2() },
        uAOStr: { value: 0.5 }, uBloomStr: { value: 0.5 }, uExposure: { value: 1.12 }, uSharpen: { value: 0.28 },
        uAOOn: { value: 0 }, uDoFOn: { value: 0 }, uBloomOn: { value: 1 },
        uFocus: { value: 14 }, uTime: { value: 0 },
      },
    });
  }

  _buildFsQuad() {
    this._fsScene = new THREE.Scene();
    this._fsCam = new THREE.Camera();
    this._fsMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.matComposite);
    this._fsMesh.frustumCulled = false;
    this._fsScene.add(this._fsMesh);
  }

  _blit(mat, target, clear = true) {
    this._fsMesh.material = mat;
    const r = this.renderer;
    if (!clear) r.autoClear = false;
    r.setRenderTarget(target);
    r.render(this._fsScene, this._fsCam);
    if (!clear) r.autoClear = true;
  }

  // --------------------------- środowisko IBL --------------------------------
  // PMREM z proceduralnego nieba (te same uniformy co skybox!) → realistyczne
  // odbicia na materiałach PBR, odświeżane wraz z cyklem dnia i pogodą.
  _buildEnvScene() {
    this._envScene = new THREE.Scene();
    const dome = new THREE.Mesh(new THREE.SphereGeometry(60, 24, 16), this.world.sky.material);
    dome.frustumCulled = false;
    this._envScene.add(dome);
    this._envSun = new THREE.Mesh(
      new THREE.SphereGeometry(4.5, 12, 8),
      new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }),
    );
    this._envScene.add(this._envSun);
    this._pmrem = null;
  }

  updateEnvironment() {
    if (!this._envScene) return;   // brak wsparcia HDR — IBL niedostępny
    this._envT = 0;
    if (!this._pmrem) this._pmrem = new THREE.PMREMGenerator(this.renderer);
    const dayF = 1 - (this.world.nightF ?? 0);
    const sd = this.world.skyU.sunDir.value;
    this._envSun.position.set(sd.x * 50, sd.y * 50, sd.z * 50);
    // HDR-owy dysk słońca → wyraźne refleksy spekularne; nocą ślepe źródło księżyca
    this._envSun.material.color.copy(this.world.sun.color).multiplyScalar(4 + 14 * dayF);
    const rt = this._pmrem.fromScene(this._envScene, 0.04);
    const old = this._envRT;
    this._envRT = rt;
    this.scene.environment = rt.texture;
    this.scene.environmentIntensity = 0.12 + dayF * 0.42;
    if (old) { old.texture.dispose(); old.dispose(); }
  }

  // ------------------------------ klatka ------------------------------------
  render(dt) {
    // IBL odświeżamy niezależnie od potoku (spójność odbić przy każdej jakości)
    this._envT += dt;
    if (this._envT > 4) { this._envT = 0; this.updateEnvironment(); }

    if (!this.enabled) { this.renderer.render(this.scene, this.camera); return; }
    const r = this.renderer, cam = this.camera;
    this._t += dt;

    // teleports / przecięcia kamery → zresetuj historię TAA
    if (this._prevCamPos.distanceToSquared(cam.position) > 900) this.resetHistory();
    this._prevCamPos.copy(cam.position);

    // --- 1. jitter subpikselowy (Halton) ---
    const [jx, jy] = HALTON[this._frame % HALTON.length];
    const jpx = (jx - 0.5) * this._jitterAmp, jpy = (jy - 0.5) * this._jitterAmp;
    cam.updateMatrixWorld(true);
    this._baseProj.copy(cam.projectionMatrix);
    this._proj.copy(this._baseProj);
    this._proj.elements[8] += jpx * 2 / this._wIn;
    this._proj.elements[9] += jpy * 2 / this._hIn;

    // --- 2. render sceny do HDR (niska rozdzielczość wewnętrzna) ---
    r.setRenderTarget(this.rtScene);
    r.render(this.scene, cam);

    // macierze VP po renderze (matrixWorldInverse aktualne)
    this._view.copy(cam.matrixWorldInverse);
    this._vp.multiplyMatrices(this._proj, this._view);
    this._invVP.copy(this._vp).invert();

    // przywróć niejitterowaną projekcję dla pozostałych systemów
    cam.projectionMatrix.copy(this._baseProj);
    cam.projectionMatrixInverse.copy(this._baseProj).invert();

    // --- 3. SSAO (½ wewnętrznej) ---
    const t = this._tier || {};
    if (t.ssao) {
      const u = this.matSSAO.uniforms;
      u.uDepth.value = this.rtScene.depthTexture;
      u.uInvProj.value.copy(this._proj).invert();
      u.uProj.value.copy(this._proj);
      u.uRes.value.set(this.rtAO.width, this.rtAO.height);
      this._blit(this.matSSAO, this.rtAO);
      const ub = this.matBlur.uniforms;
      ub.uTex.value = this.rtAO.texture;
      ub.uTexel.value.set(1.5 / this.rtAO.width, 1.5 / this.rtAO.height);
      this._blit(this.matBlur, this.rtAO2);
    }

    // --- 4. bloom: bright-pass + piramida w dół, potem addytywnie w górę ---
    const B = this.rtBloom;
    if (B.length) {
      const ub = this.matBright.uniforms;
      ub.uTex.value = this.rtScene.texture;
      ub.uTexel.value.set(1 / this._wIn, 1 / this._hIn);
      this._blit(this.matBright, B[0]);
      for (let i = 1; i < B.length; i++) {
        const ud = this.matDown.uniforms;
        ud.uTex.value = B[i - 1].texture;
        ud.uTexel.value.set(1 / B[i - 1].width, 1 / B[i - 1].height);
        this._blit(this.matDown, B[i]);
      }
      for (let i = B.length - 1; i > 0; i--) {
        const uu = this.matUp.uniforms;
        uu.uTex.value = B[i].texture;
        uu.uTexel.value.set(1 / B[i].width, 1 / B[i].height);
        this._blit(this.matUp, B[i - 1], false);   // addytywnie na niższy poziom
      }
    }

    // --- 5. TAA resolve (upscaling temporalny do pełnej rozdzielczości) ---
    const hist = this.rtHist[this._histIdx];
    const out = this.rtHist[1 - this._histIdx];
    const ut = this.matTAA.uniforms;
    ut.uCur.value = this.rtScene.texture;
    ut.uDepth.value = this.rtScene.depthTexture;
    ut.uHist.value = hist.texture;
    ut.uInvVP.value.copy(this._invVP);
    ut.uPrevVP.value.copy(this._prevVP);
    ut.uResIn.value.set(this._wIn, this._hIn);
    ut.uResOut.value.set(this._wOut, this._hOut);
    ut.uReset.value = this._reset ? 1 : 0;
    this._blit(this.matTAA, out);
    this._histIdx = 1 - this._histIdx;
    this._prevVP.copy(this._vp);
    this._reset = false;

    // --- 6. composite → ekran ---
    const uc = this.matComposite.uniforms;
    uc.uColor.value = out.texture;
    uc.uAO.value = this.rtAO2?.texture || null;
    uc.uBloom.value = B.length ? B[0].texture : null;
    uc.uDepth.value = this.rtScene.depthTexture;
    uc.uInvProj.value.copy(this._baseProj).invert();
    uc.uRes.value.set(this._wOut, this._hOut);
    uc.uAOOn.value = t.ssao ? 1 : 0;
    uc.uDoFOn.value = t.dof ? 1 : 0;
    uc.uBloomOn.value = B.length ? 1 : 0;
    uc.uSharpen.value = t.sharpen ?? 0.25;
    uc.uFocus.value = Math.min(70, Math.max(4, (this.opts.getFocus?.() ?? 14)));
    uc.uTime.value = this._t;
    this._blit(this.matComposite, null);

    this._frame++;
  }

  dispose() {
    this._disposeTargets();
    this._envRT?.texture.dispose(); this._envRT?.dispose();
    this._pmrem?.dispose();
    for (const m of [this.matTAA, this.matSSAO, this.matBlur, this.matBright, this.matDown, this.matUp, this.matComposite]) m?.dispose();
    this._fsMesh?.geometry.dispose();
  }
}
