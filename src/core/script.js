// Phrase anchors: shots are bound to the narration by searching the word-level
// timings of the JSON scenario, so every cut lands exactly on the spoken words.

const norm = (w) => w.toLowerCase().trim().replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '');

export class Script {
  constructor(json) {
    this.words = [];
    for (const s of json.segments) {
      for (const w of s.words || []) {
        const n = norm(w.word);
        if (!n) continue;
        this.words.push({ w: n, s: w.start, e: w.end });
      }
    }
    this.cursor = 0;
    this.duration = json.segments[json.segments.length - 1].end;
    this.misses = [];
  }

  _find(phrase, from) {
    const p = phrase.split(/\s+/).map(norm).filter(Boolean);
    const W = this.words;
    for (let i = from; i <= W.length - p.length; i++) {
      let ok = true;
      for (let k = 0; k < p.length; k++) if (W[i + k].w !== p[k]) { ok = false; break; }
      if (ok) return { i, j: i + p.length - 1 };
    }
    return null;
  }

  // start time (s) of phrase, searching forward from the cursor. Advances the cursor.
  at(phrase, offset = 0) {
    const r = this._find(phrase, this.cursor);
    if (!r) {
      this.misses.push(phrase);
      console.warn('[script] phrase not found:', phrase);
      const last = this.words[Math.min(this.cursor, this.words.length - 1)];
      return last.s + offset;
    }
    this.cursor = r.i;
    this.last = r;
    return this.words[r.i].s + offset;
  }
  // end time of phrase (search from cursor, does not move it past start)
  end(phrase, offset = 0) {
    const r = this._find(phrase, this.cursor);
    if (!r) { this.misses.push(phrase); console.warn('[script] phrase not found (end):', phrase); return this.words[this.cursor].e; }
    return this.words[r.j].e + offset;
  }
  // start time of phrase without moving the cursor (lookahead)
  peek(phrase, offset = 0) {
    const r = this._find(phrase, this.cursor);
    if (!r) { this.misses.push(phrase); console.warn('[script] phrase not found (peek):', phrase); return this.words[this.cursor].s; }
    return this.words[r.i].s + offset;
  }
  // word-level times inside a phrase (for beat-synced animation)
  wordsOf(phrase) {
    const r = this._find(phrase, this.cursor);
    if (!r) return [];
    return this.words.slice(r.i, r.j + 1).map((x) => ({ ...x }));
  }
}
