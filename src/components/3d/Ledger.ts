import {
  AdditiveBlending,
  BufferGeometry,
  CanvasTexture,
  Color,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  LineLoop,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  SRGBColorSpace,
  Vector3,
} from 'three';
import { fitDistance, type SceneFactory } from './engine';
import { disposeTree, glowSprite } from './common';

// What the statement says, and what the model read. Row 2 is the classic failure: a dropped leading digit.
const ROWS = [
  { src: '1.284,50', read: '1284.50', ok: true },
  { src: '62,90', read: '62.90', ok: true },
  { src: '184,32', read: '84.32', ok: false },
  { src: '4.500,00', read: '4500.00', ok: true },
  { src: '37,15', read: '37.15', ok: true },
  { src: '219,99', read: '219.99', ok: true },
];
const CYCLE = 9.5;
const SHEET_X = -1.75;
const GATE_X = 0.3;
const LEDGER_X = 1.95;
const rowY = (i: number) => 1.0 - i * 0.4;
const trigger = (i: number) => 1.49 + 0.886 * i;
const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.pow(1 - x, 3));

function canvasTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!);
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
}

function sheetTexture() {
  return canvasTexture(512, 700, (g) => {
    g.fillStyle = '#0e1b33';
    roundRect(g, 0, 0, 512, 700, 18);
    g.fill();
    g.strokeStyle = '#2a3d63';
    g.lineWidth = 3;
    g.stroke();
    g.fillStyle = '#8397b5';
    g.fillRect(40, 44, 170, 16);
    g.fillStyle = '#9a8cff';
    g.fillRect(372, 44, 100, 16);
    g.fillStyle = '#1c2c4a';
    g.fillRect(40, 92, 432, 2);
    ROWS.forEach((r, i) => {
      const y = 150 + i * 87.5;
      g.fillStyle = '#8397b5';
      g.font = '22px monospace';
      g.fillText(`0${i + 3}.10`, 40, y);
      g.fillStyle = 'rgba(232,243,255,0.28)';
      g.fillRect(130, y - 16, 150 + ((i * 53) % 70), 14);
      g.fillStyle = '#e8f3ff';
      g.font = '26px monospace';
      g.textAlign = 'right';
      g.fillText(r.src, 472, y);
      g.textAlign = 'left';
      g.fillStyle = '#1c2c4a';
      g.fillRect(40, y + 30, 432, 1);
    });
  });
}

function tileTexture(text: string) {
  return canvasTexture(256, 72, (g) => {
    g.fillStyle = '#12213d';
    roundRect(g, 2, 2, 252, 68, 12);
    g.fill();
    g.strokeStyle = '#3a4f7a';
    g.lineWidth = 3;
    g.stroke();
    g.fillStyle = '#ffffff';
    g.font = '34px monospace';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, 128, 38);
  });
}

const create: SceneFactory = (ctx) => {
  const { scene, camera } = ctx;
  const root = new Group();
  scene.add(root);

  const sheet = new Mesh(new PlaneGeometry(2.4, 3.28), new MeshBasicMaterial({ map: sheetTexture(), transparent: true }));
  sheet.position.set(SHEET_X, 0, 0);
  sheet.rotation.y = 0.18;
  root.add(sheet);

  const beam = new Mesh(
    new PlaneGeometry(2.6, 0.035),
    new MeshBasicMaterial({ color: 0x9a8cff, transparent: true, blending: AdditiveBlending, depthWrite: false }),
  );
  beam.rotation.y = 0.18;
  const beamGlow = glowSprite('#9a8cff', 1.4, 0.35);
  beamGlow.scale.set(3, 0.5, 1);
  root.add(beam, beamGlow);

  // The guard: every number passes through here before it may touch the ledger.
  const gatePts = [
    [-0.28, -0.55],
    [0.28, -0.55],
    [0.28, 0.55],
    [-0.28, 0.55],
  ].flatMap(([x, y]) => [x, y, 0]);
  const gateGeo = new BufferGeometry();
  gateGeo.setAttribute('position', new Float32BufferAttribute(gatePts, 3));
  const gateMat = new LineBasicMaterial({ color: 0x9a8cff, transparent: true, opacity: 0.9 });
  const gate = new LineLoop(gateGeo, gateMat);
  gate.position.set(GATE_X, 0.2, 0.3);
  gate.rotation.y = -0.5;
  const gateGlow = glowSprite('#9a8cff', 2.2, 0.35);
  gateGlow.position.copy(gate.position);
  root.add(gate, gateGlow);

  const ledgerLine = new Mesh(new PlaneGeometry(0.012, 2.9), new MeshBasicMaterial({ color: 0x1c2c4a }));
  ledgerLine.position.set(LEDGER_X - 0.62, 0.05, 0);
  root.add(ledgerLine);

  const tiles = ROWS.map((r) => {
    const mat = new MeshBasicMaterial({ map: tileTexture(r.read), transparent: true, opacity: 0 });
    const mesh = new Mesh(new PlaneGeometry(0.92, 0.26), mat);
    root.add(mesh);
    return { mesh, mat };
  });
  const slotOf: number[] = [];
  let good = 0;
  ROWS.forEach((r, i) => (slotOf[i] = r.ok ? good++ : -1));

  const white = new Color(0xffffff);
  const aurora = new Color(0x4dffb8);
  const ember = new Color(0xff5a6a);
  const violet = new Color(0x9a8cff);
  const from = new Vector3();
  const to = new Vector3();
  const gateAt = new Vector3(GATE_X, 0.2, 0.35);

  let baseZ = 9;
  return {
    resize() {
      baseZ = fitDistance(camera, 2.95, 1.9);
    },
    update(t) {
      const { pointer } = ctx;
      const tc = (t + 1.5) % CYCLE;
      const fadeOut = tc > CYCLE - 0.8 ? (CYCLE - tc) / 0.8 : 1;

      // Beam sweeps the statement top to bottom, reaching each row as its tile lifts off.
      const bp = Math.min(1, Math.max(0, (tc - 0.6) / 6.2));
      const by = 1.4 - bp * 2.8;
      beam.position.set(SHEET_X, by, 0.02);
      beamGlow.position.set(SHEET_X, by, 0.05);
      const beamOn = tc > 0.5 && tc < 7.0 ? 1 : 0;
      (beam.material as MeshBasicMaterial).opacity = beamOn;
      beamGlow.material.opacity = 0.35 * beamOn;

      let flash: Color | null = null;
      ROWS.forEach((r, i) => {
        const { mesh, mat } = tiles[i];
        const u = (tc - trigger(i)) / 1.9;
        if (u <= 0) {
          mat.opacity = 0;
          return;
        }
        from.set(SHEET_X + 0.72, rowY(i), 0.1);
        if (u < 0.45) {
          const k = ease(u / 0.45);
          mesh.position.lerpVectors(from, gateAt, k);
          mesh.position.z += Math.sin(k * Math.PI) * 0.5;
          mat.opacity = Math.min(1, u * 8) * fadeOut;
          mat.color.copy(white);
          mesh.scale.setScalar(1);
        } else if (r.ok) {
          const k = ease((u - 0.45) / 0.55);
          to.set(LEDGER_X, 1.15 - slotOf[i] * 0.42, 0);
          mesh.position.lerpVectors(gateAt, to, k);
          mat.color.lerpColors(aurora, white, k);
          mat.opacity = fadeOut;
          if (u < 0.6) flash = aurora;
        } else {
          // Not a number on the page: the tile turns red at the gate and dissolves.
          const k = Math.min(1, (u - 0.45) / 0.4);
          mesh.position.copy(gateAt);
          mat.color.copy(ember);
          mat.opacity = (1 - k) * fadeOut;
          mesh.scale.setScalar(1 - k * 0.4);
          if (u < 0.75) flash = ember;
        }
        mesh.rotation.y = -0.15;
      });

      gateMat.color.copy(flash ?? violet);
      gateGlow.material.color.copy(flash ?? violet);
      gateGlow.material.opacity = flash ? 0.8 : 0.3;

      root.rotation.y = pointer.x * 0.18 + Math.sin(t * 0.25) * 0.04;
      root.rotation.x = -pointer.y * 0.08;
      camera.position.set(0, 0.1, baseZ);
      camera.lookAt(0, 0, 0);
    },
    dispose() {
      disposeTree(scene);
    },
  };
};

export default create;
