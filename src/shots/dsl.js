// Shot-authoring helpers bound to the film and the narration script.
import * as THREE from 'three';
import { chapterCard, timeStamp, locTag, text, W, H } from '../core/overlay.js';
import { camMove, setCam } from '../core/camera.js';
import { clamp, E, lerp } from '../core/util.js';

export function makeDSL(film, S) {
  const D = {};
  D.S = S;
  // shot starting at a phrase (or absolute time). def.dt shifts the cut (default: 0.1s before the words)
  D.shot = (when, def) => {
    const t = typeof when === 'number' ? when : S.at(when);
    def.t0 = t + (def.dt ?? -0.1);
    def.name = def.name || (typeof when === 'string' ? when : 't' + when.toFixed(1));
    if (def.bed) def.sfx = [...(def.sfx || [])];
    film.add(def);
    D.last = def;
    return def;
  };
  D.at = (p, o = 0) => S.at(p, o);
  D.peek = (p, o = 0) => S.peek(p, o);
  D.end = (p, o = 0) => S.end(p, o);
  // chapter card: black frame + typography
  D.card = (when, big, small, o = {}) => D.shot(when, {
    no3D: true, name: 'card ' + big + ' ' + small, dt: o.dt ?? -0.45, in: 'fade', inDur: 0.25,
    overlay: (c, g) => chapterCard(g, c.lt, c.dur, big, small, o),
    sfx: [[0.0, 'cardHit', { big }]], mood: o.mood,
  });
  // overlays spanning arbitrary time
  D.stamp = (t0, dur, hh, mm, o = {}) => film.addOverlay({ t0, t1: t0 + dur, draw: (g, lt, d) => timeStamp(g, lt, d, hh, mm, o.ss ?? 0, o) });
  D.loc = (t0, dur, label, o = {}) => film.addOverlay({ t0, t1: t0 + dur, draw: (g, lt, d) => locTag(g, lt, d, label, o) });
  D.over = (t0, dur, draw) => film.addOverlay({ t0, t1: t0 + dur, draw });
  D.sfx = (when, type, params = {}) => film.addSfx(typeof when === 'number' ? when : S.peek(when), type, params);
  // camera spec in pod-local coordinates (rooms set)
  D.pc = (spec) => (c) => ({ ...spec, p: spec.p.map((q) => c.set.w(q)), l: spec.l ? spec.l.map((q) => c.set.w(q)) : undefined });
  // look-at helper for following objects
  D.follow = (c, obj, off, look, fov = 40, o = {}) => {
    const p = obj.position;
    setCam(c, new THREE.Vector3(p.x + off[0], p.y + off[1], p.z + off[2]), new THREE.Vector3(p.x + (look?.[0] ?? 0), p.y + (look?.[1] ?? 0), p.z + (look?.[2] ?? 0)), fov, o.roll || 0, o);
  };
  // position in an object's local frame -> world
  D.local = (obj, v) => new THREE.Vector3(v[0], v[1], v[2]).applyQuaternion(obj.quaternion).add(obj.position);
  return D;
}

// in-world big typography for 3D shots (top-left kicker like the references)
export function bigWord(g, lt, dur, str, o = {}) {
  const a = Math.min(clamp(lt / 0.35), clamp((dur - lt) / 0.25));
  if (a <= 0) return;
  text(g, str, o.x ?? W / 2, o.y ?? H * 0.5, { size: o.size || 150, weight: o.weight ?? 800, align: o.align || 'center', color: o.color || '#fff', p: clamp(lt / 0.5), blur: 18, rise: 0.15, alpha: a, tracking: o.tracking ?? 0.0, shadow: 'rgba(0,0,0,0.55)', shadowBlur: 40, stagger: 0.4, fam: o.fam });
}
