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
  Vector3,
} from 'three';
import { fitDistance, type SceneFactory } from './engine';
import { disposeTree, glowSprite, tick } from './common';

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

interface Blip {
  path: CatmullRomCurve3;
  s: number;
  speed: number;
  glow: number;
  trail: Vector3[];
  painted: Vector3;
}

const create: SceneFactory = (ctx) => {
  const { scene, camera, lite } = ctx;
  const tilt = new Group();
  tilt.rotation.x = -0.95;
  scene.add(tilt);

  tilt.add(scope());
  const sweepMesh = sweep();
  sweepMesh.position.z = 0.001;
  tilt.add(sweepMesh);

  // Runway at the centre of the scope, oriented 08/26, with the control tower beside it at midfield.
  const runway = runwayGroup();
  runway.rotation.z = 0.14;
  runway.position.z = 0.002;
  runway.scale.setScalar(1.5);
  tilt.add(runway);
  // Arrivals end at the 08 threshold, the runway's western end.
  const threshold = new Vector3(-0.71, -0.1, 0);

  const tower = towerGroup();
  const TOWER_AT = new Vector3(0.22, 0.42, 0);
  tower.group.position.copy(TOWER_AT);
  tower.group.scale.setScalar(1.7);
  tilt.add(tower.group);
  let towerAngle = Math.atan2(TOWER_AT.y, TOWER_AT.x);
  if (towerAngle < 0) towerAngle += Math.PI * 2;
  let cabLit = 0;

  // Arrival streams converging on the runway.
  const routes = [
    [new Vector3(-3.9, 1.6, 0), new Vector3(-2.6, 0.4, 0), new Vector3(-1.4, -0.2, 0), threshold],
    [new Vector3(2.4, 3.1, 0), new Vector3(0.6, 2.2, 0), new Vector3(-2.0, 0.8, 0), new Vector3(-1.5, -0.25, 0), threshold],
    [new Vector3(1.8, -3.5, 0), new Vector3(-0.8, -2.6, 0), new Vector3(-2.2, -0.9, 0), new Vector3(-1.4, -0.28, 0), threshold],
    [new Vector3(3.8, -0.9, 0), new Vector3(1.4, -1.6, 0), new Vector3(-1.2, -1.4, 0), new Vector3(-1.6, -0.35, 0), threshold],
  ].map((pts) => new CatmullRomCurve3(pts));

  const dashed = new LineDashedMaterial({ color: PHOSPHOR, dashSize: 0.08, gapSize: 0.1, transparent: true, opacity: 0.35 });
  for (const route of routes) {
    const line = new Line(new BufferGeometry().setFromPoints(route.getPoints(80)), dashed);
    line.computeLineDistances();
    tilt.add(line);
  }

  const blips: Blip[] = [];
  const perRoute = lite ? 2 : 3;
  routes.forEach((path, r) => {
    for (let i = 0; i < perRoute; i++) {
      const s = (i / perRoute + r * 0.13) % 1;
      const p = path.getPointAt(s);
      blips.push({ path, s, speed: 0.012 + Math.random() * 0.006, glow: 0, trail: [], painted: p.clone() });
    }
  });

  const TRAIL = 4;
  const maxPts = blips.length * (TRAIL + 1);
  const pos = new Float32Array(maxPts * 3);
  const alpha = new Float32Array(maxPts);
  const blipGeo = new BufferGeometry();
  blipGeo.setAttribute('position', new Float32BufferAttribute(pos, 3));
  blipGeo.setAttribute('alpha', new Float32BufferAttribute(alpha, 1));
  const blipPoints = new Points(
    blipGeo,
    new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: { uPixel: { value: Math.min(window.devicePixelRatio, 2) } },
      vertexShader: /* glsl */ `
        attribute float alpha;
        uniform float uPixel;
        varying float vA;
        void main() {
          vA = alpha;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = (4.0 + alpha * 9.0) * uPixel * (11.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        varying float vA;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.05, d) * vA;
          gl_FragColor = vec4(mix(vec3(0.302, 1.0, 0.722), vec3(0.91, 1.0, 0.96), vA * 0.6), a);
        }`,
    }),
  );
  blipPoints.position.z = 0.003;
  tilt.add(blipPoints);

  let prevAngle = 0;
  let baseZ = 10;
  return {
    resize() {
      baseZ = fitDistance(camera, RANGE + 0.35, 2.9);
    },
    update(t, dt) {
      tick(scene, t);
      const { pointer } = ctx;
      const angle = (t * SWEEP_SPEED) % (Math.PI * 2);
      (sweepMesh.material as ShaderMaterial).uniforms.uAngle.value = angle;

      let k = 0;
      for (const b of blips) {
        b.s = (b.s + b.speed * (dt || 0.016)) % 1;
        const p = b.path.getPointAt(b.s);
        let a = Math.atan2(p.y, p.x);
        if (a < 0) a += Math.PI * 2;
        // Painted only when the beam passes: the display lags the aircraft like a real scope.
        if (swept(a, prevAngle, angle)) {
          b.trail.unshift(b.painted.clone());
          if (b.trail.length > TRAIL) b.trail.pop();
          b.painted.copy(p);
          b.glow = 1;
        }
        b.glow *= 0.992;
        pos.set([b.painted.x, b.painted.y, 0], k * 3);
        alpha[k++] = 0.35 + b.glow * 0.65;
        for (let i = 0; i < TRAIL; i++) {
          const tp = b.trail[i] ?? b.painted;
          pos.set([tp.x, tp.y, 0], k * 3);
          alpha[k++] = b.trail[i] ? 0.28 * (1 - i / TRAIL) * (0.4 + b.glow * 0.6) : 0;
        }
      }
      // The cab lights up as the sweep passes over the tower; the beacon blinks on its own rhythm.
      if (swept(towerAngle, prevAngle, angle)) cabLit = 1;
      cabLit *= 0.975;
      tower.glassMat.opacity = 0.3 + cabLit * 0.6;
      tower.cabGlow.material.opacity = cabLit * 0.7;
      const blink = Math.max(0, Math.sin(t * 2.6));
      tower.beacon.material.opacity = 0.25 + Math.pow(blink, 6) * 0.75;

      blipGeo.attributes.position.needsUpdate = true;
      blipGeo.attributes.alpha.needsUpdate = true;
      prevAngle = angle;

      tilt.rotation.z = pointer.x * 0.15;
      camera.position.set(pointer.x * 0.6, 1.2 + pointer.y * 0.5, baseZ);
      camera.lookAt(0, -0.2, 0);
    },
    dispose() {
      disposeTree(scene);
    },
  };
};

export default create;
