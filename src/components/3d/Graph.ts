import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  PlaneGeometry,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  Vector3,
} from 'three';
import { fitDistance, type SceneFactory } from './engine';
import { disposeTree, glowSprite, makeLabel, type LabelStyle } from './common';
import { ATHENA_PROFILE, SHIELD_RINGS, meanderPath } from './athena-emblem';

/**
 * ATHENA as an OSINT investigation board. Everything happens at once, staggered:
 * collectors keep sending pulses to the identifiers they handle, and every finding card runs its own
 * ~6 s cycle (pending → stamped CONFIRMED / REJECTED → flies into the report, or fades),
 * each with a different offset, so any glance shows the whole workflow.
 * All names, values and numbers are invented (example.com, 203.0.113.0/24 documentation range).
 */

type IdKey = 'email' | 'domain' | 'username' | 'ip' | 'phone' | 'image';
type ColKey = 'whois' | 'dns' | 'web' | 'platforms' | 'breach' | 'imagematch';
type FindKey = 'whois' | 'dns' | 'breach' | 'github' | 'image' | 'web' | 'forum';
type XY = [number, number];

const VALUES: Record<IdKey, string> = {
  email: 'office@example.com',
  domain: 'examplelogistics.example',
  username: 'examplelogistics',
  ip: '203.0.113.57',
  phone: '+40 7•• ••• •••',
  image: 'depot.jpg',
};
const ID_COLOR: Record<IdKey, string> = {
  email: '#8be9ff',
  domain: '#a5b4fc',
  username: '#c4b5fd',
  ip: '#7dd3fc',
  phone: '#99f6e4',
  image: '#f9a8d4',
};

const TEXT = {
  en: {
    ids: { email: 'email', domain: 'domain', username: 'username', ip: 'IP', phone: 'phone', image: 'image' } as Record<IdKey, string>,
    cols: {
      whois: 'WHOIS',
      dns: 'DNS',
      web: 'Web search',
      platforms: '52 platforms',
      breach: 'Breach check',
      imagematch: 'Image match',
    } as Record<ColKey, string>,
    find: {
      whois: 'WHOIS',
      dns: 'DNS',
      breach: 'Breach',
      github: 'GitHub profile',
      image: 'Image',
      web: 'Web',
      forum: 'Forum',
    } as Record<FindKey, string>,
    subjectTag: 'SUBJECT',
    dd: 'Due diligence',
    pending: '● pending',
    confirmed: '✓ CONFIRMED',
    rejected: '✕ REJECTED',
    report: 'PDF report',
    page: 'p.',
    person: 'person',
    worksFor: 'works for',
    depot: 'Depot · Str. Exemplului',
    comma: false,
  },
  ro: {
    ids: { email: 'e-mail', domain: 'domeniu', username: 'utilizator', ip: 'IP', phone: 'telefon', image: 'imagine' } as Record<IdKey, string>,
    cols: {
      whois: 'WHOIS',
      dns: 'DNS',
      web: 'Căutare web',
      platforms: '52 platforme',
      breach: 'Verificare breșe',
      imagematch: 'Potrivire imagine',
    } as Record<ColKey, string>,
    find: {
      whois: 'WHOIS',
      dns: 'DNS',
      breach: 'Breșă',
      github: 'Profil GitHub',
      image: 'Imagine',
      web: 'Web',
      forum: 'Forum',
    } as Record<FindKey, string>,
    subjectTag: 'SUBIECT',
    dd: 'Verificare prealabilă',
    pending: '● în verificare',
    confirmed: '✓ CONFIRMAT',
    rejected: '✕ RESPINS',
    report: 'Raport PDF',
    page: 'p.',
    person: 'persoană',
    worksFor: 'lucrează la',
    depot: 'Depozit · Str. Exemplului',
    comma: true,
  },
};

const FINDINGS: Record<FindKey, { id: IdKey; conf: number; ok: boolean }> = {
  whois: { id: 'domain', conf: 0.9, ok: true },
  dns: { id: 'ip', conf: 0.85, ok: true },
  breach: { id: 'email', conf: 0.95, ok: true },
  github: { id: 'username', conf: 0.8, ok: true },
  image: { id: 'image', conf: 0.6, ok: true },
  web: { id: 'email', conf: 0.45, ok: false },
  forum: { id: 'username', conf: 0.35, ok: false },
};

interface Layout {
  chipH: number;
  colH: number;
  cardH: number;
  ids: Partial<Record<IdKey, XY>>;
  cols: Partial<Record<ColKey, XY>>;
  links: [ColKey, IdKey][];
  /** In the order they appear: each one's cycle starts P / n after the previous one. */
  findings: [FindKey, XY, IdKey?][];
  subject: XY;
  person: XY;
  edge: XY;
  report: [number, number, number];
  map: [number, number, number];
  mapLabel: XY;
}

/** Desktop: six identifiers, six collectors, seven findings, framed at about ±3.4 × ±2.6. */
const FULL: Layout = {
  chipH: 0.26,
  colH: 0.22,
  cardH: 0.4,
  ids: { email: [-2.0, 1.2], domain: [2.0, 1.2], username: [-2.15, 0.05], ip: [2.15, 0.05], phone: [-2.0, -1.1], image: [2.0, -1.1] },
  cols: { breach: [-2.5, 2.2], web: [-0.95, 2.2], whois: [0.95, 2.2], dns: [2.5, 2.2], platforms: [-2.5, -2.25], imagematch: [2.6, -2.3] },
  links: [
    ['whois', 'domain'],
    ['whois', 'ip'],
    ['dns', 'domain'],
    ['dns', 'ip'],
    ['web', 'username'],
    ['web', 'email'],
    ['platforms', 'username'],
    ['breach', 'email'],
    ['imagematch', 'image'],
  ],
  findings: [
    ['whois', [2.3, 1.72]],
    ['breach', [-2.3, 1.72]],
    ['dns', [2.3, 0.62]],
    ['github', [-2.3, -0.52]],
    ['image', [2.3, -0.52]],
    ['web', [-2.3, 0.62]],
    ['forum', [-2.3, -1.65]],
  ],
  subject: [0, 0.05],
  person: [0, 1.5],
  edge: [0, 0.95],
  report: [-0.05, -1.85, 1.45],
  map: [1.5, -1.9, 0.95],
  mapLabel: [1.5, -2.3],
};

/** Phones and small CPUs: four identifiers, four collectors, four findings, bigger chips. */
const LITE: Layout = {
  chipH: 0.3,
  colH: 0.24,
  cardH: 0.42,
  ids: { email: [-1.45, 1.3], domain: [1.4, 1.3], username: [-1.45, -0.95], image: [1.45, -0.95] },
  cols: { breach: [-1.6, 2.2], whois: [1.6, 2.2], web: [-1.8, -2.3], imagematch: [1.9, -2.3] },
  links: [
    ['whois', 'domain'],
    ['web', 'username'],
    ['web', 'email'],
    ['breach', 'email'],
    ['imagematch', 'image'],
  ],
  findings: [
    ['whois', [1.75, 0.62]],
    ['breach', [-1.75, 0.62]],
    ['image', [1.75, -0.55]],
    ['web', [-1.75, -0.55], 'username'],
  ],
  subject: [0, 0.05],
  person: [0, 2.2],
  edge: [0, 0.85],
  report: [0, -1.72, 1.45],
  map: [1.85, -1.75, 0.8],
  mapLabel: [1.85, -1.38],
};

const P = 6; // one finding's cycle, in seconds
const POP = 0.35;
const STAMP = 2.3;
const FLY = 3.6;
const LAND = 4.6;
const FADE = 3.3;
const GONE = 4.3;

const AMBER = '#fbbf24';
const GREEN = '#4ade80';
const RED = '#f87171';
const SANS = '"Hanken Grotesk Variable", "Hanken Grotesk", system-ui, sans-serif';
const MONO = '"IBM Plex Mono", ui-monospace, monospace';

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Athena's shield drawn once to a canvas: either its rim (rings + Greek key) or the goddess emblem. */
function shieldTexture(size: number, part: 'rim' | 'emblem'): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  const k = size / 200;
  g.scale(k, k);
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.shadowBlur = 10 * k;
  if (part === 'rim') {
    g.strokeStyle = '#818cf8';
    g.shadowColor = '#818cf8';
    for (const [r, w] of SHIELD_RINGS) {
      g.lineWidth = 1.1 * w;
      g.beginPath();
      g.arc(100, 100, r, 0, Math.PI * 2);
      g.stroke();
    }
    g.lineWidth = 0.9;
    g.stroke(new Path2D(meanderPath(100, 100, 78, 92, 28)));
  } else {
    g.strokeStyle = '#c7d2fe';
    g.shadowColor = '#818cf8';
    g.lineWidth = 1.5;
    g.translate(100, 100);
    g.scale(0.66, 0.66);
    g.translate(-97, -106);
    for (const d of ATHENA_PROFILE) g.stroke(new Path2D(d));
  }
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

/** A canvas, its texture, and a draw function that can be re-run (once the web fonts have loaded). */
function canvasTex(w: number, h: number, paint: (g: CanvasRenderingContext2D) => void) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  const draw = () => {
    g.clearRect(0, 0, w, h);
    paint(g);
    tex.needsUpdate = true;
  };
  draw();
  return { tex, draw };
}

/** Largest font size (down to 60 %) at which the text fits in maxW. */
function fitFont(g: CanvasRenderingContext2D, text: string, weight: number, size: number, family: string, maxW: number) {
  let s = size;
  g.font = `${weight} ${s}px ${family}`;
  while (g.measureText(text).width > maxW && s > size * 0.6) {
    s -= 1;
    g.font = `${weight} ${s}px ${family}`;
  }
  return s;
}

const scratch = document.createElement('canvas').getContext('2d')!;
const measure = (text: string, font: string) => {
  scratch.font = font;
  return scratch.measureText(text).width;
};

function sprite(tex: CanvasTexture, order: number) {
  const s = new Sprite(new SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false }));
  s.renderOrder = order;
  return s;
}

/**
 * An identifier chip: a coloured type tag and its value. It is as wide as its text, which makeLabel's fixed
 * 512 px canvas cannot be ("domain · examplelogistics.example" would be clipped there).
 */
function tagChip(tag: string, value: string, accent: string, h: number) {
  const H = 96;
  const tagFont = `600 32px ${SANS}`;
  const valFont = `500 44px ${SANS}`;
  const tagW = tag ? measure(tag, tagFont) + 28 : 0;
  const W = Math.ceil(14 + tagW + (tag ? 14 : 12) + measure(value, valFont) + 26);
  const { tex, draw } = canvasTex(W, H, (g) => {
    g.fillStyle = 'rgba(9,14,32,0.92)';
    g.beginPath();
    g.roundRect(3, 6, W - 6, H - 12, 22);
    g.fill();
    g.strokeStyle = accent;
    g.globalAlpha = 0.75;
    g.lineWidth = 3;
    g.stroke();
    g.globalAlpha = 1;
    g.textBaseline = 'middle';
    let x = 14;
    if (tag) {
      g.fillStyle = accent + '2e';
      g.beginPath();
      g.roundRect(x, 18, tagW, H - 36, 14);
      g.fill();
      g.fillStyle = accent;
      g.font = tagFont;
      g.fillText(tag, x + 14, H / 2 + 1);
      x += tagW + 14;
    } else x += 12;
    g.fillStyle = '#eef2ff';
    g.font = valFont;
    g.fillText(value, x, H / 2 + 1);
  });
  const s = sprite(tex, 4);
  s.scale.set((h * W) / H, h, 1);
  return { sprite: s, draw };
}

/** A finding card: source · confidence, and either "pending" or the analyst's stamp. */
function findingCard(src: string, conf: string, state: 'pending' | 'ok' | 'no', word: string, h: number) {
  const W = 440;
  const H = 140;
  const color = state === 'pending' ? AMBER : state === 'ok' ? GREEN : RED;
  const { tex, draw } = canvasTex(W, H, (g) => {
    g.fillStyle = 'rgba(12,17,34,0.95)';
    g.beginPath();
    g.roundRect(3, 3, W - 6, H - 6, 16);
    g.fill();
    g.strokeStyle = color;
    g.lineWidth = 4;
    g.stroke();
    g.fillStyle = color;
    g.fillRect(3, 20, 8, H - 40);
    g.textBaseline = 'middle';
    // row 1: source · confidence
    const confW = measure(` · ${conf}`, `500 38px ${MONO}`);
    const size = fitFont(g, src, 600, 44, SANS, W - 48 - confW);
    g.font = `600 ${size}px ${SANS}`;
    g.fillStyle = '#f1f5ff';
    g.fillText(src, 26, 44);
    const sw = g.measureText(src).width;
    g.font = `500 38px ${MONO}`;
    g.fillStyle = '#c7d2fe';
    g.fillText(` · ${conf}`, 26 + sw, 45);
    // row 2: pending, or a rubber stamp
    if (state === 'pending') {
      g.font = `600 32px ${SANS}`;
      g.fillStyle = AMBER;
      g.fillText(word, 26, 102);
    } else {
      g.save();
      g.translate(30, 102);
      g.rotate(-0.06);
      g.font = `800 34px ${SANS}`;
      const ww = g.measureText(word).width;
      g.strokeStyle = color;
      g.lineWidth = 4;
      g.fillStyle = color + '26';
      g.beginPath();
      g.roundRect(-8, -24, ww + 22, 48, 6);
      g.fill();
      g.stroke();
      g.fillStyle = color;
      g.fillText(word, 3, 2);
      g.restore();
    }
  });
  const s = sprite(tex, 6);
  s.scale.set((h * W) / H, h, 1);
  return { sprite: s, draw };
}

/** The subject of the investigation: silhouette avatar, company name, case reference. */
function subjectCard(tag: string, dd: string, w: number) {
  const W = 600;
  const H = 236;
  const { tex, draw } = canvasTex(W, H, (g) => {
    g.fillStyle = 'rgba(12,18,40,0.9)';
    g.beginPath();
    g.roundRect(4, 4, W - 8, H - 8, 22);
    g.fill();
    g.strokeStyle = '#818cf8';
    g.lineWidth = 4;
    g.stroke();
    // avatar
    g.save();
    g.beginPath();
    g.arc(106, 118, 72, 0, Math.PI * 2);
    g.fillStyle = '#1c2552';
    g.fill();
    g.clip();
    g.fillStyle = '#8b95d6';
    g.beginPath();
    g.arc(106, 98, 30, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.ellipse(106, 186, 56, 50, 0, Math.PI, 0);
    g.fill();
    g.restore();
    g.strokeStyle = '#a5b4fc';
    g.lineWidth = 3;
    g.beginPath();
    g.arc(106, 118, 72, 0, Math.PI * 2);
    g.stroke();
    // text
    g.textBaseline = 'middle';
    g.fillStyle = '#a5b4fc';
    g.font = `700 22px ${MONO}`;
    g.fillText(tag, 206, 46);
    const size = fitFont(g, 'Example Logistics SRL', 700, 46, SANS, W - 226);
    g.font = `700 ${size}px ${SANS}`;
    g.fillStyle = '#ffffff';
    g.fillText('Example Logistics SRL', 204, 94);
    const s2 = fitFont(g, dd, 600, 32, SANS, W - 226);
    g.font = `600 ${s2}px ${SANS}`;
    g.fillStyle = '#c7d2fe';
    g.fillText(dd, 206, 142);
    g.font = `500 28px ${MONO}`;
    g.fillStyle = '#8b95c9';
    g.fillText('ATH-2026-0142', 206, 184);
  });
  const mesh = new Mesh(
    new PlaneGeometry(w, (w * H) / W),
    new MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false }),
  );
  mesh.renderOrder = 3;
  return { mesh, draw };
}

/** A small street map with the depot's pin. */
function mapTile(w: number) {
  const W = 320;
  const H = 230;
  const { tex, draw } = canvasTex(W, H, (g) => {
    g.save();
    g.beginPath();
    g.roundRect(3, 3, W - 6, H - 6, 14);
    g.fillStyle = '#0e1a33';
    g.fill();
    g.clip();
    // a river, blocks of streets and one avenue
    g.strokeStyle = '#17345c';
    g.lineWidth = 18;
    g.beginPath();
    g.moveTo(-10, 190);
    g.bezierCurveTo(90, 150, 170, 230, 330, 170);
    g.stroke();
    g.strokeStyle = '#2c3d6e';
    g.lineWidth = 4;
    for (const x of [40, 104, 176, 250]) {
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x + 18, H);
      g.stroke();
    }
    for (const y of [36, 92, 142]) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(W, y - 10);
      g.stroke();
    }
    g.strokeStyle = '#4b5d99';
    g.lineWidth = 9;
    g.beginPath();
    g.moveTo(0, 20);
    g.lineTo(W, 150);
    g.stroke();
    g.restore();
    g.strokeStyle = 'rgba(249,168,212,0.8)';
    g.lineWidth = 4;
    g.beginPath();
    g.roundRect(3, 3, W - 6, H - 6, 14);
    g.stroke();
    // pin
    const px = 190;
    const py = 96;
    g.fillStyle = 'rgba(0,0,0,0.35)';
    g.beginPath();
    g.ellipse(px, py + 4, 14, 5, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#f43f5e';
    g.beginPath();
    g.moveTo(px, py);
    g.bezierCurveTo(px - 8, py - 16, px - 22, py - 28, px - 22, py - 44);
    g.arc(px, py - 44, 22, Math.PI, 0);
    g.bezierCurveTo(px + 22, py - 28, px + 8, py - 16, px, py);
    g.fill();
    g.fillStyle = '#fff';
    g.beginPath();
    g.arc(px, py - 44, 8, 0, Math.PI * 2);
    g.fill();
  });
  const h = (w * H) / W;
  const mesh = new Mesh(new PlaneGeometry(w, h), new MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false }));
  mesh.renderOrder = 3;
  // where the pin's point is, relative to the tile's centre
  const pin: XY = [(190 / W - 0.5) * w, (0.5 - 96 / H) * h];
  return { mesh, draw, pin, h };
}

/** The PDF report: every confirmed finding is added at the bottom, and the oldest line scrolls off. */
function reportCard(title: string, pageWord: string, w: number, MAX: number) {
  const W = 420;
  const H = 130 + MAX * 46;
  const lines: { text: string; tag: string }[] = [];
  let count = 0;
  const { tex, draw } = canvasTex(W, H, (g) => {
    g.fillStyle = 'rgba(236,242,255,0.97)';
    g.beginPath();
    g.roundRect(4, 4, W - 8, H - 8, 16);
    g.fill();
    // PDF badge
    g.fillStyle = '#dc2626';
    g.beginPath();
    g.roundRect(26, 24, 62, 62, 8);
    g.fill();
    g.fillStyle = '#fff';
    g.font = `800 22px ${SANS}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('PDF', 57, 56);
    g.textAlign = 'left';
    g.fillStyle = '#0a1426';
    g.font = `700 36px ${SANS}`;
    g.fillText(title, 104, 42);
    g.font = `500 21px ${MONO}`;
    g.fillStyle = '#56647f';
    g.fillText(`ATH-2026-0142 · ${pageWord} ${1 + (Math.floor(count / MAX) % 3)}`, 104, 74);
    g.fillStyle = '#0a1426';
    g.fillRect(26, 104, W - 52, 3);
    lines.forEach((l, i) => {
      const y = 142 + i * 46;
      const last = i === lines.length - 1;
      if (last) {
        g.fillStyle = 'rgba(34,197,94,0.18)';
        g.fillRect(18, y - 21, W - 36, 42);
      }
      g.fillStyle = '#16a34a';
      g.font = `800 28px ${SANS}`;
      g.fillText('✓', 28, y);
      // the identifier's type goes at the right, unless the finding's own text needs the room
      g.font = `500 21px ${MONO}`;
      let tagW = g.measureText(l.tag).width;
      if (measure(l.text, `600 30px ${SANS}`) > W - 100 - tagW) tagW = 0;
      else {
        g.fillStyle = '#6b7896';
        g.fillText(l.tag, W - 28 - tagW, y + 1);
      }
      const size = fitFont(g, l.text, 600, 30, SANS, W - 100 - tagW);
      g.font = `600 ${size}px ${SANS}`;
      g.fillStyle = '#0a1426';
      g.fillText(l.text, 60, y);
    });
  });
  const mesh = new Mesh(
    new PlaneGeometry(w, (w * H) / W),
    new MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false }),
  );
  mesh.renderOrder = 3;
  return {
    mesh,
    draw,
    h: (w * H) / W,
    add(text: string, tag: string, redraw = true) {
      // the newest finding goes in at the bottom; the oldest scrolls off the page
      if (lines.length === MAX) lines.shift();
      lines.push({ text, tag });
      count++;
      if (redraw) draw();
    },
  };
}

const create: SceneFactory = (ctx) => {
  const { scene, camera, lite, calm } = ctx;
  const lang = document.documentElement.lang === 'ro' ? 'ro' : 'en';
  const tx = TEXT[lang];
  const L = lite ? LITE : FULL;
  const num = (v: number, d: number) => (tx.comma ? v.toFixed(d).replace('.', ',') : v.toFixed(d));
  const redraws: (() => void)[] = [];

  // Athena's shield stands behind the investigation; it turns gently with the pointer, not with the board.
  const SHIELD_D = 5.5;
  const texSize = lite ? 512 : 1024;
  const plane = new PlaneGeometry(SHIELD_D, SHIELD_D);
  const layer = (part: 'rim' | 'emblem', opacity: number) =>
    new Mesh(
      plane,
      new MeshBasicMaterial({ map: shieldTexture(texSize, part), transparent: true, opacity, blending: AdditiveBlending, depthWrite: false }),
    );
  const shield = new Group();
  const rim = layer('rim', 0.35);
  const emblem = layer('emblem', 0.5);
  emblem.position.z = 0.01;
  shield.add(rim, emblem);
  shield.position.z = -1.4;
  scene.add(shield);
  let rimFlash = 0;

  // the board: a slightly tilted plane in front of the shield
  const board = new Group();
  scene.add(board);

  // Every position on the board is an anchor. Its layout coordinates are stretched to the host's shape
  // (narrower and taller in portrait cards, a little wider in landscape ones) by relayout().
  const base = new Map<Vector3, XY>();
  const at = (p: XY) => {
    const a = new Vector3(p[0], p[1], 0);
    base.set(a, p);
    return a;
  };
  /** Objects that sit on an anchor (plus an offset), with their half-size for framing. */
  const placed: { obj: Object3D; a: Vector3; dx: number; dy: number; hw: number; hh: number }[] = [];
  const place = (obj: Object3D, a: Vector3, hw: number, hh: number, dx = 0, dy = 0) => {
    placed.push({ obj, a, dx, dy, hw, hh });
    board.add(obj);
  };
  /** makeLabel draws on a fixed 512 × 96 canvas: its visible pill is only as wide as its text. */
  const labelHalfW = (text: string, h: number) => (Math.min(508, measure(text, '500 40px sans-serif') + 44) / 96) * h * 0.5;
  const label = (text: string, a: Vector3, style: LabelStyle) => {
    const l = makeLabel(text, { ...style, overlay: true });
    l.sprite.renderOrder = 4;
    place(l.sprite, a, labelHalfW(text, style.height!), style.height! / 2);
    return l;
  };

  // subject, and the person linked to it
  const subjectPos = at(L.subject);
  const subject = subjectCard(tx.subjectTag, tx.dd, 1.85);
  place(subject.mesh, subjectPos, 0.925, 0.36);
  redraws.push(subject.draw);

  const personPos = at(L.person);
  const person = tagChip(lite ? '' : tx.person, 'Ion Exemplu (administrator)', '#e0e7ff', L.chipH);
  place(person.sprite, personPos, person.sprite.scale.x / 2, L.chipH / 2);
  redraws.push(person.draw);
  label(`${tx.worksFor} · ${num(0.8, 1)}`, at(L.edge), { color: '#c7d2fe', border: 'rgba(199,210,254,0.5)', height: 0.22 });

  // identifiers
  const idPos = {} as Record<IdKey, Vector3>;
  for (const key of Object.keys(L.ids) as IdKey[]) {
    idPos[key] = at(L.ids[key]!);
    const chip = tagChip(tx.ids[key], VALUES[key], ID_COLOR[key], L.chipH);
    place(chip.sprite, idPos[key], chip.sprite.scale.x / 2, L.chipH / 2);
    redraws.push(chip.draw);
  }

  // collectors, each with pulses running to the identifiers it handles
  const colPos = {} as Record<ColKey, Vector3>;
  for (const key of Object.keys(L.cols) as ColKey[]) {
    colPos[key] = at(L.cols[key]!);
    label(tx.cols[key], colPos[key], { color: '#8be9ff', border: 'rgba(139,233,255,0.55)', bg: 'rgba(6,22,38,0.92)', height: L.colH });
  }

  // map tile, linked to the image
  const mapPos = at([L.map[0], L.map[1]]);
  const map = mapTile(L.map[2]);
  place(map.mesh, mapPos, L.map[2] / 2, map.h / 2);
  redraws.push(map.draw);
  const pinGlow = glowSprite('#f43f5e', 0.5, 0.8);
  pinGlow.renderOrder = 3;
  place(pinGlow, mapPos, 0, 0, map.pin[0], map.pin[1] + 0.06);
  label(tx.depot, at(L.mapLabel), { color: '#fbcfe8', border: 'rgba(249,168,212,0.6)', height: 0.22 });

  // the report
  // with lite's three confirmed findings, three lines never show the same finding twice
  const report = reportCard(tx.report, tx.page, L.report[2], lite ? 3 : 4);
  const reportPos = at([L.report[0], L.report[1]]);
  place(report.mesh, reportPos, L.report[2] / 2, report.h / 2);
  redraws.push(report.draw);

  // static strings of the board: subject to identifiers and person, collectors to identifiers, image to map
  const segLines = (pts: Vector3[], color: number, opacity: number) => {
    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(new Float32Array(pts.length * 3), 3));
    const line = new LineSegments(geo, new LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false, depthTest: false }));
    line.renderOrder = 1;
    line.frustumCulled = false;
    board.add(line);
    return { geo, pts };
  };
  const strings = [subjectPos, personPos];
  for (const key of Object.keys(idPos) as IdKey[]) strings.push(subjectPos, idPos[key]);
  if (idPos.image) strings.push(idPos.image, mapPos);
  const colSegs: Vector3[] = [];
  for (const [c, i] of L.links) colSegs.push(colPos[c], idPos[i]);
  const staticLines = [segLines(strings, 0xa5b4fc, 0.42), segLines(colSegs, 0x8be9ff, 0.22)];

  const pulses = L.links.map(([c, i], k) => {
    const dot = glowSprite('#8be9ff', 0.26, 0.95);
    dot.renderOrder = 2;
    board.add(dot);
    return { dot, from: colPos[c], to: idPos[i], offset: (k * 0.37) % 1, speed: 0.75 + (k % 3) * 0.12 };
  });

  // findings: two pre-drawn cards each (pending, stamped) and a tether to their identifier
  const findings = L.findings.map(([key, slotXY, idOverride], i) => {
    const f = FINDINGS[key];
    const id = idOverride ?? f.id;
    const src = tx.find[key];
    const conf = num(f.conf, 2);
    const pending = findingCard(src, conf, 'pending', tx.pending, L.cardH);
    const stamped = findingCard(src, conf, f.ok ? 'ok' : 'no', f.ok ? tx.confirmed : tx.rejected, L.cardH);
    stamped.sprite.renderOrder = 7;
    const slot = at(slotXY);
    const baseW = pending.sprite.scale.x;
    const baseH = pending.sprite.scale.y;
    // the cards move by themselves; only their slot counts for framing
    place(pending.sprite, slot, baseW / 2, baseH / 2);
    board.add(stamped.sprite);
    redraws.push(pending.draw, stamped.draw);
    return {
      ok: f.ok,
      text: `${src} · ${conf}`,
      tag: tx.ids[id],
      a: pending.sprite,
      b: stamped.sprite,
      slot,
      id: idPos[id],
      baseW,
      baseH,
      offset: P - (i * P) / L.findings.length,
      landed: -1,
      flashed: -1,
    };
  });
  // the report is never empty, even on the first frame
  for (const f of findings.filter((f) => f.ok).slice(0, 3)) report.add(f.text, f.tag, false);
  report.draw();

  const tetherArr = new Float32Array(findings.length * 6);
  const tetherGeo = new BufferGeometry();
  tetherGeo.setAttribute('position', new BufferAttribute(tetherArr, 3));
  const tethers = new LineSegments(
    tetherGeo,
    new LineBasicMaterial({ color: 0xfde68a, transparent: true, opacity: 0.55, depthWrite: false, depthTest: false }),
  );
  tethers.renderOrder = 2;
  tethers.frustumCulled = false;
  board.add(tethers);

  /** Stretch the layout to the host's aspect, move everything onto its anchor, return the half-extent to frame. */
  const extent: XY = [3, 2.5];
  const relayout = (aspect: number) => {
    const tall = smooth(1.15, 0.8, aspect);
    const wide = smooth(1.3, 1.6, aspect);
    const sx = 1 - 0.15 * tall + 0.08 * wide;
    const sy = 1 + 0.22 * tall - 0.05 * wide;
    for (const [a, p] of base) a.set(p[0] * sx, p[1] * sy, 0);
    extent[0] = extent[1] = 0;
    for (const o of placed) {
      o.obj.position.set(o.a.x + o.dx, o.a.y + o.dy, 0);
      extent[0] = Math.max(extent[0], Math.abs(o.a.x) + o.hw);
      extent[1] = Math.max(extent[1], Math.abs(o.a.y) + o.hh);
    }
    for (const { geo, pts } of staticLines) {
      const arr = geo.attributes.position.array as Float32Array;
      pts.forEach((pt, i) => pt.toArray(arr, i * 3));
      geo.attributes.position.needsUpdate = true;
    }
  };
  relayout(1.3);

  // canvas text uses the site's fonts once they are ready; each texture is redrawn exactly once
  let disposed = false;
  if (document.fonts?.load) {
    Promise.all([document.fonts.load(`600 40px ${SANS}`), document.fonts.load(`500 30px ${MONO}`)])
      .then(() => {
        if (!disposed) for (const r of redraws) r();
      })
      .catch(() => {});
  }

  let baseZ = 9;
  let reportBump = 0;
  const pos = new Vector3();
  const end = new Vector3();
  return {
    resize(w, h) {
      relayout(w / h);
      baseZ = fitDistance(camera, extent[0] + 0.05, extent[1] + 0.05);
    },
    update(t) {
      const { pointer } = ctx;

      // collectors: pulses run continuously along their strings
      for (const p of pulses) {
        const u = (t * p.speed + p.offset) % 1;
        p.dot.position.lerpVectors(p.from, p.to, u);
        p.dot.material.opacity = Math.sin(u * Math.PI) * (calm ? 0.6 : 0.95);
      }

      // findings: each on its own 6 s cycle, offset from the others
      findings.forEach((f, i) => {
        const T = t + f.offset;
        const ph = T % P;
        const cycle = Math.floor(T / P);
        if (f.landed < 0) {
          f.landed = ph >= LAND ? cycle : cycle - 1;
          f.flashed = ph >= STAMP ? cycle : cycle - 1;
        }

        const pop = smooth(0, POP, ph);
        const stamped = smooth(STAMP, STAMP + (calm ? 0.45 : 0.12), ph);
        let aOp = pop * (1 - stamped);
        let bOp = stamped;
        let scale = 0.75 + 0.25 * pop;
        let tether = pop;
        pos.copy(f.slot);
        if (!calm) {
          // the stamp lands with a thump; pending cards breathe
          scale *= 1 + 0.3 * stamped * (1 - smooth(STAMP, STAMP + 0.3, ph)) + (1 - stamped) * Math.sin(ph * 4) * 0.015;
          // the moment an analyst confirms a finding, the shield's rim answers, softly
          if (f.ok && ph >= STAMP && f.flashed !== cycle) {
            f.flashed = cycle;
            rimFlash = Math.min(0.6, rimFlash + 0.3);
          }
        }
        if (f.ok) {
          // confirmed: flies into the report, shrinking
          const k = smooth(FLY, LAND, ph);
          pos.lerp(reportPos, k);
          scale *= 1 - 0.65 * k;
          bOp *= 1 - smooth(LAND - 0.25, LAND, ph);
          tether *= 1 - smooth(FLY, FLY + 0.2, ph);
          if (ph >= LAND && f.landed !== cycle) {
            f.landed = cycle;
            report.add(f.text, f.tag);
            if (!calm) reportBump = 1;
          }
        } else {
          // rejected: sinks a little and fades
          const k = smooth(FADE, GONE, ph);
          pos.y -= 0.18 * k;
          bOp *= 1 - k;
          tether *= 1 - k;
        }
        aOp = Math.max(0, aOp);
        f.a.material.opacity = aOp;
        f.b.material.opacity = bOp;
        f.a.visible = aOp > 0.01;
        f.b.visible = bOp > 0.01;
        f.a.position.copy(pos);
        f.b.position.copy(pos);
        f.a.scale.set(f.baseW * scale, f.baseH * scale, 1);
        f.b.scale.set(f.baseW * scale, f.baseH * scale, 1);

        end.lerpVectors(f.id, f.slot, tether);
        f.id.toArray(tetherArr, i * 6);
        end.toArray(tetherArr, i * 6 + 3);
      });
      tetherGeo.attributes.position.needsUpdate = true;

      reportBump *= 0.9;
      report.mesh.scale.setScalar(1 + reportBump * 0.05);
      pinGlow.scale.setScalar(calm ? 0.5 : 0.42 + Math.sin(t * 2.4) * 0.12);

      // the board leans back a little and follows the pointer gently
      board.rotation.x = -0.14 - pointer.y * 0.06;
      board.rotation.y = pointer.x * 0.1 + Math.sin(t * 0.25) * 0.03;

      rimFlash *= 0.95;
      (rim.material as MeshBasicMaterial).opacity = 0.32 + (calm ? 0 : rimFlash * 0.3);
      shield.rotation.y = pointer.x * 0.15 + Math.sin(t * 0.3) * 0.05;
      shield.rotation.x = -pointer.y * 0.1;

      camera.position.set(0, 0.2, baseZ);
      camera.lookAt(0, 0, 0);
    },
    dispose() {
      disposed = true;
      disposeTree(scene);
    },
  };
};

export default create;
