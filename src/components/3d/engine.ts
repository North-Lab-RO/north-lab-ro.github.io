import { WebGLRenderer, PerspectiveCamera, Scene } from 'three';

export interface SceneContext {
  scene: Scene;
  camera: PerspectiveCamera;
  renderer: WebGLRenderer;
  host: HTMLElement;
  /** Smoothed pointer in [-1, 1], (0,0) at centre. Touch-drag and device tilt feed it too. */
  pointer: { x: number; y: number };
  /** 0 → 1 as the host scrolls from the top of the viewport to fully past it. */
  scroll: { progress: number };
  /** True on small or low-core devices: scenes should draw less. */
  lite: boolean;
  /** True when the visitor prefers reduced motion: scenes keep moving, but gently and without parallax. */
  calm: boolean;
  width: number;
  height: number;
}

export interface SceneInstance {
  update(time: number, delta: number): void;
  resize?(width: number, height: number): void;
  dispose?(): void;
}

export type SceneFactory = (ctx: SceneContext) => SceneInstance;

const clamp = (v: number) => Math.max(-1, Math.min(1, v));
const CALM_SPEED = 0.35;
const DPR_STEPS = [2, 1.5, 1, 0.75];

export function mountScene(host: HTMLElement, factory: SceneFactory): () => void {
  const canvas = host.querySelector('canvas');
  if (!canvas) return () => {};

  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch {
    host.classList.add('no-webgl');
    return () => {};
  }

  const small = window.innerWidth < 768;
  const lite = small || (navigator.hardwareConcurrency ?? 8) <= 4;
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let dpr = Math.min(window.devicePixelRatio, small ? 1.5 : 2);
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x000000, 0);

  const scene = new Scene();
  const camera = new PerspectiveCamera(35, 1, 0.1, 100);
  const target = { x: 0, y: 0 };
  const ctx: SceneContext = {
    scene,
    camera,
    renderer,
    host,
    pointer: { x: 0, y: 0 },
    scroll: { progress: 0 },
    lite,
    calm,
    width: 1,
    height: 1,
  };

  const instance = factory(ctx);
  const speed = calm ? CALM_SPEED : 1;
  let simTime = 4;
  let last = performance.now();
  let visible = false;
  let raf = 0;

  // Frame-time governor: a slow device first loses resolution, then frame rate. The scene never freezes.
  let minFrameMs = 0;
  let fps = 0;
  const samples: number[] = [];
  const govern = (ms: number) => {
    samples.push(ms);
    if (samples.length < 30) return;
    const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
    samples.length = 0;
    fps = Math.round(1000 / avg);
    if (avg < 34) return;
    const next = DPR_STEPS.find((s) => s < dpr - 0.01);
    if (next) {
      dpr = next;
      renderer.setPixelRatio(dpr);
      resize();
    } else if (!minFrameMs) {
      minFrameMs = 1000 / 30 - 2;
    }
  };

  const resize = () => {
    const { clientWidth: w, clientHeight: h } = host;
    if (!w || !h) return;
    ctx.width = w;
    ctx.height = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    instance.resize?.(w, h);
    renderer.render(scene, camera);
  };

  const readScroll = () => {
    const r = host.getBoundingClientRect();
    ctx.scroll.progress = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height)));
  };

  const loop = () => {
    raf = requestAnimationFrame(loop);
    const now = performance.now();
    const frameMs = now - last;
    if (frameMs < minFrameMs) return;
    last = now;
    const delta = Math.min(frameMs / 1000, 0.05) * speed;
    simTime += delta;
    if (!calm) {
      ctx.pointer.x += (target.x - ctx.pointer.x) * 0.05;
      ctx.pointer.y += (target.y - ctx.pointer.y) * 0.05;
    }
    readScroll();
    instance.update(simTime, delta);
    renderer.render(scene, camera);
    govern(frameMs);
  };

  const start = () => {
    if (raf) return;
    last = performance.now();
    loop();
  };
  const stop = () => {
    cancelAnimationFrame(raf);
    raf = 0;
  };

  const onPointer = (e: PointerEvent) => {
    const r = host.getBoundingClientRect();
    target.x = clamp(((e.clientX - r.left) / r.width) * 2 - 1);
    target.y = clamp(-(((e.clientY - r.top) / r.height) * 2 - 1));
  };
  const onLeave = () => {
    target.x = 0;
    target.y = 0;
  };
  const onTilt = (e: DeviceOrientationEvent) => {
    if (e.gamma == null || e.beta == null) return;
    target.x = clamp(e.gamma / 30);
    target.y = clamp((45 - e.beta) / 30);
  };

  const io = new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !document.hidden) start();
      else stop();
    },
    { rootMargin: '100px' },
  );
  const onVisibility = () => (document.hidden || !visible ? stop() : start());

  const ro = new ResizeObserver(resize);
  ro.observe(host);
  io.observe(host);
  if (!calm) {
    window.addEventListener('pointermove', onPointer, { passive: true });
    host.addEventListener('pointerleave', onLeave);
    if (small) window.addEventListener('deviceorientation', onTilt, { passive: true });
  }
  document.addEventListener('visibilitychange', onVisibility);

  resize();
  readScroll();
  instance.update(simTime, 0);
  renderer.render(scene, camera);
  requestAnimationFrame(() => host.classList.add('is-live'));

  // ?debug=1 shows what the scene is doing on this device.
  let debugTimer = 0;
  if (new URLSearchParams(location.search).has('debug')) {
    const gl = renderer.getContext();
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const gpu = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : 'hidden';
    const box = document.createElement('pre');
    box.className = 'scene-debug';
    host.appendChild(box);
    const paint = () => {
      box.textContent = [
        `gpu      ${gpu.slice(0, 60)}`,
        `software ${/swiftshader|llvmpipe|software/i.test(gpu) ? 'YES (hardware acceleration off)' : 'no'}`,
        `fps      ${fps || '…'}${minFrameMs ? ' (capped 30)' : ''}`,
        `dpr      ${dpr}`,
        `calm     ${calm ? 'yes (reduced motion is on)' : 'no'}`,
        `running  ${raf ? 'yes' : 'paused (off-screen)'}`,
      ].join('\n');
    };
    paint();
    debugTimer = window.setInterval(paint, 1000);
  }

  return () => {
    stop();
    clearInterval(debugTimer);
    ro.disconnect();
    io.disconnect();
    window.removeEventListener('pointermove', onPointer);
    host.removeEventListener('pointerleave', onLeave);
    window.removeEventListener('deviceorientation', onTilt);
    document.removeEventListener('visibilitychange', onVisibility);
    instance.dispose?.();
    renderer.dispose();
  };
}

/** Camera distance at which a box of half-size (halfW, halfH) fits the view with some margin. */
export function fitDistance(camera: PerspectiveCamera, halfW: number, halfH: number, margin = 1.08): number {
  const t = Math.tan((camera.fov * Math.PI) / 360);
  return Math.max(halfH / t, halfW / (t * camera.aspect)) * margin;
}
