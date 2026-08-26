/**
 * KOTAMED ANATOMICAL CORE™ — motor 3D (solo navegador).
 * Corazón anatómico procedural de alta densidad: masa ventricular con surco
 * interventricular, aurículas, aorta, tronco pulmonar, venas pulmonares y red
 * coronaria. Material físico translúcido, iluminación cinematográfica médica,
 * flotación en microgravedad, pulso fisiológico sutil y parallax con inercia.
 *
 * Es únicamente capa visual: no lee datos ni permisos.
 */
import { useEffect, useRef } from "react";
import * as THREE from "three";

export type CoreFocus =
  | "cardiologia"
  | "pediatria"
  | "neurologia"
  | "neumologia"
  | "gastroenterologia"
  | null;

export interface HeartSceneProps {
  focus: CoreFocus;
  /** 0.7 – 1.3 aprox. Ajusta brillo ambiental por fase del día. */
  intensity?: number;
  base?: "light" | "dark";
  reducedMotion?: boolean;
  lowPower?: boolean;
}

/* --------------------------------------------------------- ruido procedural */

function hash(x: number, y: number, z: number) {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return s - Math.floor(s);
}
function vnoise(x: number, y: number, z: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const xf = x - xi;
  const yf = y - yi;
  const zf = z - zi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const w = zf * zf * (3 - 2 * zf);
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const c = (i: number, j: number, k: number) => hash(xi + i, yi + j, zi + k);
  return lerp(
    lerp(lerp(c(0, 0, 0), c(1, 0, 0), u), lerp(c(0, 1, 0), c(1, 1, 0), u), v),
    lerp(lerp(c(0, 0, 1), c(1, 0, 1), u), lerp(c(0, 1, 1), c(1, 1, 1), u), v),
    w,
  );
}
function fbm(x: number, y: number, z: number) {
  let a = 0.5;
  let f = 1;
  let sum = 0;
  for (let i = 0; i < 4; i++) {
    sum += a * vnoise(x * f, y * f, z * f);
    f *= 2.05;
    a *= 0.5;
  }
  return sum;
}

/* ------------------------------------------------------------- materiales */

function tissue(color: number, opts: Partial<THREE.MeshPhysicalMaterialParameters> = {}) {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.52,
    metalness: 0,
    clearcoat: 0.45,
    clearcoatRoughness: 0.55,
    sheen: 0.6,
    sheenColor: new THREE.Color(0xffc9c2),
    sheenRoughness: 0.7,
    transmission: 0.14,
    thickness: 0.9,
    attenuationDistance: 0.7,
    attenuationColor: new THREE.Color(0x8c3f46),
    ior: 1.38,
    emissive: new THREE.Color(0x220a0c),
    emissiveIntensity: 0.25,
    ...opts,
  });
}

/* --------------------------------------------------- geometría ventricular */

/** Deforma una esfera en masa ventricular con surcos y relieve orgánico. */
function ventricularGeometry() {
  const geo = new THREE.SphereGeometry(1, 190, 160);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const dir = v.clone().normalize();
    const y = dir.y;
    const az = Math.atan2(dir.z, dir.x); // -PI..PI (0 = frente derecho)

    // Perfil: ancho arriba (base), cónico hacia el ápex.
    let r = 1;
    const t = (y + 1) / 2; // 0 ápex, 1 base
    r *= 0.5 + 0.62 * Math.pow(t, 0.62);
    r *= 1 - 0.1 * Math.pow(1 - t, 2);

    // Asimetría: ventrículo izquierdo más voluminoso.
    r *= 1 + 0.11 * Math.cos(az - 0.5) * (0.35 + 0.65 * t);

    // Surco interventricular anterior y posterior.
    const groove = (a0: number, w: number, d: number) => {
      let d0 = az - a0;
      while (d0 > Math.PI) d0 -= Math.PI * 2;
      while (d0 < -Math.PI) d0 += Math.PI * 2;
      return -d * Math.exp(-(d0 * d0) / (w * w)) * (0.35 + 0.65 * (1 - Math.abs(y)));
    };
    r += groove(1.45, 0.28, 0.075);
    r += groove(-1.75, 0.3, 0.055);

    // Surco coronario (base auriculoventricular).
    r += -0.035 * Math.exp(-Math.pow((y - 0.55) / 0.09, 2));

    // Relieve orgánico fino.
    r += (fbm(dir.x * 3.1 + 5, dir.y * 3.1, dir.z * 3.1) - 0.5) * 0.045;
    r += (fbm(dir.x * 9 + 11, dir.y * 9, dir.z * 9) - 0.5) * 0.016;

    v.copy(dir).multiplyScalar(r);
    // Proporciones anatómicas: alargado y ligeramente aplanado.
    v.x *= 0.95;
    v.y *= 1.34;
    v.z *= 0.86;
    // Ápex desplazado (inclinación natural del eje cardíaco).
    v.x += -0.2 * Math.pow(Math.max(0, -dir.y), 1.6);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

function atriumGeometry(scale: THREE.Vector3) {
  const geo = new THREE.SphereGeometry(1, 90, 70);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const d = v.clone().normalize();
    const r = 1 + (fbm(d.x * 4 + 2, d.y * 4, d.z * 4) - 0.5) * 0.1;
    v.copy(d).multiplyScalar(r).multiply(scale);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

function tube(points: [number, number, number][], radius: number, taper = 1) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const geo = new THREE.TubeGeometry(curve, 140, radius, 26, false);
  if (taper !== 1) {
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const count = pos.count;
    const v = new THREE.Vector3();
    for (let i = 0; i < count; i++) {
      v.fromBufferAttribute(pos, i);
      pos.setXYZ(i, v.x, v.y, v.z);
    }
  }
  return geo;
}

export default function HeartScene({
  focus,
  intensity = 1,
  base = "dark",
  reducedMotion = false,
  lowPower = false,
}: HeartSceneProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const propsRef = useRef({ focus, intensity, base, reducedMotion, lowPower });
  propsRef.current = { focus, intensity, base, reducedMotion, lowPower };

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 60);
    camera.position.set(0, 0.1, 6.2);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, lowPower ? 1.25 : 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    host.appendChild(renderer.domElement);
    Object.assign(renderer.domElement.style, {
      width: "100%",
      height: "100%",
      display: "block",
      touchAction: "none",
    });

    /* --------------------------------------------------------- iluminación */
    const ambient = new THREE.HemisphereLight(0xcfe9ff, 0x0a1524, 0.55);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xf2f8ff, 2.5); // frontal-superior fría
    keyLight.position.set(1.4, 3.1, 3.4);
    scene.add(keyLight);

    const rimLight = new THREE.SpotLight(0x2fd8d0, 5.2, 16, Math.PI / 4, 0.7, 1.4); // cian lateral
    rimLight.position.set(-3.4, 0.9, 1.1);
    scene.add(rimLight);

    const backLight = new THREE.DirectionalLight(0x2b5fd0, 1.15); // azul profundo posterior
    backLight.position.set(0.4, -1.1, -3.2);
    scene.add(backLight);

    const innerGlow = new THREE.PointLight(0xff8f86, 1.4, 3.2, 2); // luz subsuperficial
    innerGlow.position.set(0, 0.1, 0);
    scene.add(innerGlow);

    const fillLight = new THREE.PointLight(0xffd9c6, 0.0, 6, 2); // se activa en pediatría
    fillLight.position.set(1.6, 1.2, 2.2);
    scene.add(fillLight);

    /* -------------------------------------------------------------- corazón */
    const heart = new THREE.Group();
    const organ = new THREE.Group();
    heart.add(organ);
    scene.add(heart);

    const myoMat = tissue(0xa85b60);
    const ventricles = new THREE.Mesh(ventricularGeometry(), myoMat);
    organ.add(ventricles);

    const atrialMat = tissue(0x9c5a68, { roughness: 0.6, transmission: 0.2 });
    const laAtrium = new THREE.Mesh(atriumGeometry(new THREE.Vector3(0.46, 0.34, 0.42)), atrialMat);
    laAtrium.position.set(0.3, 0.95, -0.3);
    organ.add(laAtrium);
    const raAtrium = new THREE.Mesh(atriumGeometry(new THREE.Vector3(0.42, 0.36, 0.4)), atrialMat);
    raAtrium.position.set(-0.42, 0.88, 0.06);
    organ.add(raAtrium);
    // Orejuela derecha
    const appendage = new THREE.Mesh(atriumGeometry(new THREE.Vector3(0.22, 0.14, 0.2)), atrialMat);
    appendage.position.set(-0.6, 0.78, 0.36);
    appendage.rotation.z = 0.5;
    organ.add(appendage);

    const aortaMat = tissue(0xd6bdb4, { roughness: 0.44, clearcoat: 0.6, transmission: 0.1 });
    const aorta = new THREE.Mesh(
      tube(
        [
          [0.08, 0.72, -0.02],
          [0.1, 1.1, 0.02],
          [0.02, 1.55, -0.05],
          [-0.3, 1.78, -0.22],
          [-0.62, 1.6, -0.34],
          [-0.62, 1.15, -0.4],
          [-0.55, 0.6, -0.45],
        ],
        0.17,
      ),
      aortaMat,
    );
    organ.add(aorta);
    // Troncos supraaórticos
    for (const [i, x] of [-0.12, -0.3, -0.46].entries()) {
      const br = new THREE.Mesh(
        tube(
          [
            [x, 1.72 - i * 0.03, -0.16 - i * 0.05],
            [x - 0.02, 2.02, -0.2 - i * 0.06],
            [x - 0.04, 2.22, -0.22 - i * 0.06],
          ],
          0.052,
        ),
        aortaMat,
      );
      organ.add(br);
    }

    const pulmMat = tissue(0xa9bcd6, { roughness: 0.48, transmission: 0.16 });
    const pulmonaryTrunk = new THREE.Mesh(
      tube(
        [
          [-0.24, 0.66, 0.3],
          [-0.16, 1.05, 0.22],
          [-0.04, 1.42, 0.02],
          [0.16, 1.62, -0.18],
        ],
        0.155,
      ),
      pulmMat,
    );
    organ.add(pulmonaryTrunk);
    for (const side of [-1, 1]) {
      organ.add(
        new THREE.Mesh(
          tube(
            [
              [0.14, 1.6, -0.2],
              [0.14 + side * 0.35, 1.55, -0.34],
              [0.14 + side * 0.72, 1.44, -0.44],
            ],
            0.07,
          ),
          pulmMat,
        ),
      );
      // Venas pulmonares hacia aurícula izquierda
      for (const dy of [0.06, -0.14]) {
        organ.add(
          new THREE.Mesh(
            tube(
              [
                [0.36, 1.0 + dy, -0.4],
                [0.36 + side * 0.34, 1.06 + dy, -0.56],
                [0.36 + side * 0.62, 1.02 + dy, -0.66],
              ],
              0.055,
            ),
            pulmMat,
          ),
        );
      }
    }
    // Vena cava
    const cava = new THREE.Mesh(
      tube(
        [
          [-0.5, 0.72, 0.02],
          [-0.56, 1.16, -0.04],
          [-0.6, 1.7, -0.08],
        ],
        0.13,
      ),
      pulmMat,
    );
    organ.add(cava);

    /* ----------------------------------------------------- red coronaria */
    const coronaryMat = tissue(0xc07a72, {
      roughness: 0.38,
      clearcoat: 0.75,
      transmission: 0.05,
      emissive: new THREE.Color(0x1a0406),
    });
    const coronaries = new THREE.Group();
    organ.add(coronaries);
    const lad = new THREE.Mesh(
      tube(
        [
          [0.02, 0.62, 0.52],
          [0.08, 0.28, 0.66],
          [0.02, -0.15, 0.7],
          [-0.08, -0.6, 0.6],
          [-0.2, -1.0, 0.4],
        ],
        0.035,
      ),
      coronaryMat,
    );
    coronaries.add(lad);
    const circumflex = new THREE.Mesh(
      tube(
        [
          [0.1, 0.6, 0.5],
          [0.55, 0.5, 0.18],
          [0.62, 0.32, -0.3],
          [0.4, 0.16, -0.62],
        ],
        0.032,
      ),
      coronaryMat,
    );
    coronaries.add(circumflex);
    const rca = new THREE.Mesh(
      tube(
        [
          [-0.15, 0.6, 0.5],
          [-0.6, 0.44, 0.3],
          [-0.72, 0.16, -0.16],
          [-0.5, -0.2, -0.5],
          [-0.24, -0.5, -0.6],
        ],
        0.034,
      ),
      coronaryMat,
    );
    coronaries.add(rca);
    // Ramas finas
    const branchSeeds: [number, number, number][][] = [
      [
        [0.06, 0.34, 0.64],
        [0.42, 0.2, 0.5],
        [0.6, 0.02, 0.3],
      ],
      [
        [0.02, -0.1, 0.7],
        [-0.34, -0.24, 0.56],
        [-0.56, -0.42, 0.3],
      ],
      [
        [-0.06, -0.52, 0.62],
        [0.24, -0.66, 0.46],
        [0.42, -0.8, 0.2],
      ],
      [
        [-0.66, 0.3, 0.2],
        [-0.74, 0.02, -0.02],
        [-0.7, -0.26, -0.24],
      ],
    ];
    for (const pts of branchSeeds) {
      coronaries.add(new THREE.Mesh(tube(pts, 0.019), coronaryMat));
    }

    /* ------------------------------------------------- pedestal holográfico */
    const pedestal = new THREE.Group();
    pedestal.position.y = -2.05;
    scene.add(pedestal);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x2fd8d0,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.02, 1.08, 128), ringMat);
    ring.rotation.x = -Math.PI / 2;
    pedestal.add(ring);
    const ring2 = new THREE.Mesh(
      new THREE.RingGeometry(1.32, 1.335, 128),
      new THREE.MeshBasicMaterial({ color: 0x2fd8d0, transparent: true, opacity: 0.2, side: THREE.DoubleSide }),
    );
    ring2.rotation.x = -Math.PI / 2;
    pedestal.add(ring2);
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(1.0, 96),
      new THREE.MeshBasicMaterial({ color: 0x1a6f8c, transparent: true, opacity: 0.1 }),
    );
    disc.rotation.x = -Math.PI / 2;
    pedestal.add(disc);

    /* ----------------------------------------- atmósfera neural (neurología) */
    const neural = new THREE.Points(
      (() => {
        const g = new THREE.BufferGeometry();
        const n = lowPower ? 120 : 320;
        const arr = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) {
          const r = 2.6 + Math.random() * 2.4;
          const th = Math.random() * Math.PI * 2;
          const ph = Math.acos(2 * Math.random() - 1);
          arr[i * 3] = r * Math.sin(ph) * Math.cos(th);
          arr[i * 3 + 1] = r * Math.cos(ph) * 0.8;
          arr[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th) - 1.5;
        }
        g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
        return g;
      })(),
      new THREE.PointsMaterial({
        color: 0x8fd8ff,
        size: 0.035,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    );
    scene.add(neural);

    /* ------------------------------------------------------- interactividad */
    let pointer = { x: 0, y: 0 };
    const smooth = { x: 0, y: 0 };
    const onMove = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      pointer = {
        x: Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width / 2))),
        y: Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (r.height / 2))),
      };
    };
    const onLeave = () => {
      pointer = { x: 0, y: 0 };
    };
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerleave", onLeave);

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

    /* ---------------------------------------------------------------- loop */
    const clock = new THREE.Clock();
    let raf = 0;
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    let coronaryGlow = 0;
    let warmth = 0;
    let respiratory = 0;
    let neuralAmt = 0;
    let giGlow = 0;

    const render = () => {
      const p = propsRef.current;
      const t = clock.getElapsedTime();
      const still = p.reducedMotion;

      // Parallax con inercia (respuesta pesada y retardada)
      smooth.x = lerp(smooth.x, still ? 0 : pointer.x, 0.028);
      smooth.y = lerp(smooth.y, still ? 0 : pointer.y, 0.028);

      // Rotación museística lenta + parallax
      const spin = still ? 0.35 : t * 0.085;
      heart.rotation.y = spin + smooth.x * 0.26;
      heart.rotation.x = smooth.y * 0.13;
      heart.rotation.z = Math.sin(t * 0.13) * 0.02;

      // Flotación en microgravedad
      heart.position.y = still ? 0 : Math.sin(t * 0.32) * 0.075 + Math.sin(t * 0.19) * 0.03;
      heart.position.x = still ? 0 : Math.sin(t * 0.21) * 0.02;

      // Pulso fisiológico (micro-deformación, no expansión agresiva)
      const cycle = (t * 1.05) % 1;
      const systole =
        Math.exp(-Math.pow((cycle - 0.12) / 0.075, 2)) * 1 +
        Math.exp(-Math.pow((cycle - 0.32) / 0.09, 2)) * 0.45;
      const beat = still ? 0 : systole;
      organ.scale.set(1 - beat * 0.014, 1 + beat * 0.006, 1 - beat * 0.012);

      // Focos de especialidad (transiciones graduales)
      coronaryGlow = lerp(coronaryGlow, p.focus === "cardiologia" ? 1 : 0, 0.05);
      warmth = lerp(warmth, p.focus === "pediatria" ? 1 : 0, 0.04);
      respiratory = lerp(respiratory, p.focus === "neumologia" ? 1 : 0, 0.04);
      neuralAmt = lerp(neuralAmt, p.focus === "neurologia" ? 1 : 0, 0.04);
      giGlow = lerp(giGlow, p.focus === "gastroenterologia" ? 1 : 0, 0.05);

      const travel = 0.5 + 0.5 * Math.sin(t * 2.4);
      coronaryMat.emissive.setRGB(
        0.1 + 0.9 * coronaryGlow * travel,
        0.03 + 0.55 * coronaryGlow * travel,
        0.03 + 0.5 * coronaryGlow * travel,
      );
      coronaryMat.emissiveIntensity = 0.25 + coronaryGlow * 1.5;

      innerGlow.intensity = 1.1 + beat * 1.5 + coronaryGlow * 0.9 + giGlow * 0.3;
      innerGlow.position.y = -0.5 * giGlow;
      innerGlow.color.setHex(warmth > 0.5 ? 0xffb494 : 0xff8f86);
      fillLight.intensity = warmth * 1.5;
      keyLight.intensity = (2.5 - warmth * 0.5) * p.intensity;
      rimLight.intensity =
        (4.6 + Math.sin(t * (respiratory ? 0.55 : 0.22)) * (0.6 + respiratory * 1.4)) * p.intensity;
      backLight.intensity = (p.base === "light" ? 0.7 : 1.15) * p.intensity;
      ambient.intensity = (p.base === "light" ? 1.05 : 0.5) * p.intensity;
      (neural.material as THREE.PointsMaterial).opacity = neuralAmt * 0.55;
      neural.rotation.y = t * 0.03;

      // Respiración ambiental del pedestal
      ringMat.opacity = 0.3 + beat * 0.22 + respiratory * 0.15;
      pedestal.rotation.y = t * 0.08;
      pedestal.scale.setScalar(1 + respiratory * 0.04 * Math.sin(t * 0.6));

      camera.position.x = lerp(camera.position.x, smooth.x * 0.28, 0.06);
      camera.position.y = lerp(camera.position.y, 0.1 - smooth.y * 0.2, 0.06);
      camera.lookAt(0, 0.02, 0);

      renderer.render(scene, camera);
      raf = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if ((m as never as { isMesh?: boolean }).isMesh) {
          m.geometry.dispose();
          const mat = m.material as THREE.Material | THREE.Material[];
          if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
          else mat.dispose();
        }
      });
      renderer.dispose();
      if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={hostRef} className="absolute inset-0" />;
}
