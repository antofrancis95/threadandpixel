"use client";

import { useEffect, useRef, type RefObject } from "react";
import * as THREE from "three";

/**
 * Lightweight silk drape: a subdivided plane displaced in the vertex shader.
 * No physics solver, no textures: a few layered folds, a cursor ripple, and
 * ivory shading with a faint gold sheen. Pauses when the hero is off-screen.
 */

const VERT = /* glsl */ `
  uniform float uTime;
  uniform vec2 uMouse;
  uniform float uMouseStrength;
  uniform float uScroll;
  uniform vec2 uHalfSize;
  varying vec3 vNormal;
  varying vec2 vUv;
  varying float vHeight;

  float drape(vec2 p) {
    float t = uTime * 0.32;
    float calm = 1.0 - uScroll * 0.65;
    float ny = p.y / uHalfSize.y; // -1 bottom .. 1 top
    float h = 0.0;
    h += sin(p.x * 1.45 + t) * 0.17;
    h += sin(p.y * 2.1 - t * 0.75 + p.x * 0.6) * 0.10;
    h += sin((p.x + p.y) * 3.0 + t * 1.2) * 0.045;
    // hanging folds: vertical ridges, stronger toward the top where the cloth is held
    h += sin(p.x * 5.2 + sin(p.y * 1.1 + t * 0.5) * 0.9) * 0.065 * (0.65 + 0.35 * ny);
    // cursor ripple
    float d = distance(p, uMouse);
    h += exp(-d * d * 1.6) * sin(d * 8.0 - uTime * 3.4) * 0.2 * uMouseStrength;
    return h * calm;
  }

  void main() {
    vec3 p = position;
    float e = 0.025;
    float h = drape(p.xy);
    float hx = drape(p.xy + vec2(e, 0.0));
    float hy = drape(p.xy + vec2(0.0, e));
    p.z = h;
    vNormal = normalize(vec3(-(hx - h) / e, -(hy - h) / e, 1.0));
    vUv = uv;
    vHeight = h;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const FRAG = /* glsl */ `
  precision highp float;
  varying vec3 vNormal;
  varying vec2 vUv;
  varying float vHeight;

  void main() {
    vec3 n = normalize(vNormal);
    vec3 l = normalize(vec3(-0.45, 0.65, 1.0));
    vec3 ivory = vec3(0.969, 0.945, 0.910);   // #F7F1E8
    vec3 shade = vec3(0.80, 0.735, 0.64);     // warm fold shadow
    vec3 gold  = vec3(0.773, 0.659, 0.502);   // #C5A880

    float diff = clamp(dot(n, l), 0.0, 1.0);
    vec3 col = mix(shade, ivory, smoothstep(0.15, 1.0, diff));

    // satin sheen along the fold crests
    vec3 r = reflect(-l, n);
    float spec = pow(max(dot(r, vec3(0.0, 0.0, 1.0)), 0.0), 28.0);
    col += gold * spec * 0.3;

    // gold rim where the cloth turns away
    float rim = pow(1.0 - max(n.z, 0.0), 2.6);
    col = mix(col, gold, rim * 0.28);

    // very fine weave
    float weave = sin(vUv.x * 900.0) * sin(vUv.y * 900.0) * 0.012;
    col += weave;

    gl_FragColor = vec4(col, 1.0);
  }
`;

export default function ClothCanvas({ host }: { host: RefObject<HTMLElement | null> }) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mountEl = mountRef.current;
    const heroEl = host.current;
    if (!mountEl || !heroEl) return;
    const mount: HTMLDivElement = mountEl;
    const hero: HTMLElement = heroEl;

    // The plane extends past the viewport on every side, so there are no edges to
    // smooth: multisampling would only cost fill rate on high-DPI screens.
    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: true,
      powerPreference: "low-power",
      stencil: false,
      depth: false,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);
    renderer.domElement.setAttribute("aria-hidden", "true");
    renderer.domElement.style.opacity = "0";
    renderer.domElement.style.transition = "opacity 1.4s ease";

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 20);
    camera.position.set(0, 0, 4.4);

    const uniforms = {
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(99, 99) },
      uMouseStrength: { value: 0 },
      uScroll: { value: 0 },
      uHalfSize: { value: new THREE.Vector2(1, 1) },
    };
    const material = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms });
    let mesh: THREE.Mesh | null = null;

    let halfW = 1;
    let halfH = 1;

    function buildPlane(width: number, height: number) {
      if (mesh) {
        scene.remove(mesh);
        mesh.geometry.dispose();
      }
      const segX = Math.min(160, Math.max(80, Math.round(width * 32)));
      const segY = Math.min(120, Math.max(60, Math.round(height * 32)));
      const geo = new THREE.PlaneGeometry(width, height, segX, segY);
      mesh = new THREE.Mesh(geo, material);
      mesh.rotation.x = -0.08;
      mesh.rotation.y = 0.12;
      scene.add(mesh);
    }

    function resize() {
      const w = mount.clientWidth || 1;
      const h = mount.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      const visH = 2 * camera.position.z * Math.tan((camera.fov * Math.PI) / 360);
      const visW = visH * camera.aspect;
      halfW = (visW * 1.25) / 2;
      halfH = (visH * 1.25) / 2;
      uniforms.uHalfSize.value.set(halfW, halfH);
      buildPlane(halfW * 2, halfH * 2);
    }

    const ro = new ResizeObserver(resize);
    ro.observe(mount);
    resize();

    // Pointer → plane coordinates. Until the cursor arrives the ripple wanders on
    // its own (a "welcome" pass), so the drape visibly moves without interaction.
    const target = new THREE.Vector2(0.25 * halfW, 0.15 * halfH);
    let targetStrength = 1.6; // opening burst
    let interacting = false;
    let idleT = 0;
    // The headline sits over the left ~55% of the hero, where the drape is washed
    // out by the overlay. Only follow the cursor on the right side; over the text
    // the ripple keeps its own slow wander so the motion stays visible.
    const FOLLOW_FROM = 0.1; // normalised x (-1..1); roughly 55% across
    function onMove(e: PointerEvent) {
      const r = mount.getBoundingClientRect();
      const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
      const ny = -(((e.clientY - r.top) / r.height) * 2 - 1);
      if (nx < FOLLOW_FROM) {
        interacting = false;
        return;
      }
      target.set(nx * halfW * 0.8, ny * halfH * 0.8);
      targetStrength = 1;
      interacting = true;
    }
    function onLeave() {
      interacting = false;
    }
    hero.addEventListener("pointermove", onMove, { passive: true });
    hero.addEventListener("pointerleave", onLeave);

    // Scroll progress across the hero (calms the drape as you leave it)
    function onScroll() {
      const h = hero.offsetHeight || 1;
      uniforms.uScroll.value = Math.min(1, Math.max(0, window.scrollY / h));
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    // Render loop, paused when off-screen or tab hidden
    let visible = true;
    let raf = 0;
    const clock = new THREE.Clock();
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !raf) loop();
    });
    io.observe(hero);

    function loop() {
      if (!visible || document.hidden) {
        raf = 0;
        return;
      }
      raf = requestAnimationFrame(loop);
      const t = clock.getElapsedTime();
      uniforms.uTime.value = t;
      if (interacting) {
        targetStrength *= 0.985; // ripple fades when the cursor rests
      } else {
        // slow figure-of-eight drift across the right half of the hero
        idleT += 0.016;
        target.set((0.25 + Math.sin(idleT * 0.32) * 0.35) * halfW, Math.cos(idleT * 0.21) * 0.45 * halfH);
        targetStrength = Math.max(targetStrength * 0.99, 0.6);
      }
      uniforms.uMouse.value.lerp(target, interacting ? 0.08 : 0.03);
      uniforms.uMouseStrength.value += (targetStrength - uniforms.uMouseStrength.value) * 0.05;
      renderer.render(scene, camera);
    }
    function onVisibility() {
      if (!document.hidden && visible && !raf) {
        clock.getDelta();
        loop();
      }
    }
    document.addEventListener("visibilitychange", onVisibility);
    loop();
    requestAnimationFrame(() => {
      renderer.domElement.style.opacity = "1";
    });

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      hero.removeEventListener("pointermove", onMove);
      hero.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVisibility);
      material.dispose();
      mesh?.geometry.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, [host]);

  return <div ref={mountRef} style={{ position: "absolute", inset: 0 }} />;
}
