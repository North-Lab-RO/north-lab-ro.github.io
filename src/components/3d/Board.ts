import {
  BufferGeometry,
  Group,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  QuadraticBezierCurve3,
  SphereGeometry,
  SRGBColorSpace,
  TextureLoader,
  Vector3,
} from 'three';
import { fitDistance, type SceneFactory } from './engine';
import { disposeTree, glowSprite } from './common';

const PHOTOS = [
  'portrait-1',
  'evidence-knives',
  'location-diner',
  'scene-detail',
  'portrait-2',
  'evidence-camera',
  'evidence-shirt',
];

// Hand-placed like a real evidence board: suspects left, scene centre, objects right.
const LAYOUT: [number, number, number][] = [
  [-2.7, 1.05, 0.1],
  [0.1, 1.35, 0.25],
  [2.75, 0.95, 0],
  [-0.05, -0.55, 0.45],
  [-2.55, -1.2, 0.2],
  [2.6, -1.25, 0.15],
  [-1.2, 0.3, -0.2],
];
const STRINGS: [number, number][] = [
  [0, 3],
  [4, 3],
  [1, 3],
  [3, 5],
  [2, 5],
  [0, 6],
  [6, 1],
];

const create: SceneFactory = (ctx) => {
  const { scene, camera } = ctx;
  const board = new Group();
  scene.add(board);

  const loader = new TextureLoader();
  const pins: Vector3[] = [];
  const cards: Group[] = [];

  PHOTOS.forEach((name, i) => {
    const card = new Group();
    const [x, y, z] = LAYOUT[i];
    card.position.set(x, y, z);
    card.rotation.z = (Math.random() - 0.5) * 0.22;

    const paper = new Mesh(new PlaneGeometry(1.36, 1.6), new MeshBasicMaterial({ color: 0xe9e4d8 }));
    const tex = loader.load(`/textures/${name}.webp`);
    tex.colorSpace = SRGBColorSpace;
    const photo = new Mesh(new PlaneGeometry(1.18, 1.18), new MeshBasicMaterial({ map: tex }));
    photo.position.set(0, 0.1, 0.002);
    const shadow = new Mesh(
      new PlaneGeometry(1.5, 1.74),
      new MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.45 }),
    );
    shadow.position.set(0.06, -0.08, -0.04);

    const pin = new Mesh(new SphereGeometry(0.06, 16, 12), new MeshBasicMaterial({ color: 0xff5a6a }));
    pin.position.set(0, 0.68, 0.05);
    card.add(shadow, paper, photo, pin);
    board.add(card);
    cards.push(card);
    pins.push(new Vector3(x, y + 0.68, z + 0.05));
  });

  const stringMat = new LineBasicMaterial({ color: 0xff5a6a, transparent: true, opacity: 0.85 });
  for (const [a, b] of STRINGS) {
    const p0 = pins[a];
    const p1 = pins[b];
    const mid = p0.clone().add(p1).multiplyScalar(0.5);
    mid.y -= 0.22;
    mid.z += 0.2;
    const pts = new QuadraticBezierCurve3(p0, mid, p1).getPoints(24);
    board.add(new Line(new BufferGeometry().setFromPoints(pts), stringMat));
  }

  const lamp = glowSprite('#8be9ff', 9, 0.12);
  lamp.position.set(0, 0.2, -1.5);
  board.add(lamp);

  let baseZ = 8.5;
  return {
    resize() {
      baseZ = fitDistance(camera, 3.55, 2.25);
    },
    update(t) {
      const { pointer } = ctx;
      board.rotation.y = Math.sin(t * 0.18) * 0.18 + pointer.x * 0.22;
      board.rotation.x = -pointer.y * 0.12;
      cards.forEach((c, i) => {
        c.position.z = LAYOUT[i][2] + Math.sin(t * 0.6 + i * 1.7) * 0.06;
      });
      camera.position.set(0, 0, baseZ);
      camera.lookAt(0, 0, 0);
    },
    dispose() {
      disposeTree(scene);
    },
  };
};

export default create;
