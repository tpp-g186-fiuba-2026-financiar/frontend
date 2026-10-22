import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface Props {
    series: Array<{ name: string; closes: number[] }>;
}

const PTS = 140;
const SPAN = 8.6;
const X0 = -5.6;
const LANE_H = 0.85;
const GAP = 1.25;
const TICK = 0.07;

function cssColor(name: string, fallback: string): string {
    const v = getComputedStyle(document.documentElement)
        .getPropertyValue(name)
        .trim();
    return v || fallback;
}

function rng(seed: number) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export default function HeroMonitor({ series }: Props) {
    const host = useRef<HTMLDivElement>(null);
    const key = series.map((s) => s.name).join(',');

    useEffect(() => {
        const el = host.current;
        if (!el) return;
        let renderer: THREE.WebGLRenderer;
        try {
            renderer = new THREE.WebGLRenderer({
                antialias: true,
                alpha: true,
            });
        } catch {
            return;
        }
        const W = el.clientWidth || 500;
        const H = el.clientHeight || 300;
        renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
        renderer.setSize(W, H);
        el.appendChild(renderer.domElement);

        const scene = new THREE.Scene();
        const cam = new THREE.PerspectiveCamera(36, W / H, 0.1, 100);
        const CAM = new THREE.Vector3(1.8, 3.6, 10.5);
        const LOOK = new THREE.Vector3(0.4, 0.4, -2.4);
        const fit = () => {
            cam.zoom = cam.aspect > 1.6 ? 1.5 : 1;
            cam.updateProjectionMatrix();
        };
        cam.position.copy(CAM);
        cam.lookAt(LOOK);
        fit();

        const upHex = cssColor('--nx-up', '#3ee6a0');
        const dnHex = cssColor('--nx-down', '#ff5d73');
        const cUp = new THREE.Color(upHex);
        const cDn = new THREE.Color(dnHex);
        const cInk = new THREE.Color(cssColor('--nx-ink-3', '#6e8a83'));
        const r = rng(2026);
        const gauss = () => {
            let u = 0;
            let v = 0;
            while (!u) u = r();
            while (!v) v = r();
            return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
        };

        const grid = new THREE.GridHelper(16, 32, cInk, cInk);
        (grid.material as THREE.Material).transparent = true;
        (grid.material as THREE.Material).opacity = 0.1;
        grid.position.set(0, -0.62, -3);
        scene.add(grid);

        const names = series.length
            ? series.slice(0, 6)
            : [{ name: 'MERV', closes: [] }];
        const lanes = names.map((s, k) => {
            const z = 1.4 - k * GAP;
            const base = -1.3 + k * 0.5;
            const vals: number[] = [];
            const real = s.closes.filter((c) => c > 0).slice(-PTS);
            if (real.length > 10) {
                const scale = 1 / Math.max(1e-9, real[0]);
                real.forEach((c) => vals.push(Math.log(c * scale)));
            }
            while (vals.length < PTS)
                vals.unshift((vals[0] ?? 0) - gauss() * 0.012);
            const vol = 0.015 + r() * 0.01;
            const lpos = new Float32Array(PTS * 3);
            const lgeo = new THREE.BufferGeometry();
            lgeo.setAttribute('position', new THREE.BufferAttribute(lpos, 3));
            const line = new THREE.Line(
                lgeo,
                new THREE.LineBasicMaterial({
                    color: cUp.clone(),
                    transparent: true,
                    opacity: 0.95,
                }),
            );
            const fpos = new Float32Array(PTS * 2 * 3);
            const fgeo = new THREE.BufferGeometry();
            fgeo.setAttribute('position', new THREE.BufferAttribute(fpos, 3));
            const idx: number[] = [];
            for (let i = 0; i < PTS - 1; i++) {
                const a2 = i * 2;
                idx.push(a2, a2 + 1, a2 + 2, a2 + 1, a2 + 3, a2 + 2);
            }
            fgeo.setIndex(idx);
            const fill = new THREE.Mesh(
                fgeo,
                new THREE.MeshBasicMaterial({
                    color: cUp.clone(),
                    transparent: true,
                    opacity: 0.1,
                    side: THREE.DoubleSide,
                    depthWrite: false,
                }),
            );
            const head = new THREE.Mesh(
                new THREE.SphereGeometry(0.055, 12, 12),
                new THREE.MeshBasicMaterial({ color: 0xffffff }),
            );
            const halo = new THREE.Mesh(
                new THREE.SphereGeometry(0.16, 12, 12),
                new THREE.MeshBasicMaterial({
                    color: cUp.clone(),
                    transparent: true,
                    opacity: 0.3,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false,
                }),
            );
            const cv = document.createElement('canvas');
            cv.width = 256;
            cv.height = 64;
            const tex = new THREE.CanvasTexture(cv);
            const tag = new THREE.Sprite(
                new THREE.SpriteMaterial({
                    map: tex,
                    transparent: true,
                    depthWrite: false,
                }),
            );
            tag.scale.set(1.25, 0.31, 1);
            scene.add(fill, line, head, halo, tag);
            return {
                name: s.name,
                z,
                base,
                vals,
                vol,
                lpos,
                lgeo,
                line,
                fpos,
                fgeo,
                fill,
                head,
                halo,
                cv,
                tex,
                tag,
                lastTxt: '',
                mn: Math.min(...vals),
                mx: Math.max(...vals),
            };
        });

        type Lane = (typeof lanes)[number];
        const drawTag = (L: Lane) => {
            if (L.lastTxt) return;
            L.lastTxt = L.name;
            const x = L.cv.getContext('2d');
            if (!x) return;
            x.clearRect(0, 0, 256, 64);
            x.font = '600 26px JetBrains Mono, monospace';
            x.textBaseline = 'middle';
            x.fillStyle = '#eaf4f1';
            x.fillText(L.name, 6, 32);
            L.tex.needsUpdate = true;
        };
        const place = (L: Lane, frac: number) => {
            const mn = Math.min(...L.vals);
            const mx = Math.max(...L.vals);
            L.mn += (mn - L.mn) * 0.05;
            L.mx += (mx - L.mx) * 0.05;
            const span = Math.max(0.15, L.mx - L.mn);
            for (let i = 0; i < PTS; i++) {
                const x = X0 + ((i - frac) / (PTS - 1)) * SPAN;
                const y = L.base + ((L.vals[i] - L.mn) / span) * LANE_H;
                L.lpos.set([x, y, L.z], i * 3);
                L.fpos.set([x, y, L.z, x, L.base, L.z], i * 6);
            }
            L.lgeo.attributes.position.needsUpdate = true;
            L.fgeo.attributes.position.needsUpdate = true;
            const hx = L.lpos[(PTS - 1) * 3];
            const hy = L.lpos[(PTS - 1) * 3 + 1];
            L.head.position.set(hx, hy, L.z);
            L.halo.position.copy(L.head.position);
            L.tag.position.set(hx + 0.78, hy + 0.12, L.z);
            const pct = (Math.exp(L.vals[PTS - 1] - L.vals[PTS - 6]) - 1) * 100;
            const target = pct >= 0 ? cUp : cDn;
            (L.line.material as THREE.LineBasicMaterial).color.lerp(
                target,
                0.08,
            );
            (L.fill.material as THREE.MeshBasicMaterial).color.lerp(
                target,
                0.08,
            );
            (L.halo.material as THREE.MeshBasicMaterial).color.lerp(
                target,
                0.08,
            );
            drawTag(L);
        };

        const still =
            window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ??
            false;
        let acc = 0;
        let last = performance.now();
        let mx = 0;
        let my = 0;
        let raf = 0;
        const onMove = (e: PointerEvent) => {
            mx = e.clientX / window.innerWidth - 0.5;
            my = e.clientY / window.innerHeight - 0.5;
        };
        window.addEventListener('pointermove', onMove);
        const frame = (t: number) => {
            const dt = Math.min(0.1, Math.max(0, (t - last) / 1000));
            last = t;
            acc += dt;
            while (acc >= TICK) {
                acc -= TICK;
                lanes.forEach((L) => {
                    L.vol =
                        0.95 * L.vol +
                        0.05 * (0.012 + r() * 0.01) +
                        (r() < 0.004 ? 0.04 : 0);
                    L.vals.push(L.vals[PTS - 1] + gauss() * L.vol + 0.0005);
                    L.vals.shift();
                });
            }
            const frac = still ? 0 : acc / TICK;
            lanes.forEach((L, k) => {
                place(L, frac);
                L.halo.scale.setScalar(1 + Math.sin(t / 300 + k) * 0.2);
            });
            cam.position.set(CAM.x + mx * 1.2, CAM.y - my * 0.6, CAM.z);
            cam.lookAt(LOOK);
            renderer.render(scene, cam);
            if (!still) raf = requestAnimationFrame(frame);
        };
        raf = requestAnimationFrame(frame);
        const ro =
            typeof ResizeObserver !== 'undefined'
                ? new ResizeObserver(() => {
                      const w = el.clientWidth;
                      const h = el.clientHeight;
                      if (!w || !h) return;
                      renderer.setSize(w, h);
                      cam.aspect = w / h;
                      fit();
                  })
                : null;
        ro?.observe(el);
        return () => {
            cancelAnimationFrame(raf);
            ro?.disconnect();
            window.removeEventListener('pointermove', onMove);
            scene.traverse((o) => {
                const m = o as THREE.Mesh;
                m.geometry?.dispose();
                const mat = m.material as THREE.Material | undefined;
                mat?.dispose();
            });
            lanes.forEach((L) => L.tex.dispose());
            renderer.dispose();
            renderer.domElement.remove();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);

    return <div ref={host} className="nx-hero-orb" aria-hidden="true" />;
}
