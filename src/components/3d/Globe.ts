import {
  AdditiveBlending,
  BufferGeometry,
  Float32BufferAttribute,
  Group,
  Line,
  Points,
  QuadraticBezierCurve3,
  ShaderMaterial,
  Vector3,
} from 'three';
import { fitDistance, type SceneFactory } from './engine';
import { disposeTree, glowSprite, starField, tick } from './common';

const R = 2.1;

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
        float a = smoothstep(0.5, 0.1, d) * mix(0.12, 0.95, smoothstep(-0.2, 0.9, vFace));
        gl_FragColor = vec4(vec3(0.545, 0.914, 1.0), a);
      }`,
  });
  return new Points(geo, mat);
}

function arc(from: Vector3, to: Vector3, offset: number): Line {
  const mid = from.clone().add(to).multiplyScalar(0.5);
  const lift = 1.25 + from.distanceTo(to) * 0.22;
  mid.normalize().multiplyScalar(R * lift);
  const curve = new QuadraticBezierCurve3(from, mid, to);
  const pts = curve.getPoints(72);
  const geo = new BufferGeometry().setFromPoints(pts);
  geo.setAttribute('u', new Float32BufferAttribute(pts.map((_, i) => i / (pts.length - 1)), 1));
  const mat = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uOffset: { value: offset } },
    vertexShader: /* glsl */ `
      attribute float u;
      varying float vU;
      void main() { vU = u; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uOffset;
      varying float vU;
      void main() {
        float head = fract(uTime * 0.22 + uOffset);
        float pulse = smoothstep(0.18, 0.0, head - vU) * step(vU, head);
        vec3 ice = vec3(0.545, 0.914, 1.0);
        vec3 aurora = vec3(0.302, 1.0, 0.722);
        vec3 col = mix(ice, aurora, vU);
        float a = 0.1 + pulse * 0.9;
        gl_FragColor = vec4(col, a);
      }`,
  });
  return new Line(geo, mat);
}

function randomOnSphere(): Vector3 {
  const u = Math.random() * 2 - 1;
  const th = Math.random() * Math.PI * 2;
  const s = Math.sqrt(1 - u * u);
  return new Vector3(Math.cos(th) * s, u, Math.sin(th) * s).multiplyScalar(R);
}

const create: SceneFactory = (ctx) => {
  const { scene, camera, lite } = ctx;
  const globe = new Group();
  globe.rotation.z = 0.35;
  scene.add(globe);

  globe.add(dotGlobe(lite ? 1400 : 2800));

  // One story, many sources: every outlet's coverage converges on the same node.
  const story = new Vector3(0.35, 0.55, 1).normalize().multiplyScalar(R);
  const storyGlow = glowSprite('#4dffb8', 0.9, 0.9);
  storyGlow.position.copy(story);
  globe.add(storyGlow);

  const sourceCount = lite ? 12 : 18;
  const sourcePos: number[] = [];
  for (let i = 0; i < sourceCount; i++) {
    let p = randomOnSphere();
    while (p.distanceTo(story) < 1.1) p = randomOnSphere();
    sourcePos.push(p.x, p.y, p.z);
    globe.add(arc(p, story, i / sourceCount));
  }
  const srcGeo = new BufferGeometry();
  srcGeo.setAttribute('position', new Float32BufferAttribute(sourcePos, 3));
  globe.add(
    new Points(
      srcGeo,
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        uniforms: { uPixel: { value: Math.min(window.devicePixelRatio, 2) } },
        vertexShader: /* glsl */ `
          uniform float uPixel;
          void main() {
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = 8.0 * uPixel * (10.0 / -mv.z);
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: /* glsl */ `
          void main() {
            float d = length(gl_PointCoord - 0.5);
            gl_FragColor = vec4(0.91, 0.953, 1.0, smoothstep(0.5, 0.15, d));
          }`,
      }),
    ),
  );

  scene.add(starField(lite ? 250 : 600, 30, [-25, -8]));

  let baseZ = 8;
  return {
    resize() {
      baseZ = fitDistance(camera, R * 1.25, R * 1.25);
    },
    update(t) {
      tick(scene, t);
      const { pointer } = ctx;
      globe.rotation.y = t * 0.08 + pointer.x * 0.35;
      globe.rotation.x = pointer.y * 0.2;
      storyGlow.scale.setScalar(0.8 + Math.sin(t * 2.2) * 0.18);
      camera.position.set(0, 0, baseZ);
      camera.lookAt(0, 0, 0);
    },
    dispose() {
      disposeTree(scene);
    },
  };
};

export default create;
