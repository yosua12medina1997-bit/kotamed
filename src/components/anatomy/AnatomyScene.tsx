/**
 * Visor 3D de KotaMed Anatomy Lab (solo navegador).
 * Motor Three.js desacoplado: construye una escena anatómica por sistemas,
 * permite rotación/zoom, selección por raycast, capas, transparencia,
 * vista explosionada, rayos X y animaciones fisiológicas.
 */
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { SYSTEMS, type SystemKey, type RegionKey } from "@/lib/anatomy/atlas";

const COLORS: Record<SystemKey, number> = {
  esqueleto: 0xe6ddc9,
  muscular: 0xb0463f,
  nervioso: 0xf2d861,
  arterial: 0xc8392f,
  venoso: 0x3f6fb5,
  linfatico: 0x79c9a8,
  organos: 0xa44a5c,
  fascias: 0xd9cbb2,
  piel: 0xd8a17a,
};

const REGION_TARGET: Record<RegionKey, [number, number, number]> = {
  "cuerpo-completo": [0, 0.1, 3.6],
  cabeza: [0, 1.35, 1.3],
  cuello: [0, 1.1, 1.2],
  torax: [0, 0.6, 1.8],
  abdomen: [0, 0.15, 1.8],
  pelvis: [0, -0.25, 1.7],
  "miembro-superior": [0.7, 0.5, 1.7],
  "miembro-inferior": [0.3, -0.9, 2.0],
};

export interface ViewerState {
  layers: Record<SystemKey, boolean>;
  region: RegionKey;
  transparent: boolean;
  xray: boolean;
  exploded: boolean;
  animate: "none" | "latido" | "respiracion" | "peristaltismo" | "rotacion";
  isolated: string | null;
  hidden: string[];
  selected: string | null;
}

function mesh(
  geo: THREE.BufferGeometry,
  system: SystemKey,
  id: string,
  pos: [number, number, number],
  rot: [number, number, number] = [0, 0, 0],
) {
  const m = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({
      color: COLORS[system],
      roughness: 0.42,
      metalness: 0.06,
      transparent: true,
      opacity: 1,
    }),
  );
  m.position.set(...pos);
  m.rotation.set(...rot);
  m.userData = { id, system };
  return m;
}

function buildBody() {
  const groups: Record<SystemKey, THREE.Group> = {} as any;
  for (const s of SYSTEMS) {
    groups[s.key] = new THREE.Group();
    groups[s.key].name = s.key;
  }

  // Esqueleto
  groups.esqueleto.add(mesh(new THREE.SphereGeometry(0.15, 32, 24), "esqueleto", "craneo", [0, 1.42, 0]));
  groups.esqueleto.add(mesh(new THREE.CapsuleGeometry(0.05, 0.1, 8, 16), "esqueleto", "craneo", [0, 1.25, 0.02]));
  for (let i = 0; i < 18; i++) {
    groups.esqueleto.add(
      mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.05, 12), "esqueleto", "columna", [0, 1.12 - i * 0.075, -0.06]),
    );
  }
  for (let i = 0; i < 8; i++) {
    const y = 0.95 - i * 0.085;
    const r = 0.19 + Math.sin((i / 8) * Math.PI) * 0.06;
    for (const side of [-1, 1]) {
      groups.esqueleto.add(
        mesh(new THREE.TorusGeometry(r, 0.014, 8, 24, Math.PI * 0.75), "esqueleto", "costillas", [0, y, -0.04], [
          Math.PI / 2,
          0,
          side > 0 ? Math.PI * 0.13 : Math.PI * 0.87,
        ]),
      );
    }
  }
  groups.esqueleto.add(mesh(new THREE.BoxGeometry(0.07, 0.34, 0.03), "esqueleto", "costillas", [0, 0.72, 0.14]));
  groups.esqueleto.add(mesh(new THREE.TorusGeometry(0.19, 0.05, 10, 26), "esqueleto", "pelvis", [0, -0.32, 0], [Math.PI / 2.2, 0, 0]));
  for (const side of [-1, 1]) {
    groups.esqueleto.add(mesh(new THREE.CapsuleGeometry(0.035, 0.42, 8, 16), "esqueleto", "humero", [side * 0.31, 0.7, 0], [0, 0, side * 0.06]));
    groups.esqueleto.add(mesh(new THREE.CapsuleGeometry(0.028, 0.36, 8, 16), "esqueleto", "humero", [side * 0.36, 0.24, 0]));
    groups.esqueleto.add(mesh(new THREE.CapsuleGeometry(0.05, 0.5, 8, 16), "esqueleto", "femur", [side * 0.12, -0.72, 0]));
    groups.esqueleto.add(mesh(new THREE.CapsuleGeometry(0.04, 0.44, 8, 16), "esqueleto", "femur", [side * 0.12, -1.3, 0]));
  }

  // Músculos
  for (const side of [-1, 1]) {
    groups.muscular.add(mesh(new THREE.CapsuleGeometry(0.06, 0.26, 10, 18), "muscular", "biceps", [side * 0.31, 0.72, 0.03]));
    groups.muscular.add(mesh(new THREE.CapsuleGeometry(0.085, 0.34, 10, 18), "muscular", "cuadriceps", [side * 0.12, -0.7, 0.04]));
  }
  groups.muscular.add(mesh(new THREE.SphereGeometry(0.22, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), "muscular", "diafragma", [0, 0.42, -0.01], [Math.PI, 0, 0]));

  // Órganos
  groups.organos.add(mesh(new THREE.SphereGeometry(0.11, 24, 20), "organos", "corazon", [-0.03, 0.72, 0.02]));
  for (const side of [-1, 1]) {
    const lung = mesh(new THREE.SphereGeometry(0.13, 24, 20), "organos", "pulmones", [side * 0.14, 0.78, -0.01]);
    lung.scale.set(0.85, 1.5, 0.85);
    groups.organos.add(lung);
  }
  const liver = mesh(new THREE.SphereGeometry(0.15, 24, 20), "organos", "higado", [0.1, 0.32, 0.03]);
  liver.scale.set(1.15, 0.6, 0.7);
  groups.organos.add(liver);
  const stomach = mesh(new THREE.CapsuleGeometry(0.07, 0.1, 12, 20), "organos", "estomago", [-0.12, 0.26, 0.04], [0, 0, 0.6]);
  groups.organos.add(stomach);
  for (const side of [-1, 1]) {
    const k = mesh(new THREE.SphereGeometry(0.055, 20, 16), "organos", "rinones", [side * 0.13, 0.14, -0.09]);
    k.scale.set(0.7, 1.3, 0.7);
    groups.organos.add(k);
  }
  const gut = mesh(new THREE.TorusKnotGeometry(0.12, 0.035, 90, 12, 2, 3), "organos", "intestino", [0, -0.02, 0.02]);
  groups.organos.add(gut);

  // Nervioso
  const brain = mesh(new THREE.SphereGeometry(0.115, 28, 22), "nervioso", "encefalo", [0, 1.44, 0]);
  groups.nervioso.add(brain);
  groups.nervioso.add(mesh(new THREE.CapsuleGeometry(0.022, 1.05, 8, 14), "nervioso", "medula-espinal", [0, 0.72, -0.06]));

  // Arterias / venas
  const aortaCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.78, 0),
    new THREE.Vector3(0.02, 0.95, -0.02),
    new THREE.Vector3(-0.04, 0.86, -0.06),
    new THREE.Vector3(-0.02, 0.4, -0.05),
    new THREE.Vector3(0, -0.2, -0.05),
  ]);
  groups.arterial.add(mesh(new THREE.TubeGeometry(aortaCurve, 60, 0.022, 12), "arterial", "aorta", [0, 0, 0]));
  const cavaCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.05, 1.05, -0.03),
    new THREE.Vector3(0.05, 0.8, -0.02),
    new THREE.Vector3(0.05, 0.2, -0.03),
    new THREE.Vector3(0.05, -0.25, -0.04),
  ]);
  groups.venoso.add(mesh(new THREE.TubeGeometry(cavaCurve, 50, 0.02, 12), "venoso", "vena-cava", [0, 0, 0]));

  // Linfático, fascias, piel
  for (let i = 0; i < 10; i++) {
    groups.linfatico.add(
      mesh(new THREE.SphereGeometry(0.018, 12, 10), "linfatico", "linfatico", [
        (i % 2 ? 1 : -1) * (0.08 + (i % 3) * 0.05),
        0.9 - i * 0.09,
        0.02,
      ]),
    );
  }
  const fascia = mesh(new THREE.CapsuleGeometry(0.27, 0.7, 12, 24), "fascias", "fascias", [0, 0.45, 0]);
  (fascia.material as THREE.MeshStandardMaterial).opacity = 0.18;
  groups.fascias.add(fascia);
  const skin = mesh(new THREE.CapsuleGeometry(0.3, 0.8, 16, 32), "piel", "piel", [0, 0.45, 0]);
  (skin.material as THREE.MeshStandardMaterial).opacity = 0.15;
  groups.piel.add(skin);

  return groups;
}

export default function AnatomyScene({
  state,
  onSelect,
  onReady,
}: {
  state: ViewerState;
  onSelect: (id: string | null) => void;
  onReady?: (api: { screenshot: () => void; resetView: () => void }) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const ctx = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    groups: Record<SystemKey, THREE.Group>;
    root: THREE.Group;
    dispose: () => void;
  } | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 0.35, 3.6);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    host.appendChild(renderer.domElement);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    renderer.domElement.style.touchAction = "none";

    scene.add(new THREE.HemisphereLight(0xbfe9ff, 0x1a1a2a, 0.9));
    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(2.5, 3, 3);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x7de2d1, 0.7);
    rim.position.set(-3, 1, -2);
    scene.add(rim);

    const root = new THREE.Group();
    const groups = buildBody();
    for (const g of Object.values(groups)) root.add(g);
    scene.add(root);

    let rotY = 0.2;
    let rotX = 0;
    let dist = 3.6;
    let targetY = 0.35;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let moved = 0;

    const onDown = (e: PointerEvent) => {
      dragging = true;
      moved = 0;
      lastX = e.clientX;
      lastY = e.clientY;
      renderer.domElement.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      moved += Math.abs(dx) + Math.abs(dy);
      rotY += dx * 0.006;
      rotX = Math.max(-0.9, Math.min(0.9, rotX + dy * 0.004));
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const onUp = (e: PointerEvent) => {
      dragging = false;
      if (moved < 5) pick(e);
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      dist = Math.max(0.7, Math.min(7, dist + e.deltaY * 0.0022));
    };

    const raycaster = new THREE.Raycaster();
    const pick = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObjects(root.children, true).filter((h) => h.object.visible);
      onSelect(hits.length ? (hits[0].object.userData as any).id : null);
    };

    renderer.domElement.addEventListener("pointerdown", onDown);
    renderer.domElement.addEventListener("pointermove", onMove);
    renderer.domElement.addEventListener("pointerup", onUp);
    renderer.domElement.addEventListener("wheel", onWheel, { passive: false });

    const resize = () => {
      const w = host.clientWidth || 1;
      const h = host.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    let raf = 0;
    const clock = new THREE.Clock();
    const tick = () => {
      const s = stateRef.current;
      const t = clock.getElapsedTime();
      const [tx, ty, td] = REGION_TARGET[s.region] ?? REGION_TARGET["cuerpo-completo"];
      targetY += (ty - targetY) * 0.06;
      dist += (td - dist) * 0.03;
      if (s.animate === "rotacion") rotY += 0.004;
      root.rotation.y = rotY;
      root.rotation.x = rotX;

      for (const sys of SYSTEMS) {
        const g = groups[sys.key];
        g.visible = s.layers[sys.key] !== false;
        g.position.set(0, 0, 0);
        g.traverse((o) => {
          const m = o as THREE.Mesh;
          if (!(m as any).isMesh) return;
          const id = (m.userData as any).id as string;
          const mat = m.material as THREE.MeshStandardMaterial;
          const isolate = s.isolated;
          const hidden = s.hidden.includes(id);
          m.visible = !hidden && (!isolate || isolate === id);
          const base = sys.key === "piel" || sys.key === "fascias" ? 0.16 : 1;
          let op = base;
          if (s.transparent) op = Math.min(base, 0.35);
          if (s.xray) op = sys.key === "esqueleto" ? 1 : 0.18;
          mat.opacity = op;
          mat.emissiveIntensity = 1;
          mat.emissive.setHex(s.selected === id ? 0x2fd3c0 : 0x000000);
          if (s.exploded) {
            const dir = sys.key === "esqueleto" ? 0 : 1;
            m.position.z = (m.userData as any).z0 ?? m.position.z;
          }
        });
        if (s.exploded) {
          const idx = SYSTEMS.findIndex((x) => x.key === sys.key);
          g.position.x = (idx - 4) * 0.16;
          g.position.z = (idx - 4) * 0.05;
        }
      }

      // Animaciones fisiológicas
      const beat = 1 + Math.sin(t * 6) * 0.06;
      const breath = 1 + Math.sin(t * 1.6) * 0.05;
      groups.organos.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!(m as any).isMesh) return;
        const id = (m.userData as any).id;
        if (id === "corazon" && s.animate === "latido") m.scale.setScalar(beat);
        else if (id === "corazon") m.scale.setScalar(1);
        if (id === "pulmones") {
          const k = s.animate === "respiracion" ? breath : 1;
          m.scale.set(0.85 * k, 1.5 * k, 0.85 * k);
        }
        if (id === "intestino") {
          m.rotation.y = s.animate === "peristaltismo" ? t * 0.6 : 0;
        }
      });

      camera.position.set(tx, targetY, dist);
      camera.lookAt(0, targetY, 0);
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    tick();

    onReady?.({
      screenshot: () => {
        const url = renderer.domElement.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = url;
        a.download = "kotamed-anatomy.png";
        a.click();
      },
      resetView: () => {
        rotX = 0;
        rotY = 0.2;
        dist = 3.6;
      },
    });

    ctx.current = {
      renderer,
      scene,
      camera,
      groups,
      root,
      dispose: () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        renderer.domElement.removeEventListener("pointerdown", onDown);
        renderer.domElement.removeEventListener("pointermove", onMove);
        renderer.domElement.removeEventListener("pointerup", onUp);
        renderer.domElement.removeEventListener("wheel", onWheel);
        renderer.dispose();
        host.removeChild(renderer.domElement);
      },
    };
    return () => ctx.current?.dispose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={hostRef} className="absolute inset-0" />;
}
