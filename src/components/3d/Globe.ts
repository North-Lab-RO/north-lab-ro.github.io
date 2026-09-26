import {
  AdditiveBlending,
  BufferGeometry,
  CanvasTexture,
  CylinderGeometry,
  Float32BufferAttribute,
  Group,
  Line,
  LineBasicMaterial,
  LineLoop,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Points,
  QuadraticBezierCurve3,
  Quaternion,
  RingGeometry,
  ShaderMaterial,
  SphereGeometry,
  SRGBColorSpace,
  Vector3,
} from 'three';
import { fitDistance, type SceneFactory } from './engine';
import { disposeTree, glowSprite, makeLabel, starField, tick, type Label } from './common';

/**
 * COUNSELOR as a newsroom globe. One 18-second loop plays the product's pipeline:
 * news arrives from outlets → stories rise as sources join → the lead story is analysed stage by stage →
 * its importance crosses the alert threshold → the top stories feed the briefing.
 * Categories are COUNSELOR's real ones.
 */

const R = 2.1;
const LOOP = 18;

type Slug = 'politics' | 'health' | 'economy' | 'military' | 'energy' | 'climate' | 'technology';
const CATEGORY: Record<Slug, { en: string; ro: string; color: string }> = {
  politics: { en: 'Politics', ro: 'Politică', color: '#9a8cff' },
  health: { en: 'Health', ro: 'Sănătate', color: '#4dffb8' },
  economy: { en: 'Economy', ro: 'Economie', color: '#fbbf24' },
  military: { en: 'Military', ro: 'Militar', color: '#ff5a6a' },
  energy: { en: 'Energy', ro: 'Energie', color: '#fb923c' },
  climate: { en: 'Climate', ro: 'Climă', color: '#5eead4' },
  technology: { en: 'Technology', ro: 'Tehnologie', color: '#8be9ff' },
};
// Stories at plausible real places, spread so their chips don't collide.
const STORIES: { slug: Slug; lat: number; lon: number; sources: number }[] = [
  { slug: 'politics', lat: 44.4, lon: 26.1, sources: 9 }, // Bucharest
  { slug: 'health', lat: 46.2, lon: 6.1, sources: 6 }, // Geneva
  { slug: 'economy', lat: 40.7, lon: -74, sources: 8 }, // New York
  { slug: 'military', lat: 24, lon: 120, sources: 7 }, // Taiwan Strait
  { slug: 'energy', lat: 26, lon: 52, sources: 5 }, // the Gulf
  { slug: 'climate', lat: 76, lon: -40, sources: 4 }, // the Arctic
  { slug: 'technology', lat: 37.8, lon: -122.4, sources: 6 }, // San Francisco
];

const TEXT = {
  en: {
    source: '+1 source',
    rising: '▲ Rising',
    stages: ['Summary', 'Entities', 'Classification', 'Political spectrum', 'Importance'],
    importance: 'Importance',
    alert: 'Alert',
    briefing: 'Morning briefing',
  },
  ro: {
    source: '+1 sursă',
    rising: '▲ În creștere',
    stages: ['Rezumat', 'Entități', 'Clasificare', 'Spectru politic', 'Importanță'],
    importance: 'Importanță',
    alert: 'Alertă',
    briefing: 'Sinteza de dimineață',
  },
};

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
/** 0 → 1 between a and b, back to 0 between c and d. */
const window4 = (a: number, b: number, c: number, d: number, x: number) => smooth(a, b, x) * (1 - smooth(c, d, x));

function latLon(lat: number, lon: number, r = R): Vector3 {
  const phi = ((90 - lat) * Math.PI) / 180;
  const th = ((lon + 180) * Math.PI) / 180;
  return new Vector3(-r * Math.sin(phi) * Math.cos(th), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(th));
}

/** The turn about the vertical axis that brings a point on the globe to face the camera. */
const facingAngle = (p: Vector3) => Math.atan2(-p.x, p.z);

function fibonacciSphere(n: number, r: number): number[] {
  const out: number[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const rad = Math.sqrt(1 - y * y);
    const th = golden * i;
    out.push(Math.cos(th) * rad * r, y * r, Math.sin(th) * rad * r);
  }
  return out;
}

function dotGlobe(n: number): Points {
  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(fibonacciSphere(n, R), 3));
  const mat = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: { uPixel: { value: Math.min(window.devicePixelRatio, 2) } },
    vertexShader: /* glsl */ `
      uniform float uPixel;
      varying float vFace;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vec3 n = normalize(normalMatrix * normalize(position));
        vFace = dot(n, normalize(-mv.xyz));
        gl_PointSize = 2.6 * uPixel * (10.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      varying float vFace;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.1, d) * mix(0.1, 0.8, smoothstep(-0.2, 0.9, vFace));
        gl_FragColor = vec4(vec3(0.545, 0.914, 1.0), a);
      }`,
  });
  return new Points(geo, mat);
}

/** An outlet's coverage travelling to a story: a pulse runs along the arc; uBoost makes it stronger during the news beat. */
function arc(from: Vector3, to: Vector3, offset: number, color: string): Line {
  const mid = from.clone().add(to).multiplyScalar(0.5);
  const lift = 1.2 + from.distanceTo(to) * 0.2;
  mid.normalize().multiplyScalar(R * lift);
  const pts = new QuadraticBezierCurve3(from, mid, to).getPoints(64);
  const geo = new BufferGeometry().setFromPoints(pts);
  geo.setAttribute('u', new Float32BufferAttribute(pts.map((_, i) => i / (pts.length - 1)), 1));
  const c = new MeshBasicMaterial({ color }).color;
  const mat = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uOffset: { value: offset }, uBoost: { value: 0 }, uColor: { value: c } },
    vertexShader: /* glsl */ `
      attribute float u;
      varying float vU;
      void main() { vU = u; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uOffset;
      uniform float uBoost;
      uniform vec3 uColor;
      varying float vU;
      void main() {
        float head = fract(uTime * 0.3 + uOffset);
        float pulse = smoothstep(0.16, 0.0, head - vU) * step(vU, head);
        vec3 col = mix(vec3(0.545, 0.914, 1.0), uColor, vU);
        float a = 0.05 + uBoost * (0.08 + pulse * 0.85);
        gl_FragColor = vec4(col, a);
      }`,
  });
  return new Line(geo, mat);
}

/** Seeded so every visit draws the same outlets. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function briefingCard(title: string) {
  const W = 512;
  const H = 360;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  const draw = (lines: number, colors: string[]) => {
    g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(232,243,255,0.96)';
    g.beginPath();
    g.roundRect(4, 4, W - 8, H - 8, 18);
    g.fill();
    g.fillStyle = '#0a1426';
    g.font = '600 34px sans-serif';
    g.fillText(title, 32, 62);
    g.font = '500 20px monospace';
    g.fillStyle = '#5b6b86';
    g.fillText('RAP-2026-09-26-M01 · 07:00', 32, 96);
    g.fillStyle = '#0a1426';
    g.fillRect(32, 112, W - 64, 3);
    for (let i = 0; i < lines; i++) {
      const y = 146 + i * 34;
      g.fillStyle = colors[i % colors.length];
      g.beginPath();
      g.roundRect(32, y - 10, 14, 14, 3);
      g.fill();
      g.fillStyle = 'rgba(10,20,38,0.55)';
      g.fillRect(58, y - 7, (W - 110) * (0.55 + ((i * 37) % 40) / 100), 9);
    }
    tex.needsUpdate = true;
  };
  const mesh = new Mesh(
    new PlaneGeometry(1.5, 1.05),
    new MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false, depthTest: false }),
  );
  return { mesh, draw };
}

const create: SceneFactory = (ctx) => {
  const { scene, camera, lite, calm } = ctx;
  const lang = document.documentElement.lang === 'ro' ? 'ro' : 'en';
  const tx = TEXT[lang];

  const globe = new Group();
  scene.add(globe);
  globe.add(dotGlobe(lite ? 1400 : 2600));
  scene.add(starField(lite ? 250 : 600, 30, [-25, -8]));

  const up = new Vector3(0, 1, 0);
  const stories = (lite ? STORIES.slice(0, 4) : STORIES).map((s, i) => {
    const cat = CATEGORY[s.slug];
    const pos = latLon(s.lat, s.lon);
    const normal = pos.clone().normalize();
    const marker = new Mesh(new SphereGeometry(0.055, 12, 8), new MeshBasicMaterial({ color: cat.color }));
    marker.position.copy(pos);
    const glow = glowSprite(cat.color, 0.55, 0.7);
    glow.position.copy(pos);
    // a spike out of the globe: its height grows with the number of sources
    const spike = new Mesh(
      new CylinderGeometry(0.02, 0.02, 1, 6, 1, true),
      new MeshBasicMaterial({ color: cat.color, transparent: true, opacity: 0.85, blending: AdditiveBlending, depthWrite: false }),
    );
    spike.quaternion.copy(new Quaternion().setFromUnitVectors(up, normal));
    globe.add(marker, glow, spike);
    const chip = lite ? null : makeLabel(cat[lang], { color: cat.color, border: cat.color, height: 0.3, overlay: true });
    if (chip) scene.add(chip.sprite);
    return { ...s, cat, pos, normal, marker, glow, spike, chip, height: 0, world: new Vector3(), facing: 0, index: i };
  });

  // outlets around the globe, each covering one story
  const rand = seeded(20260926);
  const outletCount = lite ? 12 : 22;
  const arcs: { line: Line; story: number }[] = [];
  const outletPos: number[] = [];
  for (let i = 0; i < outletCount; i++) {
    const target = i % stories.length;
    let p: Vector3;
    do {
      const u = rand() * 2 - 1;
      const th = rand() * Math.PI * 2;
      const s2 = Math.sqrt(1 - u * u);
      p = new Vector3(Math.cos(th) * s2, u, Math.sin(th) * s2).multiplyScalar(R);
    } while (p.distanceTo(stories[target].pos) < 1.0);
    outletPos.push(p.x, p.y, p.z);
    const line = arc(p, stories[target].pos, rand(), stories[target].cat.color);
    arcs.push({ line, story: target });
    globe.add(line);
  }
  const outletGeo = new BufferGeometry();
  outletGeo.setAttribute('position', new Float32BufferAttribute(outletPos, 3));
  globe.add(
    new Points(
      outletGeo,
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        uniforms: { uPixel: { value: Math.min(window.devicePixelRatio, 2) } },
        vertexShader: /* glsl */ `
          uniform float uPixel;
          void main() {
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = 6.0 * uPixel * (10.0 / -mv.z);
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: /* glsl */ `
          void main() {
            float d = length(gl_PointCoord - 0.5);
            gl_FragColor = vec4(0.91, 0.953, 1.0, smoothstep(0.5, 0.15, d) * 0.9);
          }`,
      }),
    ),
  );

  // the lead story's analysis: a scan ring on the surface, and the stages as chips beside it
  const scan = new LineLoop(
    new BufferGeometry().setFromPoints(
      Array.from({ length: 48 }, (_, i) => new Vector3(Math.cos((i / 48) * Math.PI * 2) * 0.32, Math.sin((i / 48) * Math.PI * 2) * 0.32, 0)),
    ),
    new LineBasicMaterial({ color: 0xe8f3ff, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false }),
  );
  const scanTick = new LineSegments(
    new BufferGeometry().setFromPoints([new Vector3(0.24, 0, 0), new Vector3(0.44, 0, 0)]),
    new LineBasicMaterial({ color: 0xe8f3ff, transparent: true, opacity: 0, depthWrite: false }),
  );
  const scanGroup = new Group();
  scanGroup.add(scan, scanTick);
  globe.add(scanGroup);

  const pulse = new Mesh(
    new RingGeometry(0.3, 0.36, 48),
    new MeshBasicMaterial({ color: 0xff5a6a, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false, side: 2 }),
  );
  globe.add(pulse);

  const stageChips: Label[] = tx.stages.map((s) => makeLabel(`✓ ${s}`, { color: '#e8f3ff', height: 0.27, overlay: true }));
  stageChips.forEach((c) => scene.add(c.sprite));
  const importance = makeLabel(`${tx.importance} 34`, { color: '#fbbf24', border: '#fbbf24', height: 0.32, overlay: true, bold: true });
  const rising = makeLabel(tx.rising, { color: '#4dffb8', border: '#4dffb8', height: 0.3, overlay: true });
  const ticker = makeLabel(tx.source, { color: '#8be9ff', border: '#8be9ff', height: 0.26, overlay: true });
  scene.add(importance.sprite, rising.sprite, ticker.sprite);

  // the briefing, and the lines that carry the top stories into it
  const card = briefingCard(tx.briefing);
  card.mesh.position.set(R * 0.82, -R * 0.72, 1.4);
  scene.add(card.mesh);
  const feedPos = new Float32Array(stories.length * 6);
  const feedGeo = new BufferGeometry();
  feedGeo.setAttribute('position', new Float32BufferAttribute(feedPos, 3));
  const feedMat = new LineBasicMaterial({ color: 0xe8f3ff, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false });
  const feeds = new LineSegments(feedGeo, feedMat);
  scene.add(feeds);

  const hideLabel = (l: Label | null) => {
    if (l) l.sprite.material.opacity = 0;
  };

  let baseZ = 8;
  let lastScore = -1;
  let lastLines = -1;
  let lastLead = -1;
  const tmp = new Vector3();
  const cardAnchor = new Vector3();
  return {
    resize() {
      // room for the chips above the globe and the briefing card at its lower right
      baseZ = fitDistance(camera, R * 1.55, R * 1.35);
    },
    update(t) {
      tick(scene, t);
      const { pointer } = ctx;
      const tc = t % LOOP;
      const lead = Math.floor(t / LOOP) % stories.length;

      // The lead story turns to face us; during the reset the globe eases round to the next one.
      const nextLead = (lead + 1) % stories.length;
      let turn = facingAngle(stories[nextLead].pos) - facingAngle(stories[lead].pos);
      turn = Math.atan2(Math.sin(turn), Math.cos(turn));
      globe.rotation.y = facingAngle(stories[lead].pos) + turn * smooth(16, 18, tc) + Math.sin(t * 0.15) * 0.25 + pointer.x * 0.3;
      // every story is in the northern hemisphere: lean the north towards us so they spread over the face
      globe.rotation.x = 0.6 + pointer.y * 0.15;
      globe.updateMatrixWorld();

      const news = window4(0, 0.8, 4.2, 6, tc);
      const growth = smooth(1.5, 8, tc);
      const settle = 1 - smooth(16, 18, tc);

      // stories: where they are now, how much they face us, how tall their spike is
      for (const s of stories) {
        s.world.copy(s.pos).applyMatrix4(globe.matrixWorld);
        s.facing = smooth(-0.15, 0.45, s.world.z / R);
        const isLead = s.index === lead;
        s.height = (0.12 + (s.sources / 10) * 0.5 * growth * (isLead ? 1.6 : 1)) * (0.35 + 0.65 * settle);
        s.spike.scale.set(1, s.height, 1);
        s.spike.position.copy(s.pos).addScaledVector(s.normal, s.height / 2);
        (s.spike.material as MeshBasicMaterial).opacity = 0.35 + 0.5 * s.facing;
        s.glow.scale.setScalar(0.45 + (isLead ? 0.25 + Math.sin(t * 3) * 0.08 : 0.05));
        if (s.chip) {
          tmp.copy(s.pos).addScaledVector(s.normal, s.height + 0.2).applyMatrix4(globe.matrixWorld);
          s.chip.sprite.position.copy(tmp);
          s.chip.sprite.material.opacity = s.facing * (isLead ? 1 : 0.8);
        }
      }
      const L = stories[lead];
      // lite mode shows a chip only for the lead story
      if (lite) {
        if (lastLead !== lead) {
          ticker.set(L.cat[lang], { color: L.cat.color, border: L.cat.color });
          lastLead = lead;
        }
      }

      // news: coverage pulses along the arcs, strongest while articles arrive
      for (const a of arcs) {
        const m = a.line.material as ShaderMaterial;
        m.uniforms.uBoost.value = (0.25 + 0.75 * news) * (a.story === lead ? 1.2 : 0.8) * settle;
      }
      if (lite) {
        ticker.sprite.position.copy(L.world).addScaledVector(up, 0.42);
        ticker.sprite.material.opacity = L.facing;
      } else if (!calm) {
        // "+1 source" hops between stories while articles arrive
        const hop = Math.floor(tc / 0.9) % stories.length;
        const h = stories[hop];
        ticker.sprite.position.copy(h.world).addScaledVector(up, -0.3);
        ticker.sprite.material.opacity = news * h.facing * (0.5 + 0.5 * Math.sin((tc % 0.9) * Math.PI / 0.9));
      } else hideLabel(ticker);

      // rising: the lead story grows fastest
      rising.sprite.position.copy(L.world).addScaledVector(up, L.height + 0.55);
      rising.sprite.material.opacity = window4(4.5, 5.5, 8.5, 9.5, tc) * L.facing;

      // analysing: a scan ring turns on the lead story while its stages tick off
      const analysing = window4(5, 5.6, 10, 10.8, tc);
      scanGroup.position.copy(L.pos).addScaledVector(L.normal, 0.01);
      // lookAt takes a world point: face the ring outwards from the globe's centre
      scanGroup.lookAt(tmp.copy(L.pos).multiplyScalar(2).applyMatrix4(globe.matrixWorld));
      scanGroup.rotateZ(t * 2.4);
      (scan.material as LineBasicMaterial).opacity = analysing * 0.8;
      (scanTick.material as LineBasicMaterial).opacity = analysing;
      const colX = L.world.x > 0 ? -1 : 1; // put the column on the globe's inner side
      stageChips.forEach((c, i) => {
        const on = smooth(5.3 + i * 0.8, 5.7 + i * 0.8, tc) * (1 - smooth(10.2, 11, tc));
        c.sprite.position.set(L.world.x + colX * 1.15, L.world.y + 0.66 - i * 0.33, L.world.z + 0.3);
        c.sprite.material.opacity = on * Math.max(0.4, L.facing);
      });

      // alert: importance counts up; crossing 60 raises the alert
      const score = Math.round(34 + 38 * smooth(9, 10.6, tc));
      const alerted = score >= 60;
      if (score !== lastScore) {
        if (alerted) importance.set(`⚠ ${tx.alert} · ${score}`, { color: '#ff5a6a', border: '#ff5a6a' });
        else importance.set(`${tx.importance} ${score}`, { color: '#fbbf24', border: '#fbbf24' });
        lastScore = score;
      }
      importance.sprite.position.copy(L.world).addScaledVector(up, -0.45);
      importance.sprite.material.opacity = window4(8.8, 9.3, 12.5, 13.5, tc) * Math.max(0.5, L.facing);
      pulse.position.copy(L.pos).addScaledVector(L.normal, 0.02);
      pulse.lookAt(tmp.copy(L.pos).multiplyScalar(2).applyMatrix4(globe.matrixWorld));
      if (calm) {
        pulse.scale.setScalar(1.4);
        (pulse.material as MeshBasicMaterial).opacity = alerted ? window4(10, 10.4, 12, 13, tc) * 0.6 : 0;
      } else {
        const k = alerted ? ((tc - 10) % 1.1) / 1.1 : 0;
        pulse.scale.setScalar(1 + k * 3);
        (pulse.material as MeshBasicMaterial).opacity = alerted && tc < 13 ? (1 - k) * 0.9 : 0;
      }

      // reporting: the stories facing us feed the briefing, which fills line by line
      const report = window4(12, 12.8, 16.2, 17.4, tc);
      (card.mesh.material as MeshBasicMaterial).opacity = report;
      const lines = Math.min(6, Math.max(0, Math.floor((tc - 12.4) / 0.45)));
      if (lines !== lastLines) {
        card.draw(lines, stories.map((s) => s.cat.color));
        lastLines = lines;
      }
      cardAnchor.set(card.mesh.position.x - 0.75, card.mesh.position.y + 0.2, card.mesh.position.z);
      stories.forEach((s, i) => {
        // only stories on our side of the globe send a line; the others collapse onto the card
        (s.facing > 0.35 ? s.world : cardAnchor).toArray(feedPos, i * 6);
        cardAnchor.toArray(feedPos, i * 6 + 3);
      });
      feedGeo.attributes.position.needsUpdate = true;
      feedMat.opacity = window4(12.2, 13, 15, 16.2, tc) * 0.5;

      camera.position.set(0, 0, baseZ);
      camera.lookAt(0, 0, 0);
    },
    dispose() {
      disposeTree(scene);
    },
  };
};

export default create;
