import { WebGLRenderer, PerspectiveCamera, Scene } from 'three';

export interface SceneContext {
  scene: Scene;
  camera: PerspectiveCamera;
  renderer: WebGLRenderer;
  /** Smoothed pointer in [-1, 1], (0,0) at centre. Touch-drag and device tilt feed it too. */
  pointer: { x: number; y: number };
  /** 0 → 1 as the host scrolls from the top of the viewport to fully past it. */
  scroll: { progress: number };
  /** True on small or low-core devices: scenes should draw less. */
  lite: boolean;
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
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
    pointer: { x: 0, y: 0 },
    scroll: { progress: 0 },
    lite,
    width: 1,
    height: 1,
  };

  const instance = factory(ctx);
  const t0 = performance.now();
  let last = t0;
  const elapsed = () => (performance.now() - t0) / 1000;
  let visible = false;
  let raf = 0;
  let still = reducedMotion();

  // Frame-time governor: if a device can't hold ~30 fps, drop resolution, then settle on a still frame.
  const samples: number[] = [];
  const govern = (ms: number) => {
    samples.push(ms);
    if (samples.length < 20) return;
    const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
    samples.length = 0;
    if (avg < 34) return;
    if (dpr > 0.75 && avg < 80) {
      dpr = dpr > 1 ? 1 : 0.75;
      renderer.setPixelRatio(dpr);
      resize();
    } else {
      still = true;
      stop();
      host.classList.add('is-static');
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
    if (still) renderOnce();
  };

  const readScroll = () => {
    const r = host.getBoundingClientRect();
    ctx.scroll.progress = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height)));
  };

  const renderOnce = () => {
    readScroll();
    instance.update(elapsed() + 4, 0);
    renderer.render(scene, camera);
  };

  const loop = () => {
    raf = requestAnimationFrame(loop);
    const now = performance.now();
    const frameMs = now - last;
    const delta = Math.min(frameMs / 1000, 0.05);
    last = now;
    ctx.pointer.x += (target.x - ctx.pointer.x) * 0.05;
    ctx.pointer.y += (target.y - ctx.pointer.y) * 0.05;
    readScroll();
    instance.update(elapsed(), delta);
    renderer.render(scene, camera);
    govern(frameMs);
  };

  const start = () => {
    if (raf || still) return;
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
    target.x = Math.max(-1, Math.min(1, e.gamma / 30));
    target.y = Math.max(-1, Math.min(1, (45 - e.beta) / 30));
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
  window.addEventListener('pointermove', onPointer, { passive: true });
  host.addEventListener('pointerleave', onLeave);
  if (small) window.addEventListener('deviceorientation', onTilt, { passive: true });
  document.addEventListener('visibilitychange', onVisibility);

  resize();
  renderOnce();
  requestAnimationFrame(() => host.classList.add('is-live'));

  return () => {
    stop();
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
