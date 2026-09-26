import {
  AdditiveBlending,
  BufferGeometry,
  CanvasTexture,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Points,
  RingGeometry,
  ShaderMaterial,
  SRGBColorSpace,
  Vector3,
} from 'three';
import { fitDistance, type SceneFactory } from './engine';
import { disposeTree } from './common';

/**
 * COUNSELOR's pipeline, told in four stages driven by the page (host.dataset.stage, 0 → 3):
 * 0 sources on a globe · 1 articles clustering into stories · 2 one story analysed · 3 alerts and briefings.
 */

const R = 1.9;
const SOURCES = 41;
const CLUSTERS = 7;
const CLUSTER_COLORS = ['#8be9ff', '#4dffb8', '#9a8cff', '#ffaa00', '#6f86ff', '#ff8a6f', '#e8f3ff'];
const BAND_COLORS = ['#ffaa00', '#ff8800', '#ff4444'];

const TEXT = {
  en: {
    story: 'STORY · 9 SOURCES',
    title: ['Heat warning extended', 'across southern Romania'],
    bias: 'BIAS SPECTRUM',
    scale: ['LEFT', 'CENTRE', 'RIGHT'],
    consensus: 'CONSENSUS',
    known: 'KNOWN · 14 counties, until Sunday',
    unclear: 'UNCLEAR · schools, power grid',
    alert: 'ALERT · IMPORTANCE 44',
    alertSub: 'Why it matters: 14 counties affected',
    brief: '07:00 · MORNING BRIEFING',
    briefSub: '13 stories · Romania and world',
  },
  ro: {
    story: 'POVESTE · 9 SURSE',
    title: ['Cod galben de caniculă', 'prelungit în sudul țării'],
    bias: 'SPECTRUL SURSELOR',
    scale: ['STÂNGA', 'CENTRU', 'DREAPTA'],
    consensus: 'CONSENS',
    known: 'ȘTIM · 14 județe, până duminică',
    unclear: 'NECLAR · școli, rețeaua electrică',
    alert: 'ALERTĂ · IMPORTANȚĂ 44',
    alertSub: 'De ce contează: 14 județe afectate',
    brief: '07:00 · SINTEZA DE DIMINEAȚĂ',
    briefSub: '13 povești · România și lume',
  },
};

const seeded = (seed: number) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

function fibonacci(i: number, n: number, r: number): Vector3 {
  const y = 1 - (i / (n - 1)) * 2;
  const rad = Math.sqrt(1 - y * y);
  const th = Math.PI * (3 - Math.sqrt(5)) * i;
  return new Vector3(Math.cos(th) * rad * r, y * r, Math.sin(th) * rad * r);
}

function cardTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  g.fillStyle = 'rgba(10,20,38,0.94)';
  g.beginPath();
  g.roundRect(3, 3, w - 6, h - 6, 22);
  g.fill();
  g.strokeStyle = '#2a3d63';
  g.lineWidth = 3;
  g.stroke();
  draw(g);
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function storyCard(L: (typeof TEXT)['en']) {
  return cardTexture(640, 420, (g) => {
    g.fillStyle = '#8397b5';
    g.font = '500 20px monospace';
    g.fillText(L.story, 36, 56);
    g.fillStyle = '#e8f3ff';
    g.font = '300 34px sans-serif';
    g.fillText(L.title[0], 36, 110);
    g.fillText(L.title[1], 36, 150);
    g.fillStyle = '#8397b5';
    g.font = '500 16px monospace';
    g.fillText(L.bias, 36, 206);
    const grad = g.createLinearGradient(36, 0, 604, 0);
    grad.addColorStop(0, '#3e6fb0');
    grad.addColorStop(0.5, '#3a4a6e');
    grad.addColorStop(1, '#b4553a');
    g.fillStyle = grad;
    g.beginPath();
    g.roundRect(36, 220, 568, 12, 6);
    g.fill();
    [0.18, 0.31, 0.42, 0.47, 0.5, 0.55, 0.61, 0.7, 0.84].forEach((x) => {
      g.fillStyle = '#e8f3ff';
      g.beginPath();
      g.arc(36 + x * 568, 226, 8, 0, Math.PI * 2);
      g.fill();
    });
    g.fillStyle = '#8397b5';
    g.font = '500 14px monospace';
    g.fillText(L.scale[0], 36, 256);
    g.textAlign = 'center';
    g.fillText(L.scale[1], 320, 256);
    g.textAlign = 'right';
    g.fillText(L.scale[2], 604, 256);
    g.textAlign = 'left';
    g.font = '500 16px monospace';
    g.fillText(`${L.consensus} 78%`, 36, 300);
    g.fillStyle = '#1c2c4a';
    g.beginPath();
    g.roundRect(36, 314, 568, 12, 6);
    g.fill();
    const cg = g.createLinearGradient(36, 0, 480, 0);
    cg.addColorStop(0, '#8be9ff');
    cg.addColorStop(1, '#4dffb8');
    g.fillStyle = cg;
    g.beginPath();
    g.roundRect(36, 314, 568 * 0.78, 12, 6);
    g.fill();
    g.fillStyle = '#c9d6ea';
    g.font = '400 18px sans-serif';
    g.fillText(L.known, 36, 362);
    g.fillText(L.unclear, 36, 392);
  });
}

function chipCard(title: string, sub: string, color: string) {
  return cardTexture(460, 130, (g) => {
    g.fillStyle = color;
    g.beginPath();
    g.arc(40, 50, 9, 0, Math.PI * 2);
    g.fill();
    g.font = '500 20px monospace';
    g.fillText(title, 62, 57);
    g.fillStyle = '#c9d6ea';
    g.font = '400 19px sans-serif';
    g.fillText(sub, 36, 98);
  });
}

const create: SceneFactory = (ctx) => {
  const { scene, camera, lite, host } = ctx;
  const L = TEXT[document.documentElement.lang === 'ro' ? 'ro' : 'en'];
  const rand = seeded(20260926);
  const root = new Group();
  scene.add(root);

  // --- globe of dots + source nodes (stage 0) ---
  const globePos: number[] = [];
  const GN = lite ? 700 : 1400;
  for (let i = 0; i < GN; i++) globePos.push(...fibonacci(i, GN, R).toArray());
  const globeGeo = new BufferGeometry();
  globeGeo.setAttribute('position', new Float32BufferAttribute(globePos, 3));
  const globeMat = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: { uFade: { value: 1 }, uPixel: { value: Math.min(window.devicePixelRatio, 2) } },
    vertexShader: /* glsl */ `
      uniform float uPixel;
      varying float vFace;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vFace = dot(normalize(normalMatrix * normalize(position)), normalize(-mv.xyz));
        gl_PointSize = 2.4 * uPixel * (10.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uFade;
      varying float vFace;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.1, d) * mix(0.06, 0.55, smoothstep(-0.2, 0.9, vFace)) * uFade;
        gl_FragColor = vec4(0.545, 0.914, 1.0, a);
      }`,
  });
  const globe = new Points(globeGeo, globeMat);
  root.add(globe);

  const sources = Array.from({ length: SOURCES }, (_, i) => fibonacci(i, SOURCES, R).applyAxisAngle(new Vector3(0, 1, 0), 0.4));

  // --- cluster centres (stage 1) and the focused story (stage 2+) ---
  const centres = Array.from({ length: CLUSTERS }, (_, c) => {
    const a = (c / CLUSTERS) * Math.PI * 2 + 0.3;
    return c === 0 ? new Vector3(0, 0.1, 0.6) : new Vector3(Math.cos(a) * 2.6, Math.sin(a) * 1.5, Math.sin(a * 2) * 0.6 - 0.4);
  });

  // --- articles: one particle each, with a position for every stage ---
  const N = lite ? 450 : 1000;
  const aGlobe: number[] = [];
  const aCluster: number[] = [];
  const aFocus: number[] = [];
  const aColor: number[] = [];
  const aSeed: number[] = [];
  const aMain: number[] = [];
  const gauss = () => (rand() + rand() + rand() - 1.5) / 1.5;
  for (let i = 0; i < N; i++) {
    const src = sources[Math.floor(rand() * SOURCES)];
    const jitter = new Vector3(gauss(), gauss(), gauss()).multiplyScalar(0.12);
    aGlobe.push(...src.clone().add(jitter).toArray());
    // cluster 0 is the story we follow; it is the biggest
    const c = rand() < 0.22 ? 0 : 1 + Math.floor(rand() * (CLUSTERS - 1));
    const spread = c === 0 ? 0.42 : 0.3;
    const p = centres[c].clone().add(new Vector3(gauss(), gauss(), gauss()).multiplyScalar(spread));
    aCluster.push(...p.toArray());
    if (c === 0) {
      // the story's articles orbit the analysis card
      const a = rand() * Math.PI * 2;
      const r = 1.9 + gauss() * 0.18;
      aFocus.push(Math.cos(a) * r * 1.25, Math.sin(a) * r * 0.8 + 0.1, -0.5 + gauss() * 0.3);
    } else {
      const far = centres[c].clone().multiplyScalar(1.9);
      far.z -= 2.5;
      aFocus.push(...far.add(new Vector3(gauss(), gauss(), gauss()).multiplyScalar(0.4)).toArray());
    }
    const col = CLUSTER_COLORS[c];
    aColor.push(parseInt(col.slice(1, 3), 16) / 255, parseInt(col.slice(3, 5), 16) / 255, parseInt(col.slice(5, 7), 16) / 255);
    aSeed.push(rand());
    aMain.push(c === 0 ? 1 : 0);
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(aGlobe, 3));
  geo.setAttribute('aCluster', new Float32BufferAttribute(aCluster, 3));
  geo.setAttribute('aFocus', new Float32BufferAttribute(aFocus, 3));
  geo.setAttribute('aColor', new Float32BufferAttribute(aColor, 3));
  geo.setAttribute('aSeed', new Float32BufferAttribute(aSeed, 1));
  geo.setAttribute('aMain', new Float32BufferAttribute(aMain, 1));
  const articleMat = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: { uStage: { value: 0 }, uTime: { value: 0 }, uPixel: { value: Math.min(window.devicePixelRatio, 2) } },
    vertexShader: /* glsl */ `
      attribute vec3 aCluster;
      attribute vec3 aFocus;
      attribute vec3 aColor;
      attribute float aSeed;
      attribute float aMain;
      uniform float uStage;
      uniform float uTime;
      uniform float uPixel;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        // staggered transitions so articles leave one by one, not as a block
        float s1 = smoothstep(0.0, 1.0, clamp((uStage - aSeed * 0.35) / 0.65, 0.0, 1.0));
        float s2 = smoothstep(0.0, 1.0, clamp((uStage - 1.0 - aSeed * 0.35) / 0.65, 0.0, 1.0));
        // stage 0: articles stream outward from their source
        float stream = fract(uTime * 0.22 + aSeed);
        vec3 onGlobe = position * (1.0 + stream * 0.32);
        vec3 p = mix(onGlobe, aCluster, s1);
        p += vec3(sin(uTime * 0.7 + aSeed * 40.0), cos(uTime * 0.6 + aSeed * 30.0), 0.0) * 0.03 * s1;
        vec3 orbit = aFocus;
        float ang = uTime * 0.12 * aMain;
        orbit.xy = mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * orbit.xy;
        p = mix(p, orbit, s2);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vColor = mix(vec3(0.545, 0.914, 1.0), aColor, s1);
        float streamFade = mix(1.0 - stream * 0.8, 1.0, s1);
        vAlpha = streamFade * mix(1.0, mix(0.12, 1.0, aMain), s2);
        gl_PointSize = (2.6 + aMain * s2 * 1.4) * uPixel * (11.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        gl_FragColor = vec4(vColor, smoothstep(0.5, 0.05, d) * vAlpha);
      }`,
  });
  root.add(new Points(geo, articleMat));

  // --- story card (stage 2) and deliverables (stage 3) ---
  const card = new Mesh(new PlaneGeometry(2.9, 1.9), new MeshBasicMaterial({ map: storyCard(L), transparent: true, opacity: 0 }));
  card.position.set(0, 0.1, 0.4);
  root.add(card);

  const rings = BAND_COLORS.map((c) => {
    const m = new Mesh(
      new RingGeometry(0.98, 1.0, 96),
      new MeshBasicMaterial({ color: c, transparent: true, opacity: 0, side: DoubleSide, blending: AdditiveBlending, depthWrite: false }),
    );
    m.position.set(0, 0.1, 0.3);
    root.add(m);
    return m;
  });

  const alert = new Mesh(
    new PlaneGeometry(1.84, 0.52),
    new MeshBasicMaterial({ map: chipCard(L.alert, L.alertSub, BAND_COLORS[1]), transparent: true, opacity: 0 }),
  );
  const brief = new Mesh(
    new PlaneGeometry(1.84, 0.52),
    new MeshBasicMaterial({ map: chipCard(L.brief, L.briefSub, '#8be9ff'), transparent: true, opacity: 0 }),
  );
  root.add(alert, brief);

  let stage = 0;
  let baseZ = 9;
  let aspect = 1;
  return {
    resize(w, h) {
      aspect = w / h;
      baseZ = fitDistance(camera, 3.05, 2.35);
    },
    update(t, dt) {
      const target = Math.min(3, Math.max(0, parseFloat(host.dataset.stage ?? '0') || 0));
      stage += (target - stage) * Math.min(1, (dt || 0.016) * 3.2);
      articleMat.uniforms.uStage.value = stage;
      articleMat.uniforms.uTime.value = t;

      const s0 = 1 - Math.min(1, stage);
      const s2 = Math.min(1, Math.max(0, stage - 1.15) / 0.85);
      const s3 = Math.min(1, Math.max(0, stage - 2.15) / 0.85);

      globeMat.uniforms.uFade.value = s0;
      globe.rotation.y = t * 0.08;

      (card.material as MeshBasicMaterial).opacity = s2;
      card.scale.setScalar(0.85 + s2 * 0.15);
      card.position.y = 0.1 + (1 - s2) * -0.4 + s3 * 0.35;

      // importance rings pulse outward in the three band colours
      rings.forEach((ring, i) => {
        const k = ((t * 0.45 + i / 3) % 1);
        ring.scale.setScalar(1.3 + k * 1.9);
        ring.position.y = card.position.y;
        (ring.material as MeshBasicMaterial).opacity = s3 * (1 - k) * 0.9;
      });

      const side = aspect < 1 ? 0.62 : 1;
      (alert.material as MeshBasicMaterial).opacity = s3;
      alert.position.set(-2.1 * side - (1 - s3) * 0.6, -1.25, 0.8);
      (brief.material as MeshBasicMaterial).opacity = s3;
      brief.position.set(2.1 * side + (1 - s3) * 0.6, -1.25 + (aspect < 1 ? -0.62 : 0), 0.8);
      if (aspect < 1) alert.position.y = -1.25;

      const { pointer } = ctx;
      root.rotation.y = pointer.x * 0.12;
      root.rotation.x = -pointer.y * 0.06;
      camera.position.set(0, 0.1, baseZ * (1 - s2 * 0.12));
      camera.lookAt(0, 0, 0);
    },
    dispose() {
      disposeTree(scene);
    },
  };
};

export default create;
