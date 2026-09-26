import {
  AdditiveBlending,
  BufferGeometry,
  DoubleSide,
  EdgesGeometry,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  OctahedronGeometry,
  PlaneGeometry,
  ShaderMaterial,
  Shape,
  ShapeGeometry,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { SceneFactory } from './engine';
import { disposeTree, glowSprite, starField, tick } from './common';
import { noise } from './glsl';

/** Six-pointed crystal with a long north–south axis: the "north star". */
function starGeometry(): BufferGeometry {
  const parts = [
    new OctahedronGeometry(1, 0).scale(0.62, 1.9, 0.62),
    new OctahedronGeometry(1, 0).scale(1.35, 0.42, 0.42),
    new OctahedronGeometry(1, 0).scale(0.42, 0.42, 1.35),
  ];
  const geo = mergeGeometries(parts)!;
  parts.forEach((p) => p.dispose());
  return geo;
}

const crystalMaterial = () =>
  new ShaderMaterial({
    transparent: true,
    uniforms: { uTime: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec3 vN;
      varying vec3 vView;
      varying vec3 vPos;
      void main() {
        vN = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vView = -mv.xyz;
        vPos = position;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      varying vec3 vN;
      varying vec3 vView;
      varying vec3 vPos;
      void main() {
        vec3 n = normalize(vN);
        vec3 v = normalize(vView);
        float fres = pow(1.0 - max(dot(n, v), 0.0), 2.4);
        float facet = dot(n, normalize(vec3(0.35, 0.85, 0.45))) * 0.5 + 0.5;
        vec3 ice = vec3(0.545, 0.914, 1.0);
        vec3 aurora = vec3(0.302, 1.0, 0.722);
        vec3 violet = vec3(0.604, 0.549, 1.0);
        vec3 deep = vec3(0.03, 0.06, 0.13);
        float band = sin(vPos.y * 2.2 + uTime * 0.5 + n.x * 2.5) * 0.5 + 0.5;
        vec3 tint = mix(ice, mix(aurora, violet, band), 0.25 + 0.3 * n.y);
        vec3 col = mix(deep, tint, 0.12 + 0.62 * pow(facet, 1.6));
        col += fres * ice * 1.1;
        gl_FragColor = vec4(col, 0.94);
      }`,
  });

/** Compass bezel: fine degree ticks, longer every 10°, longest at the cardinals. */
function bezel(radius: number): Group {
  const g = new Group();
  const pts: number[] = [];
  const steps = 180;
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const deg = i * 2;
    const len = deg % 90 === 0 ? 0.42 : deg % 10 === 0 ? 0.2 : 0.08;
    const c = Math.cos(a);
    const s = Math.sin(a);
    pts.push(c * radius, s * radius, 0, c * (radius - len), s * (radius - len), 0);
  }
  const tickGeo = new BufferGeometry();
  tickGeo.setAttribute('position', new Float32BufferAttribute(pts, 3));
  g.add(
    new LineSegments(
      tickGeo,
      new LineBasicMaterial({ color: 0x8be9ff, transparent: true, opacity: 0.5, blending: AdditiveBlending, depthWrite: false }),
    ),
  );

  const ring = (r: number, opacity: number) => {
    const p: number[] = [];
    const n = 256;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2;
      const a1 = ((i + 1) / n) * Math.PI * 2;
      p.push(Math.cos(a0) * r, Math.sin(a0) * r, 0, Math.cos(a1) * r, Math.sin(a1) * r, 0);
    }
    const geo = new BufferGeometry();
    geo.setAttribute('position', new Float32BufferAttribute(p, 3));
    return new LineSegments(
      geo,
      new LineBasicMaterial({ color: 0x8be9ff, transparent: true, opacity, blending: AdditiveBlending, depthWrite: false }),
    );
  };
  g.add(ring(radius + 0.18, 0.28));
  g.add(ring(radius - 0.62, 0.12));

  // North marker
  const tri = new Shape();
  tri.moveTo(0, 0.34);
  tri.lineTo(-0.14, 0);
  tri.lineTo(0.14, 0);
  tri.closePath();
  const marker = new Mesh(
    new ShapeGeometry(tri),
    new MeshBasicMaterial({ color: 0x4dffb8, transparent: true, opacity: 0.95, side: DoubleSide }),
  );
  marker.position.set(0, radius + 0.32, 0);
  g.add(marker);
  return g;
}

function auroraCurtain(): Mesh {
  const mat = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uFade: { value: 1 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uFade;
      varying vec2 vUv;
      ${noise}
      void main() {
        float x = vUv.x * 3.0;
        float t = uTime;
        float drift = fbm(vec2(x * 0.8 + t * 0.03, t * 0.04));
        float base = 0.42 + 0.11 * sin(x * 1.6 + t * 0.12) + 0.14 * (drift - 0.5);
        float d = vUv.y - base;
        float body = d > 0.0 ? exp(-d * 4.2) : exp(d * 22.0);
        float rays = 0.35 + 0.95 * pow(fbm(vec2(x * 7.0 + drift * 3.0, t * 0.09)), 1.6);
        float edge = smoothstep(0.0, 0.18, vUv.x) * smoothstep(1.0, 0.82, vUv.x);
        vec3 green = vec3(0.302, 1.0, 0.722);
        vec3 cyan = vec3(0.545, 0.914, 1.0);
        vec3 violet = vec3(0.604, 0.549, 1.0);
        vec3 col = mix(cyan, green, smoothstep(-0.02, 0.06, d));
        col = mix(col, violet, smoothstep(0.12, 0.42, d));
        float a = body * rays * edge * 0.42 * uFade;
        gl_FragColor = vec4(col * a, a);
      }`,
  });
  const mesh = new Mesh(new PlaneGeometry(30, 14), mat);
  mesh.position.set(0, 1.2, -8);
  return mesh;
}

const create: SceneFactory = (ctx) => {
  const { scene, camera, lite } = ctx;
  const rig = new Group();
  scene.add(rig);

  const crystalGeo = starGeometry();
  const crystal = new Mesh(crystalGeo, crystalMaterial());
  const edges = new LineSegments(
    new EdgesGeometry(crystalGeo, 1),
    new LineBasicMaterial({ color: 0xcff6ff, transparent: true, opacity: 0.6, blending: AdditiveBlending, depthWrite: false }),
  );
  const star = new Group();
  star.add(crystal, edges, glowSprite('#8be9ff', 4.2, 0.35));
  rig.add(star);

  const ring = bezel(3.2);
  // Tilted only enough to read as 3D: seen from the front, the bezel's inner ring (2.58) still frames
  // the star's tips (1.9), so the star never pokes out of its compass while it turns and bobs.
  const ringTilt = new Group();
  ringTilt.rotation.x = -0.42;
  ringTilt.add(ring);
  rig.add(ringTilt);

  const aurora = auroraCurtain();
  scene.add(aurora);
  const stars = starField(lite ? 450 : 1200);
  scene.add(stars);

  const look = new Vector3(0, 0, 0);
  let baseZ = 12;
  let baseX = 0;
  let baseY = 0;

  return {
    resize(w, h) {
      const aspect = w / h;
      const wide = aspect > 1.05;
      baseZ = wide ? 12 : 14;
      const halfH = Math.tan((camera.fov * Math.PI) / 360) * baseZ;
      const halfW = halfH * aspect;
      // Desktop: star owns the right half. Phone: star floats above the headline.
      baseX = wide ? halfW * 0.5 : 0;
      baseY = wide ? 0 : halfH * 0.4;
      // camera looks at the rig, so shift the view window instead of the rig
      camera.setViewOffset(w, h, wide ? -w * 0.3 : 0, wide ? 0 : h * 0.23, w, h);
      // on phones the whole compass (bezel + north marker) must fit the width, and the space above the headline
      rig.scale.setScalar(wide ? Math.min(0.85, halfW / 7) : Math.min(0.62, (halfW * 0.92) / 3.6, (halfH * 0.37) / 3.3));
      rig.position.x = baseX;
    },
    update(t) {
      const { pointer, scroll } = ctx;
      tick(scene, t);
      star.rotation.y = t * 0.32;
      star.rotation.x = Math.sin(t * 0.4) * 0.07 + pointer.y * 0.15;
      // The star breathes in place at the centre of its bezel; scrolling only turns the bezel.
      star.position.y = Math.sin(t * 0.8) * 0.04;
      ring.rotation.z = -t * 0.025 - scroll.progress * 1.6;
      ringTilt.rotation.y = pointer.x * 0.1;
      rig.position.y = baseY;
      (aurora.material as ShaderMaterial).uniforms.uFade.value = 1 - scroll.progress * 0.8;
      stars.rotation.z = t * 0.004;

      look.set(rig.position.x, rig.position.y, 0);
      camera.position.set(rig.position.x + pointer.x * 0.7, rig.position.y + pointer.y * 0.4 + 0.2, baseZ);
      camera.lookAt(look);
    },
    dispose() {
      disposeTree(scene);
    },
  };
};

export default create;
