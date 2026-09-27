import {
  CanvasTexture,
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  RingGeometry,
  ShaderMaterial,
  SRGBColorSpace,
  Vector3,
} from 'three';
import { fitDistance, type SceneFactory } from './engine';
import { disposeTree, glowSprite, textureScale } from './common';

/*
 * BANKY's import review, as the app shows it: a statement read by the bank's own rules (no AI) on the left,
 * the rows waiting for you on the right with a suggested category and how sure it is, a possible duplicate
 * flagged, one row the classifier won't guess. You confirm the clean rows in one click; only those reach the
 * ledger and fill "Spending by category".
 */

const SANS = '"Hanken Grotesk Variable", "Hanken Grotesk", system-ui, sans-serif';
const MONO = '"IBM Plex Mono", ui-monospace, monospace';

// The app's own dark theme, not the site's: the scene should look like BANKY.
const C = {
  panel: '#171b21',
  line: '#2b313b',
  text: '#e7eaef',
  mute: '#8c94a2',
  amber: '#e0a650',
  red: '#f0647c',
  green: '#3ecf8e',
  paper: '#f4f2ed',
  ink: '#1f2b36',
  inkMute: '#76808a',
  bank: '#2f6272',
};
const CATS = {
  food: { color: '#5b93a8', en: 'Food', ro: 'Alimente' },
  health: { color: '#b0708a', en: 'Health', ro: 'Sănătate' },
  util: { color: '#8d8fc4', en: 'Utilities', ro: 'Utilități' },
} as const;
type Cat = keyof typeof CATS;

interface Row {
  date: string;
  who: string;
  amount: number;
  cat?: Cat;
  sub?: { en: string; ro: string };
  /** Confidence, or null when the category came from one of your own rules. */
  conf?: number | null;
  dup?: boolean;
}
const ROWS: Row[] = [
  { date: '02.08', who: 'POS SUPERMARKET AURORA', amount: 312.48, cat: 'food', sub: { en: 'Groceries', ro: 'Supermarket' }, conf: 98 },
  { date: '03.08', who: 'POS CAFENEAUA NORD', amount: 26.5, cat: 'food', sub: { en: 'Cafés', ro: 'Cafenele' }, conf: 97 },
  { date: '04.08', who: 'POS FARMACIA VERDE', amount: 87.2, cat: 'health', sub: { en: 'Pharmacy', ro: 'Farmacie' }, conf: 96 },
  { date: '05.08', who: 'DD RETEA NET FIBRA', amount: 55, cat: 'util', sub: { en: 'Internet', ro: 'Internet' }, conf: null },
  { date: '06.08', who: 'POS PIATA CENTRALA', amount: 96, cat: 'food', sub: { en: 'Fresh market', ro: 'Piață' }, conf: 95 },
  { date: '09.08', who: 'POS SUPERMARKET AURORA', amount: 188.75, cat: 'food', sub: { en: 'Groceries', ro: 'Supermarket' }, conf: 98, dup: true },
  { date: '11.08', who: 'POS COMERCIANT 88213 OR', amount: 58 },
];
const clean = ROWS.map((_, i) => i).filter((i) => ROWS[i].cat && !ROWS[i].dup);
const catOrder: Cat[] = ['food', 'health', 'util'];
const catTotal = (c: Cat) => clean.filter((i) => ROWS[i].cat === c).reduce((s, i) => s + ROWS[i].amount, 0);
const SPENT = clean.reduce((s, i) => s + ROWS[i].amount, 0);

const TX = {
  en: {
    statement: 'Card statement',
    period: '01.08 – 31.08.2026',
    cols: ['Date', 'Description', 'Debit'],
    file: 'statement-2026-08.pdf',
    found: `${ROWS.length} rows found · 1 possible duplicate · read with the bank's rules`,
    confirm: `Confirm ${clean.length} clean rows`,
    suggest: 'Suggest categories',
    unsure: 'not sure — you decide',
    rule: 'your rule',
    dup: 'Possible duplicate',
    chart: 'Spending by category',
    spent: 'Spent this month',
  },
  ro: {
    statement: 'Extras de card',
    period: '01.08 – 31.08.2026',
    cols: ['Data', 'Descriere', 'Debit'],
    file: 'extras-2026-08.pdf',
    found: `${ROWS.length} rânduri găsite · 1 posibilă dublură · citit cu regulile băncii`,
    confirm: `Confirmă ${clean.length} rânduri curate`,
    suggest: 'Sugerează categorii',
    unsure: 'nu e sigur — decizi tu',
    rule: 'regula ta',
    dup: 'Posibilă dublură',
    chart: 'Cheltuieli pe categorii',
    spent: 'Cheltuit luna aceasta',
  },
};

// ── timeline (seconds in one cycle) ───────────────────────────────────
const CYCLE = 13.5;
const readAt = (i: number) => 0.9 + i * 0.68;
const PRESS = readAt(ROWS.length - 1) + 1.05;
const confirmAt = (k: number) => PRESS + 0.45 + k * 0.32;
const FLIGHT = 0.75;
const FADE_AT = CYCLE - 1.3;

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const money = (v: number) => v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ── canvas textures, drawn in design pixels (PX per world unit) ────────
const PX = 300;
const redraws: Array<() => void> = [];

function canvasTex(wu: number, hu: number, paint: (g: CanvasRenderingContext2D, w: number, h: number) => void) {
  const S = textureScale();
  const w = Math.round(wu * PX);
  const h = Math.round(hu * PX);
  const c = document.createElement('canvas');
  c.width = w * S;
  c.height = h * S;
  const g = c.getContext('2d')!;
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 4;
  const draw = () => {
    g.setTransform(S, 0, 0, S, 0, 0);
    g.clearRect(0, 0, w, h);
    paint(g, w, h);
    tex.needsUpdate = true;
  };
  draw();
  redraws.push(draw);
  return { tex, draw };
}

function box(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill?: string, stroke?: string, lw = 2) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
  if (fill) {
    g.fillStyle = fill;
    g.fill();
  }
  if (stroke) {
    g.strokeStyle = stroke;
    g.lineWidth = lw;
    g.stroke();
  }
}

function fit(g: CanvasRenderingContext2D, text: string, weight: number, size: number, family: string, maxW: number) {
  let s = size;
  g.font = `${weight} ${s}px ${family}`;
  while (g.measureText(text).width > maxW && s > size * 0.6) g.font = `${weight} ${--s}px ${family}`;
}

// Statement geometry (design px), shared by the texture and the highlight that walks down it.
const ST_W = 2.0;
const ST_H = 2.6;
const ST_ROW0 = 262;
const ST_PITCH = 60;

// Review panel geometry.
const RV_W = 2.45;
const RV_H = 3.15;
const CARD_W = 2.23;
const CARD_H = 0.34;
const slotY = (i: number) => RV_H / 2 - 0.98 - i * 0.305;

const DASH_W = 1.6;
const DASH_H = 2.0;

const create: SceneFactory = (ctx) => {
  const { scene, camera } = ctx;
  const lang = document.documentElement.lang === 'ro' ? 'ro' : 'en';
  const tx = TX[lang];
  const root = new Group();
  scene.add(root);

  const opaque = (tex: CanvasTexture) => new MeshBasicMaterial({ map: tex, alphaTest: 0.5 });
  const overlay = (tex?: CanvasTexture) => new MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });

  // ── the statement: a text PDF, read line by line by the bank's rules ──
  const statement = new Group();
  const stTex = canvasTex(ST_W, ST_H, (g, w, h) => {
    box(g, 0, 0, w, h, 14, C.paper);
    g.fillStyle = C.bank;
    g.font = `800 30px ${SANS}`;
    g.fillText('BANCA DEMO', 34, 64);
    g.fillStyle = C.inkMute;
    g.font = `500 14px ${SANS}`;
    g.fillText(lang === 'ro' ? 'Exemplu fictiv' : 'Sample bank', 34, 88);
    g.textAlign = 'right';
    g.fillStyle = C.ink;
    g.font = `700 17px ${SANS}`;
    g.fillText(tx.statement.toUpperCase(), w - 34, 58);
    g.fillStyle = C.inkMute;
    g.font = `500 14px ${MONO}`;
    g.fillText(tx.period, w - 34, 82);
    g.textAlign = 'left';
    g.fillStyle = C.bank;
    g.fillRect(34, 110, w - 68, 3);
    // account block
    g.fillStyle = C.inkMute;
    g.font = `500 13px ${MONO}`;
    g.fillText('IBAN  RO00 DEMO 0000 0000 0001', 34, 148);
    g.fillText(lang === 'ro' ? 'Monedă  RON' : 'Currency  RON', 34, 170);
    // table
    g.fillStyle = '#e4e8ea';
    g.fillRect(34, 196, w - 68, 30);
    g.fillStyle = C.bank;
    g.font = `700 13px ${SANS}`;
    g.fillText(tx.cols[0].toUpperCase(), 44, 216);
    g.fillText(tx.cols[1].toUpperCase(), 128, 216);
    g.textAlign = 'right';
    g.fillText(tx.cols[2].toUpperCase(), w - 44, 216);
    ROWS.forEach((r, i) => {
      const y = ST_ROW0 + i * ST_PITCH;
      g.textAlign = 'left';
      g.fillStyle = C.inkMute;
      g.font = `500 15px ${MONO}`;
      g.fillText(r.date, 44, y);
      g.fillStyle = C.ink;
      fit(g, r.who, 600, 15, SANS, 300);
      g.fillText(r.who, 128, y);
      g.textAlign = 'right';
      g.font = `500 15px ${MONO}`;
      g.fillText(money(r.amount).replace('.', ','), w - 44, y);
      g.fillStyle = '#dde2e5';
      g.fillRect(34, y + 24, w - 68, 1.5);
    });
    const total = ROWS.reduce((s, r) => s + r.amount, 0);
    const ty = ST_ROW0 + ROWS.length * ST_PITCH + 14;
    g.textAlign = 'right';
    g.fillStyle = C.ink;
    g.font = `700 15px ${SANS}`;
    g.fillText(`Total  ${money(total).replace('.', ',')}`, w - 44, ty);
    g.textAlign = 'left';
  });
  const sheet = new Mesh(new PlaneGeometry(ST_W, ST_H), opaque(stTex.tex));
  statement.add(sheet);
  const stRowY = (i: number) => ST_H / 2 - (ST_ROW0 + i * ST_PITCH - 6) / PX;

  // the line being read, outlined like the app highlights it
  const hlTex = canvasTex(ST_W - 0.16, 0.19, (g, w, h) => box(g, 3, 3, w - 6, h - 6, 10, 'rgba(224,166,80,0.2)', C.amber, 4));
  const highlight = new Mesh(new PlaneGeometry(ST_W - 0.16, 0.19), overlay(hlTex.tex));
  highlight.position.z = 0.01;
  statement.add(highlight);
  root.add(statement);

  // ── the review list ──
  const review = new Group();
  const rvTex = canvasTex(RV_W, RV_H, (g, w) => {
    box(g, 1, 1, w - 2, RV_H * PX - 2, 22, C.panel, C.line, 2);
    g.fillStyle = C.text;
    fit(g, tx.file, 700, 30, SANS, w - 70);
    g.fillText(tx.file, 34, 62);
    g.fillStyle = C.mute;
    fit(g, tx.found, 500, 17, SANS, w - 70);
    g.fillText(tx.found, 34, 94);
    // the second action, static; "confirm" is its own mesh so it can be pressed
    const bx = 34 + 0.98 * PX + 14;
    box(g, bx, 122, w - bx - 34, 46, 10, undefined, C.line, 2);
    g.fillStyle = C.text;
    fit(g, `✦ ${tx.suggest}`, 500, 17, SANS, w - bx - 60);
    g.fillText(`✦ ${tx.suggest}`, bx + 16, 152);
  });
  const panel = new Mesh(new PlaneGeometry(RV_W, RV_H), opaque(rvTex.tex));
  review.add(panel);

  const btnTex = canvasTex(0.98, 0.155, (g, w, h) => {
    box(g, 2, 2, w - 4, h - 4, 10, 'rgba(224,166,80,0.12)', C.amber, 2.5);
    g.fillStyle = C.text;
    fit(g, tx.confirm, 600, 17, SANS, w - 28);
    g.textAlign = 'center';
    g.fillText(tx.confirm, w / 2, h / 2 + 6);
    g.textAlign = 'left';
  });
  const button = new Mesh(new PlaneGeometry(0.98, 0.155), overlay(btnTex.tex));
  button.position.set(-RV_W / 2 + 0.113 + 0.49, RV_H / 2 - 0.483, 0.01);
  review.add(button);
  const buttonGlow = glowSprite('#e0a650', 1.3, 0);
  buttonGlow.position.copy(button.position);
  buttonGlow.renderOrder = 6;
  review.add(buttonGlow);

  // one card per statement row; the checkbox is separate so it can tick
  const cards = ROWS.map((r) => {
    const t = canvasTex(CARD_W, CARD_H, (g, w, h) => {
      box(g, 2, 2, w - 4, h - 4, 12, '#1d222a', r.dup ? 'rgba(224,166,80,0.75)' : C.line, 2);
      g.fillStyle = C.text;
      fit(g, r.who, 600, 25, SANS, 390);
      g.fillText(r.who, 70, 42);
      g.textAlign = 'right';
      g.fillStyle = C.red;
      g.font = `500 25px ${MONO}`;
      g.fillText(`-${money(r.amount)}`, w - 22, 42);
      g.textAlign = 'left';
      g.font = `500 19px ${SANS}`;
      if (r.cat && r.sub) {
        const cat = CATS[r.cat];
        g.fillStyle = cat.color;
        g.beginPath();
        g.arc(78, 73, 6, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = C.mute;
        const label = `${cat[lang]} → ${r.sub[lang]}`;
        g.fillText(label, 94, 80);
        const lw = g.measureText(label).width;
        g.fillStyle = C.green;
        g.font = `500 17px ${MONO}`;
        g.fillText(r.conf == null ? tx.rule : `${r.conf}%`, 94 + lw + 14, 80);
      } else {
        g.fillStyle = C.mute;
        g.font = `italic 500 19px ${SANS}`;
        g.fillText(tx.unsure, 70, 80);
      }
      if (r.dup) {
        g.textAlign = 'right';
        g.fillStyle = C.amber;
        g.font = `600 17px ${SANS}`;
        g.fillText(`⚠ ${tx.dup}`, w - 22, 80);
        g.textAlign = 'left';
      }
    });
    const mat = overlay(t.tex);
    const mesh = new Mesh(new PlaneGeometry(CARD_W, CARD_H), mat);
    mesh.renderOrder = 2;
    review.add(mesh);
    return { mesh, mat };
  });
  const boxOff = canvasTex(0.1, 0.1, (g, w, h) => box(g, 3, 3, w - 6, h - 6, 5, undefined, '#5b6472', 3));
  const boxOn = canvasTex(0.1, 0.1, (g, w, h) => {
    box(g, 2, 2, w - 4, h - 4, 5, C.green);
    g.strokeStyle = '#0d1a14';
    g.lineWidth = 4;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.beginPath();
    g.moveTo(w * 0.26, h * 0.52);
    g.lineTo(w * 0.44, h * 0.7);
    g.lineTo(w * 0.76, h * 0.32);
    g.stroke();
  });
  const checks = ROWS.map(() => {
    const off = new Mesh(new PlaneGeometry(0.1, 0.1), overlay(boxOff.tex));
    const on = new Mesh(new PlaneGeometry(0.1, 0.1), overlay(boxOn.tex));
    off.renderOrder = on.renderOrder = 3;
    review.add(off, on);
    return { off, on };
  });
  root.add(review);

  // ── the dashboard: only confirmed rows reach it ──
  const dash = new Group();
  const dashTex = canvasTex(DASH_W, DASH_H, (g, w, h) => {
    box(g, 1, 1, w - 2, h - 2, 22, C.panel, C.line, 2);
    g.fillStyle = C.text;
    fit(g, tx.chart, 600, 24, SANS, w - 56);
    g.fillText(tx.chart, 28, 50);
    g.fillStyle = C.mute;
    g.font = `500 15px ${MONO}`;
    g.fillText('RON', 28, 74);
  });
  dash.add(new Mesh(new PlaneGeometry(DASH_W, DASH_H), opaque(dashTex.tex)));

  // the donut fills each category's arc as its rows arrive
  const bounds: number[] = [];
  catOrder.reduce((acc, c) => (bounds.push(acc + catTotal(c) / SPENT), acc + catTotal(c) / SPENT), 0);
  const donutMat = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uFill: { value: new Vector3() },
      uEnds: { value: new Vector3(...bounds) },
      uC0: { value: new Color(CATS.food.color) },
      uC1: { value: new Color(CATS.health.color) },
      uC2: { value: new Color(CATS.util.color) },
      uTrack: { value: new Color('#252b34') },
      uAlpha: { value: 1 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vPos;
      void main() {
        vPos = position.xy;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uFill, uEnds, uC0, uC1, uC2, uTrack;
      uniform float uAlpha;
      varying vec2 vPos;
      void main() {
        float a = atan(vPos.x, vPos.y) / 6.28318530718;
        a = a < 0.0 ? a + 1.0 : a;
        float s0 = 0.0, s1 = uEnds.x, s2 = uEnds.y;
        vec3 col; float start, end, fill;
        if (a < s1) { col = uC0; start = s0; end = s1; fill = uFill.x; }
        else if (a < s2) { col = uC1; start = s1; end = s2; fill = uFill.y; }
        else { col = uC2; start = s2; end = uEnds.z; fill = uFill.z; }
        float gap = 0.006;
        bool lit = a < start + (end - start) * fill && a > start + gap * 0.5 && a < end - gap * 0.5;
        gl_FragColor = lit ? vec4(col, uAlpha) : vec4(uTrack, 0.9);
        #include <colorspace_fragment>
      }`,
  });
  const donut = new Mesh(new RingGeometry(0.33, 0.5, 128, 1), donutMat);
  donut.position.set(0, 0.25, 0.01);
  donut.renderOrder = 4;
  dash.add(donut);

  let shownSpent = '';
  let spentNow = 0;
  const counter = canvasTex(1.4, 0.34, (g, w) => {
    g.fillStyle = C.mute;
    g.font = `600 15px ${SANS}`;
    g.textAlign = 'center';
    g.fillText(tx.spent.toUpperCase(), w / 2, 28);
    g.fillStyle = C.red;
    g.font = `500 34px ${MONO}`;
    g.fillText(`${money(spentNow)} RON`, w / 2, 76);
    g.textAlign = 'left';
  });
  const counterMesh = new Mesh(new PlaneGeometry(1.4, 0.34), overlay(counter.tex));
  counterMesh.position.set(0, -0.5, 0.01);
  counterMesh.renderOrder = 4;
  dash.add(counterMesh);

  const legendTex = canvasTex(1.44, 0.2, (g) => {
    let x = 10;
    g.font = `500 16px ${SANS}`;
    for (const c of catOrder) {
      const text = `${CATS[c][lang]} ${Math.round((catTotal(c) / SPENT) * 100)}%`;
      g.fillStyle = CATS[c].color;
      g.beginPath();
      g.arc(x + 6, 32, 6, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = C.mute;
      g.fillText(text, x + 18, 38);
      x += 18 + g.measureText(text).width + 18;
    }
  });
  const legend = new Mesh(new PlaneGeometry(1.44, 0.2), overlay(legendTex.tex));
  legend.position.set(0, -0.8, 0.01);
  legend.renderOrder = 4;
  dash.add(legend);
  root.add(dash);

  // a dot per confirmed row, flying from its card into the chart
  const dots = clean.map((i) => {
    const s = glowSprite(CATS[ROWS[i].cat!].color, 0.42, 0);
    s.renderOrder = 8;
    s.material.depthTest = false;
    root.add(s);
    return s;
  });

  // Once the web fonts have loaded, draw every texture again with them.
  Promise.all([document.fonts.load(`600 25px ${SANS}`), document.fonts.load(`500 25px ${MONO}`)])
    .then(() => redraws.forEach((d) => d()))
    .catch(() => {});

  // ── layout: side by side on wide stages, layered on narrow ones ──
  const WIDE = {
    st: [-2.6, -0.05, -0.35, 0.3, 1],
    rv: [0.02, 0, 0, 0, 1],
    da: [2.5, 0.25, 0.25, -0.28, 1],
    half: [3.5, 1.72],
  };
  const NARROW = {
    st: [-1.1, 0.35, -1.0, 0.3, 0.85],
    rv: [0.25, -0.12, 0, 0, 1],
    da: [1.22, 1.32, 0.65, -0.12, 0.6],
    half: [1.98, 1.98],
  };
  const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
  const place = (grp: Group, a: number[], b: number[], k: number) => {
    grp.position.set(lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k));
    grp.rotation.y = lerp(a[3], b[3], k);
    grp.scale.setScalar(lerp(a[4], b[4], k));
  };
  let baseZ = 9;

  const from = new Vector3();
  const to = new Vector3();
  const donutWorld = new Vector3();
  const tmp = new Vector3();
  const green = new Color(C.green);
  const white = new Color('#ffffff');

  return {
    resize(w, h) {
      const k = 1 - smooth(0.95, 1.45, w / h);
      place(statement, WIDE.st, NARROW.st, k);
      place(review, WIDE.rv, NARROW.rv, k);
      place(dash, WIDE.da, NARROW.da, k);
      baseZ = fitDistance(camera, lerp(WIDE.half[0], NARROW.half[0], k), lerp(WIDE.half[1], NARROW.half[1], k));
      root.updateMatrixWorld(true);
    },
    update(t) {
      const tc = t % CYCLE;
      const out = 1 - smooth(FADE_AT, FADE_AT + 0.7, tc);

      // the highlight walks the statement, one line per row
      let hy = stRowY(0);
      for (let i = 1; i < ROWS.length; i++) {
        const k = smooth(readAt(i) - 0.22, readAt(i), tc);
        if (k > 0) hy = stRowY(i - 1) + (stRowY(i) - stRowY(i - 1)) * k;
      }
      highlight.position.y = hy;
      const hlOn = smooth(readAt(0) - 0.4, readAt(0) - 0.1, tc) * (1 - smooth(PRESS - 0.6, PRESS - 0.2, tc));
      (highlight.material as MeshBasicMaterial).opacity = hlOn;

      // each row lifts off the page and lands in the review list
      root.updateMatrixWorld(true);
      review.updateMatrixWorld(true);
      ROWS.forEach((_, i) => {
        const { mesh, mat } = cards[i];
        const u = smooth(readAt(i), readAt(i) + 0.62, tc);
        statement.localToWorld(from.set(0.15, stRowY(i), 0.02));
        review.worldToLocal(from);
        to.set(0, slotY(i), 0.02);
        mesh.position.lerpVectors(from, to, u);
        mesh.position.z += Math.sin(u * Math.PI) * 0.55;
        mesh.scale.setScalar(0.72 + 0.28 * u);
        mat.opacity = smooth(readAt(i), readAt(i) + 0.15, tc) * out;

        const c = checks[i];
        const sc = mesh.scale.x;
        c.off.position.set(mesh.position.x + (-CARD_W / 2 + 0.12) * sc, mesh.position.y + 0.05 * sc, mesh.position.z + 0.005);
        c.on.position.copy(c.off.position);
        c.off.scale.setScalar(mesh.scale.x);
        c.on.scale.setScalar(mesh.scale.x);
        const k = clean.indexOf(i);
        const ticked = k >= 0 ? smooth(confirmAt(k), confirmAt(k) + 0.15, tc) : 0;
        (c.off.material as MeshBasicMaterial).opacity = mat.opacity * (1 - ticked);
        (c.on.material as MeshBasicMaterial).opacity = mat.opacity * ticked;
        // a green flash along the card as it is confirmed
        const flash = k >= 0 ? smooth(confirmAt(k), confirmAt(k) + 0.1, tc) * (1 - smooth(confirmAt(k) + 0.2, confirmAt(k) + 0.7, tc)) : 0;
        mat.color.lerpColors(white, green, flash * 0.35);
      });

      // one click confirms the clean rows; the duplicate and the unsure row keep waiting for you
      const press = smooth(PRESS - 0.25, PRESS, tc) * (1 - smooth(PRESS + 0.05, PRESS + 0.35, tc));
      button.scale.setScalar(1 - press * 0.07);
      buttonGlow.material.opacity = press * 0.9 + 0.12 * (1 - smooth(PRESS, PRESS + 1, tc)) * smooth(PRESS - 1.2, PRESS - 0.4, tc);

      // confirmed rows travel to the chart
      dash.localToWorld(donutWorld.copy(donut.position));
      const fill = { food: 0, health: 0, util: 0 };
      let spent = 0;
      clean.forEach((i, k) => {
        const dot = dots[k];
        const s = confirmAt(k) + 0.12;
        const u = smooth(s, s + FLIGHT, tc);
        cards[i].mesh.getWorldPosition(tmp);
        tmp.x += 0.7;
        dot.position.lerpVectors(tmp, donutWorld, u);
        dot.position.y += Math.sin(u * Math.PI) * 0.45;
        dot.position.z += 0.4;
        dot.material.opacity = (u > 0 && u < 1 ? 1 : 0) * out;
        const arrived = smooth(s + FLIGHT - 0.05, s + FLIGHT + 0.35, tc);
        const r = ROWS[i];
        fill[r.cat!] += (r.amount / catTotal(r.cat!)) * arrived;
        spent += r.amount * arrived;
      });
      donutMat.uniforms.uFill.value.set(fill.food * out, fill.health * out, fill.util * out);
      spentNow = spent * out;
      const label = money(spentNow);
      if (label !== shownSpent) {
        shownSpent = label;
        counter.draw();
      }
      (legend.material as MeshBasicMaterial).opacity = smooth(confirmAt(0) + 0.5, confirmAt(clean.length - 1) + 1.2, tc) * out;

      const { pointer } = ctx;
      root.rotation.y = pointer.x * 0.16 + Math.sin(t * 0.22) * 0.05;
      root.rotation.x = -pointer.y * 0.07 + Math.sin(t * 0.17) * 0.015;
      camera.position.set(0, 0.05, baseZ);
      camera.lookAt(0, 0, 0);
    },
    dispose() {
      redraws.length = 0;
      disposeTree(scene);
    },
  };
};

export default create;
