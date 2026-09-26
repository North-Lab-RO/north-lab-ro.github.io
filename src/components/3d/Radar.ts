import {
  AdditiveBlending,
  BufferGeometry,
  CatmullRomCurve3,
  CircleGeometry,
  CylinderGeometry,
  EdgesGeometry,
  Float32BufferAttribute,
  Group,
  Line,
  LineBasicMaterial,
  LineDashedMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Points,
  PointsMaterial,
  ShaderMaterial,
  Shape,
  ShapeGeometry,
  DoubleSide,
  Vector3,
} from 'three';
import { fitDistance, type SceneFactory } from './engine';
import { disposeTree, glowSprite, makeLabel, tick } from './common';

const RANGE = 4;
const SWEEP_SPEED = 0.9; // rad/s
const PHOSPHOR = 0x4dffb8;

function circle(r: number, opacity: number): LineSegments {
  const p: number[] = [];
  const n = 192;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2;
    const a1 = ((i + 1) / n) * Math.PI * 2;
    p.push(Math.cos(a0) * r, Math.sin(a0) * r, 0, Math.cos(a1) * r, Math.sin(a1) * r, 0);
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(p, 3));
  return new LineSegments(g, new LineBasicMaterial({ color: PHOSPHOR, transparent: true, opacity, depthWrite: false }));
}

function scope(): Group {
  const g = new Group();
  for (let r = 1; r <= RANGE; r++) g.add(circle(r, r === RANGE ? 0.55 : 0.2));
  const ticks: number[] = [];
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    const len = i % 9 === 0 ? 0.28 : 0.12;
    ticks.push(Math.cos(a) * RANGE, Math.sin(a) * RANGE, 0, Math.cos(a) * (RANGE + len), Math.sin(a) * (RANGE + len), 0);
  }
  ticks.push(-RANGE, 0, 0, RANGE, 0, 0, 0, -RANGE, 0, 0, RANGE, 0);
  const tg = new BufferGeometry();
  tg.setAttribute('position', new Float32BufferAttribute(ticks, 3));
  g.add(new LineSegments(tg, new LineBasicMaterial({ color: PHOSPHOR, transparent: true, opacity: 0.25, depthWrite: false })));
  return g;
}

function sweep(): Mesh {
  const mat = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: { uAngle: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec2 vP;
      void main() { vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uAngle;
      varying vec2 vP;
      const float TAU = 6.28318530718;
      void main() {
        float a = atan(vP.y, vP.x);
        float d = mod(uAngle - a, TAU);
        float trail = exp(-d * 3.2) * 0.5 + smoothstep(0.03, 0.0, d) * 0.8;
        float r = length(vP) / ${RANGE.toFixed(1)};
        trail *= smoothstep(1.0, 0.96, r);
        gl_FragColor = vec4(vec3(0.302, 1.0, 0.722) * trail, trail);
      }`,
  });
  return new Mesh(new CircleGeometry(RANGE, 128), mat);
}

/** Did the sweep pass angle `a` between the previous frame and this one? */
function swept(a: number, prev: number, now: number) {
  return prev <= now ? a > prev && a <= now : a > prev || a <= now;
}

/** Runway 08/26: dark surface, threshold bars, dashed centreline and edge lights. */
function runwayGroup(): Group {
  const g = new Group();
  const L = 0.95;
  const W = 0.09;
  const surface = new Mesh(new PlaneGeometry(L, W), new MeshBasicMaterial({ color: 0x1b2b33 }));
  g.add(surface);
  const white = new MeshBasicMaterial({ color: 0xe8f3ff });
  for (const end of [-1, 1]) {
    for (let k = 0; k < 4; k++) {
      const bar = new Mesh(new PlaneGeometry(0.04, 0.012), white);
      bar.position.set(end * (L / 2 - 0.035), (k - 1.5) * 0.019, 0.001);
      g.add(bar);
    }
  }
  const centre = new Line(
    new BufferGeometry().setFromPoints([new Vector3(-L / 2 + 0.08, 0, 0.001), new Vector3(L / 2 - 0.08, 0, 0.001)]),
    new LineDashedMaterial({ color: 0xe8f3ff, dashSize: 0.035, gapSize: 0.03, transparent: true, opacity: 0.8 }),
  );
  centre.computeLineDistances();
  g.add(centre);
  const lights: number[] = [];
  for (let i = 0; i <= 12; i++) {
    const x = -L / 2 + (i / 12) * L;
    lights.push(x, W / 2 + 0.008, 0.002, x, -W / 2 - 0.008, 0.002);
  }
  const lg = new BufferGeometry();
  lg.setAttribute('position', new Float32BufferAttribute(lights, 3));
  g.add(new Points(lg, new PointsMaterial({ color: 0xfff4d6, size: 0.022, transparent: true, opacity: 0.9, depthWrite: false })));
  return g;
}

/** A control tower drawn like the scope: dark body, phosphor outlines, a glass cab and an obstruction beacon. */
function towerGroup() {
  const g = new Group();
  // Cylinders stand on Y; the scope's "up" is +Z, so the tower is built on Y and turned onto Z.
  const body = new Group();
  body.rotation.x = Math.PI / 2;
  g.add(body);
  const fill = new MeshBasicMaterial({ color: 0x07131b });
  const edge = new LineBasicMaterial({ color: PHOSPHOR, transparent: true, opacity: 0.85 });
  const part = (geo: CylinderGeometry, y: number) => {
    const m = new Mesh(geo, fill);
    m.position.y = y;
    const e = new LineSegments(new EdgesGeometry(geo, 20), edge);
    e.position.y = y;
    body.add(m, e);
  };
  part(new CylinderGeometry(0.05, 0.085, 0.07, 8), 0.035); // base
  part(new CylinderGeometry(0.035, 0.05, 0.55, 8), 0.345); // shaft
  part(new CylinderGeometry(0.085, 0.045, 0.05, 8), 0.645); // cab floor, flaring out
  const glassMat = new MeshBasicMaterial({ color: PHOSPHOR, transparent: true, opacity: 0.35, blending: AdditiveBlending, depthWrite: false });
  const glass = new Mesh(new CylinderGeometry(0.1, 0.088, 0.09, 8, 1, true), glassMat);
  glass.position.y = 0.715;
  body.add(glass, new LineSegments(new EdgesGeometry(glass.geometry, 20), edge).translateY(0.715));
  part(new CylinderGeometry(0.06, 0.108, 0.035, 8), 0.778); // roof
  const mast = new Line(
    new BufferGeometry().setFromPoints([new Vector3(0, 0.795, 0), new Vector3(0, 0.93, 0)]),
    new LineBasicMaterial({ color: PHOSPHOR, transparent: true, opacity: 0.9 }),
  );
  body.add(mast);
  const beacon = glowSprite('#ff5a6a', 0.22, 1);
  beacon.position.set(0, 0, 0.94);
  const cabGlow = glowSprite('#4dffb8', 0.55, 0);
  cabGlow.position.set(0, 0, 0.715);
  g.add(beacon, cabGlow);
  return { group: g, glassMat, beacon, cabGlow };
}

// ── The airfield ──────────────────────────────────────────────────────────────────────────────
// One 7.5 s cycle: an arrival touches down on 08 and rolls out, then a departure lines up, rolls and climbs out
// on the departure route. Three arrivals are always on their way (staggered by one cycle each), so any glance
// shows traffic on the routes, one on final and a landing or a take-off.
const P = 7.5;
const RWY_ANGLE = 0.14;
const DIR = new Vector3(Math.cos(RWY_ANGLE), Math.sin(RWY_ANGLE), 0);
const HALF = 0.71; // half the runway length (runway group scaled 1.5)
const THRESHOLD = DIR.clone().multiplyScalar(-HALF); // 08 threshold, west end
const FAF = THRESHOLD.clone().addScaledVector(DIR, -2.3); // final approach fix
const WAKE = { super: '#e879f9', heavy: '#f87171', medium: '#60a5fa', light: '#4ade80' };
type Wake = keyof typeof WAKE;
const ARRIVALS: { cs: string; type: string; wake: Wake }[] = [
  { cs: 'SKY907', type: 'B77W', wake: 'heavy' },
  { cs: 'NLB204', type: 'A320', wake: 'medium' },
  { cs: 'FAB221', type: 'B738', wake: 'medium' },
];
const DEPARTURES: { cs: string; type: string; wake: Wake }[] = [
  { cs: 'NLB118', type: 'A321', wake: 'medium' },
  { cs: 'VLX601', type: 'A388', wake: 'super' },
  { cs: 'ORV315', type: 'AT76', wake: 'light' },
];
const TEXT = {
  en: { heard: 'heard ✓', takeoff: 'TAKE-OFF', landing: 'LANDING' },
  ro: { heard: 'auzit ✓', takeoff: 'DECOLARE', landing: 'ATERIZARE' },
};

/** Top view of an airliner, nose along +x, about 0.2 long. */
function planeGeometry() {
  const s = new Shape();
  s.moveTo(0.1, 0);
  s.lineTo(0.02, 0.012);
  s.lineTo(-0.01, 0.09);
  s.lineTo(-0.03, 0.09);
  s.lineTo(-0.02, 0.012);
  s.lineTo(-0.075, 0.01);
  s.lineTo(-0.09, 0.04);
  s.lineTo(-0.1, 0.04);
  s.lineTo(-0.095, 0);
  s.lineTo(-0.1, -0.04);
  s.lineTo(-0.09, -0.04);
  s.lineTo(-0.075, -0.01);
  s.lineTo(-0.02, -0.012);
  s.lineTo(-0.03, -0.09);
  s.lineTo(-0.01, -0.09);
  s.lineTo(0.02, -0.012);
  s.closePath();
  return new ShapeGeometry(s);
}

const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.pow(1 - x, 3));
const smooth = (a: number, b: number, x: number) => {
  const k = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return k * k * (3 - 2 * k);
};

const create: SceneFactory = (ctx) => {
  const { scene, camera, lite, calm } = ctx;
  const lang = document.documentElement.lang === 'ro' ? 'ro' : 'en';
  const tx = TEXT[lang];
  const tilt = new Group();
  tilt.rotation.x = -0.95;
  scene.add(tilt);

  tilt.add(scope());
  const sweepMesh = sweep();
  sweepMesh.position.z = 0.001;
  tilt.add(sweepMesh);

  const runway = runwayGroup();
  runway.rotation.z = RWY_ANGLE;
  runway.position.z = 0.002;
  runway.scale.setScalar(1.5);
  tilt.add(runway);
  const runwayLights = runway.children.find((o) => o instanceof Points) as Points;
  const lightsMat = runwayLights.material as PointsMaterial;

  const tower = towerGroup();
  const TOWER_AT = new Vector3(0.35, 0.5, 0);
  tower.group.position.copy(TOWER_AT);
  tower.group.scale.setScalar(1.05);
  tilt.add(tower.group);

  // arrival routes (dashed) into the final approach fix, then the final approach itself
  const arrivalRoutes = [
    [new Vector3(-3.7, 1.9, 0), new Vector3(-3.0, 0.9, 0), FAF],
    [new Vector3(-1.2, 3.7, 0), new Vector3(-2.2, 1.6, 0), FAF],
    [new Vector3(-1.6, -3.6, 0), new Vector3(-2.6, -1.4, 0), FAF],
  ].map((pts) => new CatmullRomCurve3([...pts, THRESHOLD.clone(), THRESHOLD.clone().addScaledVector(DIR, 0.9)]));
  const routeMat = new LineDashedMaterial({ color: PHOSPHOR, dashSize: 0.08, gapSize: 0.1, transparent: true, opacity: 0.35 });
  for (const c of arrivalRoutes) {
    const l = new Line(new BufferGeometry().setFromPoints(c.getPoints(90)), routeMat);
    l.computeLineDistances();
    tilt.add(l);
  }
  // departure route: off the east end, then a turn to the north-east
  const END = DIR.clone().multiplyScalar(HALF);
  const departure = new CatmullRomCurve3([
    THRESHOLD.clone().addScaledVector(DIR, 0.05),
    END.clone(),
    END.clone().addScaledVector(DIR, 0.9),
    new Vector3(2.6, 1.3, 0),
    new Vector3(3.2, 2.6, 0),
  ]);
  const sid = new Line(
    new BufferGeometry().setFromPoints(departure.getPoints(90)),
    new LineDashedMaterial({ color: 0xfbbf24, dashSize: 0.08, gapSize: 0.1, transparent: true, opacity: 0.4 }),
  );
  sid.computeLineDistances();
  tilt.add(sid);

  // aircraft: glyph, drop line and shadow (for height), and a callsign tag
  const planeGeo = planeGeometry();
  const makeAircraft = (wake: Wake, label: string) => {
    const color = WAKE[wake];
    const body = new Mesh(planeGeo, new MeshBasicMaterial({ color, transparent: true, side: DoubleSide }));
    body.scale.setScalar(2.3);
    const drop = new Line(
      new BufferGeometry().setFromPoints([new Vector3(), new Vector3(0, 0, 1)]),
      new LineBasicMaterial({ color, transparent: true, opacity: 0.45 }),
    );
    const shadow = new Mesh(new CircleGeometry(0.025, 10), new MeshBasicMaterial({ color, transparent: true, opacity: 0.5 }));
    const tag = makeLabel(label, { color, border: color, height: lite ? 0.46 : 0.36, overlay: true });
    const g = new Group();
    g.add(body);
    tilt.add(g, tag.sprite);
    if (!lite) tilt.add(drop, shadow);
    return { g, body, drop, shadow, tag, color };
  };
  const arrivals = (lite ? ARRIVALS.slice(0, 2) : ARRIVALS).map((a) => ({ ...a, ...makeAircraft(a.wake, `${a.cs} · ${a.type}`) }));
  const deps = DEPARTURES.map((d) => ({ ...d, ...makeAircraft(d.wake, `${d.cs} · ${d.type}`) }));

  const place = (
    ac: { g: Group; drop: Line; shadow: Mesh; tag: { sprite: { position: Vector3; material: { opacity: number } } } },
    p: Vector3,
    heading: number,
    z: number,
    opacity: number,
  ) => {
    ac.g.position.set(p.x, p.y, z + 0.003);
    ac.g.rotation.z = heading;
    ac.g.visible = opacity > 0.01;
    ((ac.g.children[0] as Mesh).material as MeshBasicMaterial).opacity = opacity;
    ac.drop.position.set(p.x, p.y, 0.002);
    ac.drop.scale.set(1, 1, Math.max(0.001, z));
    ((ac.drop.material as LineBasicMaterial).opacity = 0.45 * opacity);
    ac.shadow.position.set(p.x, p.y, 0.002);
    ((ac.shadow.material as MeshBasicMaterial).opacity = 0.5 * opacity);
    ac.tag.sprite.position.set(p.x, p.y + 0.16, z + 0.42);
    ac.tag.sprite.material.opacity = opacity;
  };

  // an arrival's life: route → final (descending) → touchdown → roll-out → turn off; lasts three cycles
  const tmpP = new Vector3();
  const tmpT = new Vector3();
  const touchU = arrivalRoutes.map((c) => {
    // fraction of the curve at the threshold (nearest sample)
    let best = 0;
    let bestD = 1e9;
    for (let i = 0; i <= 200; i++) {
      const d = c.getPointAt(i / 200).distanceTo(THRESHOLD);
      if (d < bestD) {
        bestD = d;
        best = i / 200;
      }
    }
    return best;
  });
  const LIFE = P * arrivals.length;

  // chips: landing sequence, and the radio column by the tower
  const k = lite ? 1.3 : 1; // bigger chips on phones
  const seqChip = makeLabel('#1', { color: '#e8f3ff', height: 0.34 * k, overlay: true, wide: true });
  tilt.add(seqChip.sprite);
  const radio = [0, 1, 2, 3, 4].map(() => makeLabel(' ', { color: '#e8f3ff', height: 0.33 * k, overlay: true, wide: true }));
  radio.forEach((r) => tilt.add(r.sprite));
  let radioPhase = -1;
  let seqText = '';

  let towerAngle = Math.atan2(TOWER_AT.y, TOWER_AT.x);
  if (towerAngle < 0) towerAngle += Math.PI * 2;
  let cabLit = 0;
  let prevAngle = 0;
  let baseZ = 10;
  return {
    resize() {
      baseZ = fitDistance(camera, RANGE + 0.35, 2.9);
    },
    update(t) {
      tick(scene, t);
      const { pointer } = ctx;
      const angle = (t * SWEEP_SPEED) % (Math.PI * 2);
      (sweepMesh.material as ShaderMaterial).uniforms.uAngle.value = angle;
      const ct = t % P; // time in the current cycle
      const cycle = Math.floor(t / P);

      // arrivals: arrival k touches down at cycle time 0 once every LIFE seconds
      let onFinal = arrivals[0];
      let finalLeft = 1e9;
      arrivals.forEach((a, k) => {
        const route = arrivalRoutes[k % arrivalRoutes.length];
        const life = (t + (arrivals.length - k) * P) % LIFE; // seconds since this arrival appeared
        const landAt = LIFE - P; // touchdown one cycle before the end of its life
        const uTouch = touchU[k % touchU.length];
        let u: number;
        let z: number;
        let op = 1;
        if (life < landAt) {
          u = (life / landAt) * uTouch;
          const toGo = route.getPointAt(u).distanceTo(THRESHOLD);
          z = Math.min(0.55, toGo * 0.2);
          if (landAt - life < finalLeft) {
            finalLeft = landAt - life;
            onFinal = a;
          }
          op = smooth(0, 0.8, life);
        } else {
          const r = (life - landAt) / P; // 0..1 during the landing cycle
          u = uTouch + (1 - uTouch) * ease(Math.min(1, r / 0.3));
          z = 0;
          op = 1 - smooth(0.3, 0.42, r);
        }
        route.getPointAt(Math.min(1, u), tmpP);
        route.getTangentAt(Math.min(1, u), tmpT);
        place(a, tmpP, Math.atan2(tmpT.y, tmpT.x), z, op);
      });
      // runway lights flare at touchdown
      lightsMat.opacity = 0.9 - 0.4 + 0.5 * (1 - smooth(0, 1.2, ct));
      lightsMat.size = 0.022 + 0.02 * (1 - smooth(0, 1.2, ct));

      // departure: holds until the arrival has rolled out, lines up, rolls, lifts off and climbs out
      const dep = deps[cycle % deps.length];
      deps.forEach((d) => {
        if (d !== dep) d.g.visible = false;
        if (d !== dep) {
          d.tag.sprite.material.opacity = 0;
          (d.drop.material as LineBasicMaterial).opacity = 0;
          (d.shadow.material as MeshBasicMaterial).opacity = 0;
        }
      });
      const hold = THRESHOLD.clone().addScaledVector(DIR, 0.05).add(new Vector3(-0.06, -0.22, 0));
      if (ct < 2.2) {
        place(dep, hold, RWY_ANGLE + Math.PI / 2, 0, smooth(0.4, 1, ct));
      } else if (ct < 2.7) {
        departure.getPointAt(0, tmpP);
        tmpP.lerpVectors(hold, tmpP, ease((ct - 2.2) / 0.5));
        place(dep, tmpP, RWY_ANGLE + (Math.PI / 2) * (1 - ease((ct - 2.2) / 0.5)), 0, 1);
      } else {
        const r = Math.min(1, (ct - 2.7) / (P - 2.7));
        const u = r < 0.3 ? 0.3 * Math.pow(r / 0.3, 2) * 0.55 : 0.165 + (r - 0.3) / 0.7 * 0.835; // accelerate, then climb
        departure.getPointAt(Math.min(1, u), tmpP);
        departure.getTangentAt(Math.min(1, u), tmpT);
        const z = r < 0.3 ? 0 : Math.min(0.9, (r - 0.3) * 1.3);
        place(dep, tmpP, Math.atan2(tmpT.y, tmpT.x), z, 1 - smooth(0.88, 1, r));
      }

      // landing sequence chip at the final approach fix
      const order = arrivals
        .map((a, k) => ({ a, left: (LIFE - P - ((t + (arrivals.length - k) * P) % LIFE)) }))
        .filter((o) => o.left > 0)
        .sort((x, y) => x.left - y.left);
      const text = order.slice(0, 2).map((o, i) => `#${i + 1} ${o.a.cs}`).join('  ') + ' · 08R';
      if (text !== seqText) {
        seqChip.set(text);
        seqText = text;
      }
      seqChip.sprite.position.set(FAF.x + 0.4, FAF.y - 0.55, 0.4);

      // radio column: the departure's clearance, then the arrival's, each in five steps
      const phase = ct < P / 2 ? 0 : 1;
      if (phase !== radioPhase || cycle !== Math.floor((t - 0.001) / P)) {
        const lines =
          phase === 0
            ? [`${dep.cs}, ready for departure`, tx.heard, tx.takeoff, '✓ ✓ ✓', `${dep.cs}, cleared for take-off 08R`]
            : [`${onFinal.cs}, established ILS 08R`, tx.heard, tx.landing, '✓ ✓ ✓', `${onFinal.cs}, cleared to land 08R`];
        const colors = ['#8be9ff', '#8be9ff', '#fbbf24', '#4dffb8', '#4dffb8'];
        radio.forEach((r, i) => r.set(lines[i], { color: colors[i], border: colors[i] }));
        radioPhase = phase;
      }
      const pt = ct - phase * (P / 2);
      radio.forEach((r, i) => {
        // bottom right of the scope, clear of the routes and the climb-out
        r.sprite.position.set(1.9, -1.0 - i * 0.5 * k, 0.5);
        const on = smooth(0.15 + i * 0.45, 0.35 + i * 0.45, pt) * (1 - smooth(P / 2 - 0.35, P / 2 - 0.05, pt));
        r.sprite.material.opacity = calm ? Math.min(on, 0.9) : on;
      });

      // the tower cab lights up as the sweep passes; the beacon blinks on its own rhythm
      if (swept(towerAngle, prevAngle, angle)) cabLit = 1;
      cabLit *= 0.975;
      tower.glassMat.opacity = 0.3 + cabLit * 0.6;
      tower.cabGlow.material.opacity = cabLit * 0.7;
      tower.beacon.material.opacity = calm ? 0.7 : 0.25 + Math.pow(Math.max(0, Math.sin(t * 2.6)), 6) * 0.75;

      prevAngle = angle;
      tilt.rotation.z = pointer.x * 0.12;
      camera.position.set(pointer.x * 0.6, 1.2 + pointer.y * 0.5, baseZ);
      camera.lookAt(0, -0.2, 0);
    },
    dispose() {
      disposeTree(scene);
    },
  };
};

export default create;
