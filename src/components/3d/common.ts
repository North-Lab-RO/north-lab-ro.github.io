import {
  AdditiveBlending,
  BufferGeometry,
  CanvasTexture,
  Float32BufferAttribute,
  Mesh,
  Object3D,
  Points,
  ShaderMaterial,
  Sprite,
  SpriteMaterial,
  Color,
  Line,
  SRGBColorSpace,
} from 'three';

/** Soft radial glow, drawn once on a canvas. */
export function glowSprite(color: string, size: number, opacity = 1): Sprite {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, color);
  grad.addColorStop(0.25, color + 'aa');
  grad.addColorStop(1, color + '00');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const sprite = new Sprite(
    new SpriteMaterial({
      map: new CanvasTexture(c),
      blending: AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity,
    }),
  );
  sprite.scale.setScalar(size);
  return sprite;
}

/** Twinkling star field spread across a wide shell behind the subject. */
export function starField(count: number, spread = 40, depth: [number, number] = [-30, -6]): Points {
  const pos: number[] = [];
  const seed: number[] = [];
  for (let i = 0; i < count; i++) {
    pos.push((Math.random() - 0.5) * spread, (Math.random() - 0.5) * spread * 0.6, depth[0] + Math.random() * (depth[1] - depth[0]));
    seed.push(Math.random());
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(pos, 3));
  geo.setAttribute('seed', new Float32BufferAttribute(seed, 1));
  const mat = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uPixel: { value: Math.min(window.devicePixelRatio, 2) } },
    vertexShader: /* glsl */ `
      attribute float seed;
      uniform float uTime;
      uniform float uPixel;
      varying float vAlpha;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        float tw = 0.55 + 0.45 * sin(uTime * (0.6 + seed * 1.8) + seed * 40.0);
        vAlpha = tw * (0.35 + seed * 0.65);
        gl_PointSize = (1.2 + seed * 2.2) * uPixel * (18.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d) * vAlpha;
        gl_FragColor = vec4(vec3(0.85, 0.94, 1.0), a);
      }`,
  });
  return new Points(geo, mat);
}

export function tick(obj: Object3D, time: number) {
  obj.traverse((o) => {
    const m = (o as Mesh).material as ShaderMaterial | undefined;
    if (m && 'uniforms' in m && m.uniforms?.uTime) m.uniforms.uTime.value = time;
  });
}

export function disposeTree(root: Object3D) {
  root.traverse((o) => {
    const mesh = o as Mesh | Line | Points;
    mesh.geometry?.dispose?.();
    const mat = (mesh as Mesh).material;
    const mats = Array.isArray(mat) ? mat : mat ? [mat] : [];
    for (const m of mats) {
      for (const v of Object.values(m)) if (v && typeof v === 'object' && 'isTexture' in v) (v as { dispose(): void }).dispose();
      m.dispose();
    }
  });
}

export const hex = (css: string) => new Color(css);

export interface LabelStyle {
  color?: string;
  border?: string;
  bg?: string;
  /** Height of the chip in world units. */
  height?: number;
  bold?: boolean;
  /** Draw on top of everything (ignore depth). */
  overlay?: boolean;
}
export interface Label {
  sprite: Sprite;
  /** Redraw the chip; only call when the text or colour actually changes. */
  set(text: string, style?: Pick<LabelStyle, 'color' | 'border'>): void;
}

/** A text chip drawn once on a canvas and shown as a camera-facing sprite. */
export function makeLabel(text: string, style: LabelStyle = {}): Label {
  const W = 512;
  const H = 96;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  const sprite = new Sprite(
    new SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: !style.overlay }),
  );
  const h = style.height ?? 0.275;
  sprite.scale.set((h * W) / H, h, 1);
  let color = style.color ?? '#e0e7ff';
  let border = style.border ?? 'rgba(129,140,248,0.6)';
  const draw = (t: string) => {
    g.clearRect(0, 0, W, H);
    g.font = `${style.bold ? 600 : 500} 40px sans-serif`;
    const w = Math.min(W - 8, g.measureText(t).width + 44);
    g.fillStyle = style.bg ?? 'rgba(10,16,34,0.86)';
    g.beginPath();
    g.roundRect((W - w) / 2, 14, w, 68, 34);
    g.fill();
    g.strokeStyle = border;
    g.lineWidth = 3;
    g.stroke();
    g.fillStyle = color;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(t, W / 2, 50);
    tex.needsUpdate = true;
  };
  draw(text);
  return {
    sprite,
    set(t, next) {
      if (next?.color) color = next.color;
      if (next?.border) border = next.border;
      draw(t);
    },
  };
}
