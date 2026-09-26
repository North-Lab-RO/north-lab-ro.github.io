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

function latLon(lat: number, lon: number, r = R): Vector3 {
  const phi = ((90 - lat) * Math.PI) / 180;
  const th = ((lon + 180) * Math.PI) / 180;
  return new Vector3(-r * Math.sin(phi) * Math.cos(th), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(th));
}

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
    const chip = makeLabel(cat[lang], { color: cat.color, border: cat.color, height: 0.3, overlay: true });
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
  // the analysis column sits beside the globe; a thin line joins it to the story being analysed
  const COLUMN = new Vector3(-R * 1.3, R * 0.62, 0.6);
  const linkPos = new Float32Array(6);
  const linkGeo = new BufferGeometry();
  linkGeo.setAttribute('position', new Float32BufferAttribute(linkPos, 3));
  const linkMat = new LineBasicMaterial({ color: 0xe8f3ff, transparent: true, opacity: 0, depthWrite: false });
  scene.add(new LineSegments(linkGeo, linkMat));
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

  // Four roles play at once, each on its own 6 s cycle and its own offset, so any glance shows the whole product:
  // a story being analysed, a story crossing the alert threshold, a story rising, and a story receiving coverage.
  // When a role's cycle starts it takes the best-facing story no other role is using.
  const CYCLE = 6;
  const ROLES = ['analyse', 'alert', 'rise', 'cover'] as const;
  const offsets = [0, 1.5, 3, 4.5];
  const roleStory = [-1, -1, -1, -1];
  const roleCycle = [-1, -1, -1, -1];
  const pick = (k: number) => {
    let best = -1;
    let bestFacing = -2;
    for (const s of stories) {
      if (roleStory.some((r, j) => j !== k && r === s.index)) continue;
      if (s.facing > bestFacing) {
        bestFacing = s.facing;
        best = s.index;
      }
    }
    return best;
  };

  let baseZ = 8;
  let lastScore = -1;
  let lastLines = -1;
  const tmp = new Vector3();
  const cardAnchor = new Vector3();
  (card.mesh.material as MeshBasicMaterial).opacity = 0.95;
  return {
    resize() {
      // room for the chips above the globe and the briefing card at its lower right
      baseZ = fitDistance(camera, R * 1.75, R * 1.35);
    },
    update(t) {
      tick(scene, t);
      const { pointer } = ctx;

      globe.rotation.y = t * 0.06 + pointer.x * 0.3;
      // every story is in the northern hemisphere: lean the north towards us so they spread over the face
      globe.rotation.x = 0.6 + pointer.y * 0.15;
      globe.updateMatrixWorld();

      for (const s of stories) {
        s.world.copy(s.pos).applyMatrix4(globe.matrixWorld);
        s.facing = smooth(-0.15, 0.45, s.world.z / R);
      }

      // role timings: rt = seconds into this role's current cycle
      const rt = [0, 0, 0, 0];
      ROLES.forEach((_, k) => {
        const c = Math.floor((t + offsets[k]) / CYCLE);
        rt[k] = (t + offsets[k]) % CYCLE;
        if (c !== roleCycle[k]) {
          roleCycle[k] = c;
          roleStory[k] = -1;
          roleStory[k] = pick(k);
        }
      });
      const S = (k: number) => stories[Math.max(0, roleStory[k])];
      const fadeOut = (x: number) => 1 - smooth(5.3, 5.9, x);

      // spikes: every story has one; the rising story's grows fastest
      for (const s of stories) {
        const rising = s.index === roleStory[2];
        const grow = rising ? smooth(0.2, 3, rt[2]) * fadeOut(rt[2]) : 0;
        s.height = 0.12 + (s.sources / 10) * 0.35 + grow * 0.7;
        s.spike.scale.set(1, s.height, 1);
        s.spike.position.copy(s.pos).addScaledVector(s.normal, s.height / 2);
        (s.spike.material as MeshBasicMaterial).opacity = 0.35 + 0.5 * s.facing;
        const busy = roleStory.includes(s.index);
        s.glow.scale.setScalar(0.45 + (busy ? 0.2 + Math.sin(t * 3 + s.index) * 0.06 : 0.05));
        if (s.chip) {
          tmp.copy(s.pos).addScaledVector(s.normal, s.height + 0.2).applyMatrix4(globe.matrixWorld);
          s.chip.sprite.position.copy(tmp);
          s.chip.sprite.material.opacity = s.facing * (busy ? 1 : 0.75);
        }
      }

      // coverage: arcs into the covered story pulse strongest; "+1 source" pops up three times per cycle
      const covered = roleStory[3];
      for (const a of arcs) {
        (a.line.material as ShaderMaterial).uniforms.uBoost.value = a.story === covered ? 1 : 0.4;
      }
      const C = S(3);
      if (!calm) {
        const pop = rt[3] % 2;
        ticker.sprite.position.copy(C.world).addScaledVector(up, -0.32);
        ticker.sprite.material.opacity = smooth(0, 0.25, pop) * (1 - smooth(1.2, 1.7, pop)) * C.facing * fadeOut(rt[3]);
      } else {
        ticker.sprite.position.copy(C.world).addScaledVector(up, -0.32);
        ticker.sprite.material.opacity = C.facing * 0.8 * fadeOut(rt[3]);
      }

      // rising
      const Ri = S(2);
      rising.sprite.position.copy(Ri.world).addScaledVector(up, Ri.height + 0.55);
      rising.sprite.material.opacity = smooth(0.8, 1.4, rt[2]) * fadeOut(rt[2]) * Ri.facing;

      // analysing: scan ring on the story, stages ticking off in ~2.5 s
      const A = S(0);
      const analysing = smooth(0.1, 0.5, rt[0]) * fadeOut(rt[0]);
      scanGroup.position.copy(A.pos).addScaledVector(A.normal, 0.01);
      scanGroup.lookAt(tmp.copy(A.pos).multiplyScalar(2).applyMatrix4(globe.matrixWorld));
      scanGroup.rotateZ(t * 2.4);
      (scan.material as LineBasicMaterial).opacity = analysing * 0.8;
      (scanTick.material as LineBasicMaterial).opacity = analysing;
      stageChips.forEach((c, i) => {
        const on = smooth(0.4 + i * 0.5, 0.7 + i * 0.5, rt[0]) * fadeOut(rt[0]);
        c.sprite.position.set(COLUMN.x, COLUMN.y - i * 0.33, COLUMN.z);
        c.sprite.material.opacity = on;
      });
      tmp.set(COLUMN.x + 0.55, COLUMN.y + 0.16, COLUMN.z).toArray(linkPos, 0);
      A.world.toArray(linkPos, 3);
      linkGeo.attributes.position.needsUpdate = true;
      linkMat.opacity = analysing * 0.45 * A.facing;

      // alert: importance counts up; crossing 60 raises the alert
      const Al = S(1);
      const score = Math.round(38 + 34 * smooth(0.3, 1.8, rt[1]));
      const alerted = score >= 60;
      if (score !== lastScore) {
        if (alerted) importance.set(`⚠ ${tx.alert} · ${score}`, { color: '#ff5a6a', border: '#ff5a6a' });
        else importance.set(`${tx.importance} ${score}`, { color: '#fbbf24', border: '#fbbf24' });
        lastScore = score;
      }
      importance.sprite.position.copy(Al.world).addScaledVector(up, -0.45);
      importance.sprite.material.opacity = smooth(0.1, 0.4, rt[1]) * fadeOut(rt[1]) * Math.max(0.5, Al.facing);
      pulse.position.copy(Al.pos).addScaledVector(Al.normal, 0.02);
      pulse.lookAt(tmp.copy(Al.pos).multiplyScalar(2).applyMatrix4(globe.matrixWorld));
      if (calm) {
        pulse.scale.setScalar(1.4);
        (pulse.material as MeshBasicMaterial).opacity = alerted ? 0.6 * fadeOut(rt[1]) : 0;
      } else {
        const k = alerted ? ((rt[1] - 1.6) % 1.1) / 1.1 : 0;
        pulse.scale.setScalar(1 + k * 3);
        (pulse.material as MeshBasicMaterial).opacity = alerted ? (1 - k) * 0.9 * fadeOut(rt[1]) : 0;
      }

      // reporting: the briefing is always on screen and refills every cycle from the stories facing us
      const lines = Math.min(6, Math.floor(((t % CYCLE) / CYCLE) * 7.5));
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
      feedMat.opacity = 0.18 + 0.12 * Math.sin(t * 2.2);

      camera.position.set(0, 0, baseZ);
      camera.lookAt(0, 0, 0);
    },
    dispose() {
      disposeTree(scene);
    },
  };
};

export default create;
