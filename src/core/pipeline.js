// Rendering pipeline: HDR scene (MSAA) -> optional motion-blur accumulation -> DOF ->
// physically-flavoured mip-chain bloom -> final grade (ACES, colour grade, lens, grain,
// transitions) -> overlay composite (2D canvas for chapter cards / infographic text).
import * as THREE from 'three';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

const VS = /* glsl */`
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

function mat(frag, uniforms, extra = {}) {
  return new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false, ...extra });
}

const PREFILTER = /* glsl */`
uniform sampler2D tSrc; uniform vec2 texel; uniform float threshold; uniform float knee;
varying vec2 vUv;
vec3 pick(vec2 uv){ vec3 c = texture2D(tSrc, uv).rgb; float l = max(c.r, max(c.g, c.b)); return c * min(1.0, 40.0 / max(l, 1e-4)); }
void main(){
  vec3 c = (pick(vUv + texel*vec2(-1.,-1.)) + pick(vUv + texel*vec2(1.,-1.)) + pick(vUv + texel*vec2(-1.,1.)) + pick(vUv + texel*vec2(1.,1.))) * 0.25;
  float br = max(c.r, max(c.g, c.b));
  float soft = clamp(br - threshold + knee, 0.0, 2.0*knee);
  soft = soft*soft / (4.0*knee + 1e-4);
  float contrib = max(soft, br - threshold) / max(br, 1e-4);
  gl_FragColor = vec4(c * contrib, 1.0);
}`;

const DOWN = /* glsl */`
uniform sampler2D tSrc; uniform vec2 texel; varying vec2 vUv;
vec3 s(vec2 o){ return texture2D(tSrc, vUv + o*texel).rgb; }
void main(){
  vec3 a = s(vec2(-2.,-2.)), b = s(vec2(0.,-2.)), c = s(vec2(2.,-2.));
  vec3 d = s(vec2(-1.,-1.)), e = s(vec2(1.,-1.));
  vec3 f = s(vec2(-2.,0.)), g = s(vec2(0.,0.)), h = s(vec2(2.,0.));
  vec3 i = s(vec2(-1.,1.)), j = s(vec2(1.,1.));
  vec3 k = s(vec2(-2.,2.)), l = s(vec2(0.,2.)), m = s(vec2(2.,2.));
  vec3 r = (d+e+i+j)*0.125 + (a+b+f+g)*0.03125 + (b+c+g+h)*0.03125 + (f+g+k+l)*0.03125 + (g+h+l+m)*0.03125;
  gl_FragColor = vec4(r, 1.0);
}`;

const UP = /* glsl */`
uniform sampler2D tSrc; uniform vec2 texel; uniform float radius; uniform float weight; varying vec2 vUv;
vec3 s(vec2 o){ return texture2D(tSrc, vUv + o*texel*radius).rgb; }
void main(){
  vec3 r = s(vec2(-1.,-1.)) + 2.0*s(vec2(0.,-1.)) + s(vec2(1.,-1.))
         + 2.0*s(vec2(-1.,0.)) + 4.0*s(vec2(0.,0.)) + 2.0*s(vec2(1.,0.))
         + s(vec2(-1.,1.)) + 2.0*s(vec2(0.,1.)) + s(vec2(1.,1.));
  gl_FragColor = vec4(r / 16.0 * weight, 1.0);
}`;

const ACCUM = /* glsl */`
uniform sampler2D tSrc; uniform float weight; varying vec2 vUv;
void main(){ gl_FragColor = vec4(texture2D(tSrc, vUv).rgb * weight, 1.0); }`;

const DOF = /* glsl */`
uniform sampler2D tColor; uniform sampler2D tDepth;
uniform float cNear; uniform float cFar; uniform float focus; uniform float aperture; uniform float maxR; uniform vec2 px;
varying vec2 vUv;
float viewZ(float d){ return (cNear * cFar) / ((cFar - cNear) * d - cFar); }
float lin(vec2 uv){ return -viewZ(texture2D(tDepth, uv).r); }
float cocOf(float z){ return clamp(aperture * abs(z - focus) / max(z, 1e-3), 0.0, maxR); }
void main(){
  float z0 = lin(vUv);
  float c0 = cocOf(z0);
  vec3 col = texture2D(tColor, vUv).rgb;
  float tot = 1.0;
  float scale = maxR * maxR / 110.0;
  float r = 0.5;
  float ang = 0.0;
  for (int i = 0; i < 56; i++) {
    r = sqrt(float(i + 1) * 2.0 * scale);
    ang += 2.39996323;
    vec2 tc = vUv + vec2(cos(ang), sin(ang)) * px * r;
    vec3 sc = texture2D(tColor, tc).rgb;
    float zs = lin(tc);
    float cs = cocOf(zs);
    if (zs > z0) cs = clamp(cs, 0.0, c0 * 2.0);
    float m = smoothstep(r - 0.5, r + 0.5, cs);
    col += mix(col / tot, sc, m);
    tot += 1.0;
  }
  gl_FragColor = vec4(col / tot, 1.0);
}`;

const FINAL = /* glsl */`
uniform sampler2D tScene; uniform sampler2D tBloom; uniform sampler2D tOverlay;
uniform vec2 res; uniform float time;
uniform float exposure; uniform float bloomStr; uniform float contrast; uniform float saturation; uniform float vibrance;
uniform vec3 lift; uniform vec3 gammaC; uniform vec3 gain; uniform vec3 shadowTint; uniform vec3 highTint; uniform float temp;
uniform float vignette; uniform float ca; uniform float distort; uniform float grain;
uniform vec3 flashCol; uniform float flash; uniform float fade; uniform vec3 fadeCol;
uniform vec2 blurDir; uniform float blurAmt; uniform float glitch; uniform float mono; uniform float scan; uniform float nvg;
uniform float overlayOn; uniform float letterbox; uniform float zoomBlur; uniform float sharpen; uniform float hide3d;
varying vec2 vUv;

const mat3 ACESIn = mat3(0.59719,0.07600,0.02840, 0.35458,0.90834,0.13383, 0.04823,0.01566,0.83777);
const mat3 ACESOut = mat3(1.60475,-0.10208,-0.00327, -0.53108,1.10813,-0.07276, -0.07367,-0.00605,1.07602);
vec3 rrt(vec3 v){ vec3 a = v*(v+0.0245786)-0.000090537; vec3 b = v*(0.983729*v+0.4329510)+0.238081; return a/b; }
vec3 aces(vec3 c){ c = ACESIn * c; c = rrt(c); c = ACESOut * c; return clamp(c, 0.0, 1.0); }
float h12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec3 toSRGB(vec3 c){ return mix(c * 12.92, 1.055 * pow(c, vec3(1.0/2.4)) - 0.055, step(0.0031308, c)); }
float luma(vec3 c){ return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

vec3 hdr(vec2 uv){ return texture2D(tScene, uv).rgb + texture2D(tBloom, uv).rgb * bloomStr; }

vec3 sampleLens(vec2 uv){
  vec2 d = uv - 0.5;
  float r2 = dot(d, d);
  vec2 base = 0.5 + d * (1.0 + distort * r2);
  if (ca <= 0.0) return hdr(base);
  vec2 off = d * ca * (0.4 + r2 * 2.0);
  return vec3(hdr(base + off).r, hdr(base).g, hdr(base - off).b);
}

void main(){
  vec2 uv = vUv;
  // glitch: horizontal block displacement
  if (glitch > 0.0) {
    float row = floor(uv.y * 24.0);
    float tt = floor(time * 18.0);
    float h = h12(vec2(row, tt));
    if (h < glitch * 0.6) uv.x += (h12(vec2(tt, row)) - 0.5) * glitch * 0.12;
    float row2 = floor(uv.y * 90.0);
    if (h12(vec2(row2, tt + 3.0)) < glitch * 0.25) uv.x += (h12(vec2(row2, tt)) - 0.5) * 0.04;
  }
  vec3 c;
  if (blurAmt > 0.0005 || zoomBlur > 0.0005) {
    c = vec3(0.0);
    for (int i = 0; i < 16; i++) {
      float f = (float(i) / 15.0 - 0.5);
      vec2 o = blurDir * blurAmt * f + (uv - 0.5) * zoomBlur * f;
      c += sampleLens(uv + o);
    }
    c /= 16.0;
  } else {
    c = sampleLens(uv);
    if (sharpen > 0.0) {
      vec2 px = 1.0 / res;
      vec3 n = hdr(uv + vec2(px.x, 0.)) + hdr(uv - vec2(px.x, 0.)) + hdr(uv + vec2(0., px.y)) + hdr(uv - vec2(0., px.y));
      c = max(c + (c - n * 0.25) * sharpen, 0.0);
    }
  }
  if (glitch > 0.0) {
    float s = glitch * 0.012;
    c.r = mix(c.r, hdr(uv + vec2(s, 0.)).r, glitch);
    c.b = mix(c.b, hdr(uv - vec2(s, 0.)).b, glitch);
  }
  c *= (1.0 - hide3d);
  // white balance (simple warm/cool shift)
  c *= vec3(1.0 + temp * 0.10, 1.0, 1.0 - temp * 0.12);
  c *= exposure;
  c = aces(c);
  // lift / gamma / gain on display-referred values
  c = c * gain + lift * (1.0 - c);
  c = pow(max(c, 0.0), 1.0 / max(gammaC, vec3(0.01)));
  // split toning
  float L = luma(c);
  c += shadowTint * (1.0 - smoothstep(0.0, 0.5, L)) * 0.5 + highTint * smoothstep(0.5, 1.0, L) * 0.5;
  // contrast around mid grey
  c = (c - 0.18) * contrast + 0.18;
  c = max(c, 0.0);
  // saturation + vibrance
  L = luma(c);
  float sat = max(c.r, max(c.g, c.b)) - min(c.r, min(c.g, c.b));
  c = mix(vec3(L), c, saturation * (1.0 + vibrance * (1.0 - sat)));
  // monochrome / night-vision / scanlines (TV, CCTV, NVG looks)
  if (mono > 0.0) c = mix(c, vec3(luma(c)), mono);
  if (nvg > 0.0) { float l = luma(c); c = mix(c, vec3(0.25, 1.0, 0.35) * (l * 1.6 + 0.04), nvg); }
  c = clamp(c, 0.0, 1.0);
  // vignette
  vec2 vd = (vUv - 0.5) * vec2(res.x / res.y, 1.0);
  float v = smoothstep(0.35, 1.05, length(vd));
  c *= 1.0 - vignette * v;
  c = toSRGB(c);
  if (scan > 0.0) {
    float sl = 0.5 + 0.5 * sin(vUv.y * res.y * 1.2);
    c *= 1.0 - scan * 0.35 * sl;
    c += (h12(vUv * res + time * 60.0) - 0.5) * scan * 0.12;
  }
  // overlay (premultiplied, sRGB)
  if (overlayOn > 0.5) {
    vec4 o = texture2D(tOverlay, vUv);
    c = c * (1.0 - o.a) + o.rgb;
  }
  c = mix(c, fadeCol, fade);
  c = mix(c, flashCol, clamp(flash, 0.0, 1.0));
  // film grain (luminance weighted)
  float g = h12(vUv * res + fract(time * 7.13) * 100.0) - 0.5;
  c += g * grain * (1.0 - luma(c) * 0.6);
  // letterbox bars
  if (letterbox > 0.0) { float b = letterbox * 0.5; if (vUv.y < b || vUv.y > 1.0 - b) c = vec3(0.0); }
  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}`;

export const DEFAULT_POST = {
  exposure: 1.0, bloomStr: 0.55, bloomThreshold: 1.0, bloomKnee: 0.6, bloomRadius: 1.0,
  contrast: 1.06, saturation: 1.12, vibrance: 0.15,
  lift: [0, 0, 0], gamma: [1, 1, 1], gain: [1, 1, 1],
  shadowTint: [0.0, 0.0, 0.0], highTint: [0.0, 0.0, 0.0], temp: 0,
  vignette: 0.38, ca: 0.0018, distort: 0.06, grain: 0.035,
  flash: 0, flashCol: [1, 1, 1], fade: 0, fadeCol: [0, 0, 0],
  blurDir: [0, 0], blurAmt: 0, zoomBlur: 0, glitch: 0, mono: 0, scan: 0, nvg: 0,
  letterbox: 0, sharpen: 0.25,
  dof: null, // {focus, aperture, maxR}
};

export class Pipeline {
  constructor(canvas, W, H, opts = {}) {
    this.W = W; this.H = H;
    const r = (this.renderer = new THREE.WebGLRenderer({
      canvas, antialias: false, alpha: false, stencil: false, depth: true,
      preserveDrawingBuffer: true, powerPreference: 'high-performance',
    }));
    r.setPixelRatio(1);
    r.setSize(W, H, false);
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.NoToneMapping;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.shadowMap.autoUpdate = true;
    r.info.autoReset = true;
    const msaa = opts.msaa ?? 4;

    const hf = { type: THREE.HalfFloatType, format: THREE.RGBAFormat, colorSpace: THREE.LinearSRGBColorSpace, depthBuffer: false };
    this.rtScene = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: msaa, depthBuffer: true, colorSpace: THREE.LinearSRGBColorSpace });
    this.rtScene.depthTexture = new THREE.DepthTexture(W, H);
    this.rtScene.depthTexture.type = THREE.UnsignedIntType;
    this.rtAccum = new THREE.WebGLRenderTarget(W, H, hf);
    this.rtDof = new THREE.WebGLRenderTarget(W, H, hf);
    this.mips = [];
    let w = W >> 1, h = H >> 1;
    for (let i = 0; i < 7; i++) {
      this.mips.push(new THREE.WebGLRenderTarget(Math.max(2, w), Math.max(2, h), { ...hf, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter }));
      w >>= 1; h >>= 1;
    }
    this.qPre = new FullScreenQuad(mat(PREFILTER, { tSrc: { value: null }, texel: { value: new THREE.Vector2() }, threshold: { value: 1 }, knee: { value: 0.5 } }));
    this.qDown = new FullScreenQuad(mat(DOWN, { tSrc: { value: null }, texel: { value: new THREE.Vector2() } }));
    this.qUp = new FullScreenQuad(mat(UP, { tSrc: { value: null }, texel: { value: new THREE.Vector2() }, radius: { value: 1 }, weight: { value: 1 } },
      { blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendEquation: THREE.AddEquation, transparent: true }));
    this.qAcc = new FullScreenQuad(mat(ACCUM, { tSrc: { value: null }, weight: { value: 1 } },
      { blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendEquation: THREE.AddEquation, transparent: true }));
    this.qDof = new FullScreenQuad(mat(DOF, {
      tColor: { value: null }, tDepth: { value: null }, cNear: { value: 0.1 }, cFar: { value: 1000 },
      focus: { value: 10 }, aperture: { value: 10 }, maxR: { value: 14 }, px: { value: new THREE.Vector2(1 / W, 1 / H) },
    }));
    const U = {};
    const add = (k, v) => (U[k] = { value: v });
    add('tScene', null); add('tBloom', null); add('tOverlay', null);
    add('res', new THREE.Vector2(W, H)); add('time', 0);
    for (const k of ['exposure', 'bloomStr', 'contrast', 'saturation', 'vibrance', 'temp', 'vignette', 'ca', 'distort', 'grain', 'flash', 'fade',
      'blurAmt', 'glitch', 'mono', 'scan', 'nvg', 'overlayOn', 'letterbox', 'zoomBlur', 'sharpen', 'hide3d']) add(k, 0);
    for (const k of ['lift', 'gammaC', 'gain', 'shadowTint', 'highTint', 'flashCol', 'fadeCol']) add(k, new THREE.Vector3());
    add('blurDir', new THREE.Vector2());
    this.qFinal = new FullScreenQuad(mat(FINAL, U));
    this.U = U;
    this.overlayTex = null;
    this.blackTex = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
    this.blackTex.needsUpdate = true;
  }

  setOverlayCanvas(cv) {
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.NoColorSpace;
    t.premultiplyAlpha = true;
    t.generateMipmaps = false;
    t.minFilter = THREE.LinearFilter;
    t.magFilter = THREE.LinearFilter;
    t.flipY = true;
    this.overlayTex = t;
  }

  // Render one (sub)frame of the 3D scene into the HDR target, accumulating for motion blur.
  renderScene(scene, camera, index, count, preRender) {
    const r = this.renderer;
    if (preRender) preRender(r);
    r.setRenderTarget(this.rtScene);
    r.setClearColor(0x000000, 1);
    r.clear(true, true, false);
    r.render(scene, camera);
    if (count > 1) {
      r.setRenderTarget(this.rtAccum);
      if (index === 0) { r.setClearColor(0x000000, 1); r.clear(true, false, false); }
      this.qAcc.material.uniforms.tSrc.value = this.rtScene.texture;
      this.qAcc.material.uniforms.weight.value = 1 / count;
      this.qAcc.render(r);
    }
  }

  clearScene() {
    const r = this.renderer;
    r.setRenderTarget(this.rtScene);
    r.setClearColor(0x000000, 1);
    r.clear(true, true, false);
  }

  finish(post, camera, count, time, overlayOn, no3D) {
    const r = this.renderer;
    const p = post;
    let src = count > 1 ? this.rtAccum.texture : this.rtScene.texture;
    if (!no3D && p.dof && camera) {
      const u = this.qDof.material.uniforms;
      u.tColor.value = src; u.tDepth.value = this.rtScene.depthTexture;
      u.cNear.value = camera.near; u.cFar.value = camera.far;
      u.focus.value = p.dof.focus; u.aperture.value = p.dof.aperture ?? 8; u.maxR.value = Math.min(p.dof.maxR ?? 12, 18) * (this.H / 1080);
      u.aperture.value *= this.H / 1080;
      r.setRenderTarget(this.rtDof);
      this.qDof.render(r);
      src = this.rtDof.texture;
    }
    // bloom
    const bloomOn = !no3D && p.bloomStr > 0.001;
    if (bloomOn) {
      const pu = this.qPre.material.uniforms;
      pu.tSrc.value = src; pu.texel.value.set(1 / this.W, 1 / this.H);
      pu.threshold.value = p.bloomThreshold; pu.knee.value = p.bloomKnee;
      r.setRenderTarget(this.mips[0]); this.qPre.render(r);
      const du = this.qDown.material.uniforms;
      for (let i = 1; i < this.mips.length; i++) {
        du.tSrc.value = this.mips[i - 1].texture;
        du.texel.value.set(1 / this.mips[i - 1].width, 1 / this.mips[i - 1].height);
        r.setRenderTarget(this.mips[i]); this.qDown.render(r);
      }
      const uu = this.qUp.material.uniforms;
      for (let i = this.mips.length - 1; i > 0; i--) {
        uu.tSrc.value = this.mips[i].texture;
        uu.texel.value.set(1 / this.mips[i].width, 1 / this.mips[i].height);
        uu.radius.value = p.bloomRadius;
        uu.weight.value = 1.0;
        r.setRenderTarget(this.mips[i - 1]); this.qUp.render(r);
      }
    }
    const U = this.U;
    U.tScene.value = src;
    U.tBloom.value = bloomOn ? this.mips[0].texture : this.blackTex;
    U.tOverlay.value = this.overlayTex || this.blackTex;
    U.time.value = time;
    U.exposure.value = p.exposure; U.bloomStr.value = bloomOn ? p.bloomStr * 0.12 : 0;
    U.contrast.value = p.contrast; U.saturation.value = p.saturation; U.vibrance.value = p.vibrance;
    U.temp.value = p.temp; U.vignette.value = p.vignette; U.ca.value = p.ca; U.distort.value = p.distort;
    U.grain.value = p.grain; U.flash.value = p.flash; U.fade.value = p.fade;
    U.blurAmt.value = p.blurAmt; U.glitch.value = p.glitch; U.mono.value = p.mono; U.scan.value = p.scan; U.nvg.value = p.nvg;
    U.overlayOn.value = overlayOn ? 1 : 0; U.letterbox.value = p.letterbox; U.zoomBlur.value = p.zoomBlur; U.sharpen.value = p.sharpen;
    U.hide3d.value = no3D ? 1 : 0;
    U.lift.value.fromArray(p.lift); U.gammaC.value.fromArray(p.gamma); U.gain.value.fromArray(p.gain);
    U.shadowTint.value.fromArray(p.shadowTint); U.highTint.value.fromArray(p.highTint);
    U.flashCol.value.fromArray(p.flashCol); U.fadeCol.value.fromArray(p.fadeCol);
    U.blurDir.value.fromArray(p.blurDir);
    r.setRenderTarget(null);
    this.qFinal.render(r);
  }
}
