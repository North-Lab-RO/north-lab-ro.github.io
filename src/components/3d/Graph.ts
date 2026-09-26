import {
  AdditiveBlending,
  BufferGeometry,
  CanvasTexture,
  Color,
  Group,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  Vector3,
} from 'three';
import { fitDistance, type SceneFactory } from './engine';
import { disposeTree, glowSprite } from './common';
import { ATHENA_PROFILE, SHIELD_RINGS, meanderPath } from './athena-emblem';

/** An investigation as a network: subject → identifiers → findings that analysts confirm or reject. */

const LABELS = {
  en: ['domain', 'email', 'username', 'phone', 'IP address', 'company', 'image', 'social profile'],
  ro: ['domeniu', 'email', 'utilizator', 'telefon', 'adresă IP', 'companie', 'imagine', 'profil social'],
};
const INDIGO = new Color(0x818cf8);
const PENDING = new Color(0xeab308);
const CONFIRMED = new Color(0x22c55e);
const REJECTED = new Color(0xef4444);
const CYCLE = 9;

function label(text: string): Sprite {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 64;
  const g = c.getContext('2d')!;
  g.font = '500 26px sans-serif';
  const w = Math.min(248, g.measureText(text).width + 28);
  g.fillStyle = 'rgba(10,16,34,0.85)';
  g.beginPath();
  g.roundRect((256 - w) / 2, 10, w, 42, 21);
  g.fill();
  g.strokeStyle = 'rgba(129,140,248,0.6)';
  g.lineWidth = 2;
  g.stroke();
  g.fillStyle = '#e0e7ff';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 128, 32);
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  const s = new Sprite(new SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  s.scale.set(1.1, 0.275, 1);
  return s;
}

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

const create: SceneFactory = (ctx) => {
  const { scene, camera, lite } = ctx;
  const lang = document.documentElement.lang === 'ro' ? 'ro' : 'en';
  const net = new Group();
  scene.add(net);

  // Athena's shield stands behind the investigation; it turns gently with the pointer, not with the network.
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

  // subject
  const subject = new Mesh(new SphereGeometry(0.26, 24, 16), new MeshBasicMaterial({ color: INDIGO }));
  const subjectGlow = glowSprite('#818cf8', 2.4, 0.55);
  net.add(subject, subjectGlow);

  const lineMat = (opacity: number) =>
    new LineBasicMaterial({ color: INDIGO, transparent: true, opacity, blending: AdditiveBlending, depthWrite: false });
  const link = (a: Vector3, b: Vector3, opacity: number) => new Line(new BufferGeometry().setFromPoints([a, b]), lineMat(opacity));

  type Finding = { mesh: Mesh; mat: MeshBasicMaterial; from: Vector3; to: Vector3; pulse: Mesh; offset: number; confirmed: boolean };
  const findings: Finding[] = [];
  const nodeGeo = new SphereGeometry(0.11, 16, 12);
  const findGeo = new SphereGeometry(0.07, 12, 10);
  const pulseGeo = new SphereGeometry(0.035, 8, 6);
  const n = LABELS.en.length;

  for (let i = 0; i < n; i++) {
    // identifiers spread over a sphere around the subject
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const th = Math.PI * (3 - Math.sqrt(5)) * i;
    const p = new Vector3(Math.cos(th) * r * 2.1, y * 1.5, Math.sin(th) * r * 2.1);
    const node = new Mesh(nodeGeo, new MeshBasicMaterial({ color: 0xc7d2fe }));
    node.position.copy(p);
    const tag = label(LABELS[lang][i]);
    tag.position.copy(p).add(new Vector3(0, 0.32, 0));
    net.add(node, tag, link(new Vector3(), p, 0.55));

    const per = lite ? 1 : 2;
    for (let k = 0; k < per; k++) {
      const dir = p.clone().normalize();
      const side = new Vector3(-dir.z, 0.4 - k * 0.8, dir.x).normalize().multiplyScalar(0.55);
      const q = p.clone().add(dir.multiplyScalar(0.85)).add(side);
      const mat = new MeshBasicMaterial({ color: PENDING, transparent: true });
      const mesh = new Mesh(findGeo, mat);
      mesh.position.copy(q);
      const pulse = new Mesh(pulseGeo, new MeshBasicMaterial({ color: 0xe0e7ff, transparent: true, blending: AdditiveBlending }));
      net.add(mesh, pulse, link(p, q, 0.25));
      findings.push({ mesh, mat, from: p, to: q, pulse, offset: (i * per + k) * 0.61, confirmed: (i + k) % 4 !== 1 });
    }
  }

  let baseZ = 9;
  return {
    resize() {
      baseZ = fitDistance(camera, 3.4, 2.95);
    },
    update(t, dt) {
      const { pointer } = ctx;
      net.rotation.y = t * 0.12 + pointer.x * 0.35;
      net.rotation.x = -pointer.y * 0.18 + Math.sin(t * 0.2) * 0.05;
      subjectGlow.scale.setScalar(2.2 + Math.sin(t * 1.6) * 0.25);

      for (const f of findings) {
        const tc = (t + f.offset) % CYCLE;
        // the moment an analyst confirms a finding, the shield's rim answers
        const prev = (t - (dt || 0.016) + f.offset) % CYCLE;
        if (f.confirmed && prev < 4 && tc >= 4) rimFlash = 1;
        // a finding arrives along its edge, waits for review, then is confirmed or rejected
        const travel = Math.min(1, tc / 1.6);
        f.pulse.position.lerpVectors(f.from, f.to, travel);
        (f.pulse.material as MeshBasicMaterial).opacity = travel < 1 ? 1 : 0;
        if (tc < 1.6) {
          f.mat.color.copy(PENDING);
          f.mat.opacity = travel;
          f.mesh.scale.setScalar(0.6 + travel * 0.4);
        } else if (tc < 4) {
          f.mat.color.copy(PENDING);
          f.mat.opacity = 1;
          f.mesh.scale.setScalar(1 + Math.sin(tc * 6) * 0.08);
        } else if (f.confirmed) {
          f.mat.color.copy(CONFIRMED);
          f.mat.opacity = tc > CYCLE - 0.8 ? (CYCLE - tc) / 0.8 : 1;
          f.mesh.scale.setScalar(1.15);
        } else {
          f.mat.color.copy(REJECTED);
          const k = Math.min(1, (tc - 4) / 1.5);
          f.mat.opacity = 1 - k * 0.8;
          f.mesh.scale.setScalar(1 - k * 0.4);
        }
      }

      rimFlash *= 0.96;
      (rim.material as MeshBasicMaterial).opacity = 0.32 + rimFlash * 0.45;
      shield.rotation.y = pointer.x * 0.15 + Math.sin(t * 0.3) * 0.05;
      shield.rotation.x = -pointer.y * 0.1;

      camera.position.set(0, 0.2, baseZ);
      camera.lookAt(0, 0, 0);
    },
    dispose() {
      disposeTree(scene);
    },
  };
};

export default create;
