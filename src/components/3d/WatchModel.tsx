import { useMemo, useRef } from "react";
import { RoundedBoxGeometry } from "three-stdlib";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import type { ProductVariant } from "@/lib/product-config";

type Props = { variant: ProductVariant };

const CASE_R = 0.5;
const CASE_D = 0.14;

/** Bracelet geometry — five-row jubilee-style band matched to the packaging watch. */
const BAND_W0 = 0.56; // width at the end links (fills the lug gap)
const BAND_TAPER = 0.08; // narrower towards the clasp
const ROWS = 18; // links per half
const GAP = 0.0075;

type Column = { kind: "outer" | "polished" | "center"; offset: number; frac: number; stagger: boolean };
const COLUMNS: Column[] = [
  { kind: "outer", offset: -0.365, frac: 0.27, stagger: false },
  { kind: "polished", offset: -0.1575, frac: 0.13, stagger: true },
  { kind: "center", offset: 0, frac: 0.17, stagger: false },
  { kind: "polished", offset: 0.1575, frac: 0.13, stagger: true },
  { kind: "outer", offset: 0.365, frac: 0.27, stagger: false },
];

type Link = { key: string; kind: Column["kind"]; pos: [number, number, number]; rot: number; scaleX: number };

/** Path of one bracelet half: from the end link, round the wrist, to the clasp. */
function bandCurve(sign: 1 | -1) {
  return new THREE.CatmullRomCurve3(
    [
      new THREE.Vector3(0, sign * 0.63, -0.01),
      new THREE.Vector3(0, sign * 0.86, -0.17),
      new THREE.Vector3(0, sign * 0.98, -0.56),
      new THREE.Vector3(0, sign * 0.9, -1.02),
      new THREE.Vector3(0, sign * 0.58, -1.4),
      new THREE.Vector3(0, sign * 0.17, -1.575),
    ],
    false,
    "centripetal",
  );
}

/**
 * Links are placed by arc length so consecutive rows touch exactly — no gaps
 * anywhere around the wrist. Centre pieces are offset half a link, like a
 * real jubilee bracelet.
 */
function buildBand(): { links: Link[]; step: number } {
  const links: Link[] = [];
  let step = 0;
  for (const sign of [1, -1] as const) {
    const curve = bandCurve(sign);
    step = curve.getLength() / ROWS;
    const tangent = new THREE.Vector3();
    for (const column of COLUMNS) {
      // Staggered pieces sit between outer-link joints, giving a brick-laid pattern.
      const count = column.stagger ? ROWS - 1 : ROWS;
      for (let i = 0; i < count; i += 1) {
        const u = column.stagger ? (i + 1) / ROWS : (i + 0.5) / ROWS;
        const p = curve.getPointAt(u);
        curve.getTangentAt(u, tangent);
        const width = BAND_W0 - BAND_TAPER * u;
        links.push({
          key: `${sign}-${column.kind}-${column.offset}-${i}`,
          kind: column.kind,
          pos: [column.offset * width, p.y, p.z],
          rot: Math.atan2(tangent.z, tangent.y),
          scaleX: width / BAND_W0,
        });
      }
    }
  }
  return { links, step };
}

export function WatchModel({ variant }: Props) {
  const hourRef = useRef<THREE.Group>(null);
  const minuteRef = useRef<THREE.Group>(null);
  const secondsRef = useRef<THREE.Group>(null);

  const markers = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        const long = i % 3 === 0;
        return {
          x: Math.sin(a) * 0.365,
          y: Math.cos(a) * 0.365,
          rot: -a,
          h: long ? 0.085 : 0.05,
          w: long ? 0.026 : 0.014,
        };
      }),
    [],
  );

  const band = useMemo(() => buildBand(), []);

  // Shared, softly bevelled link shapes — sized once, then tapered per row.
  const geo = useMemo(() => {
    const s = band.step;
    return {
      outer: new RoundedBoxGeometry(BAND_W0 * 0.27, s * 0.97, 0.078, 3, 0.022),
      polished: new RoundedBoxGeometry(BAND_W0 * 0.13, s * 0.9, 0.09, 3, 0.03),
      center: new RoundedBoxGeometry(BAND_W0 * 0.17, s * 0.94, 0.08, 3, 0.022),
      endLink: new RoundedBoxGeometry(BAND_W0 + GAP, 0.2, 0.12, 4, 0.035),
      claspBase: new RoundedBoxGeometry(0.5, 0.44, 0.05, 4, 0.02),
      claspCover: new RoundedBoxGeometry(0.4, 0.38, 0.026, 4, 0.012),
    };
  }, [band.step]);

  const mats = useMemo(
    () => ({
      brushed: new THREE.MeshStandardMaterial({
        color: variant.metal,
        metalness: 1,
        roughness: 0.36,
        envMapIntensity: 1.4,
      }),
      polished: new THREE.MeshStandardMaterial({
        color: variant.metal,
        metalness: 1,
        roughness: 0.16,
        envMapIntensity: 1.8,
      }),
    }),
    [variant.metal],
  );

  useFrame(() => {
    const now = new Date();
    const seconds = now.getSeconds() + now.getMilliseconds() / 1000;
    const minutes = now.getMinutes() + seconds / 60;
    const hours = (now.getHours() % 12) + minutes / 60;

    if (hourRef.current) hourRef.current.rotation.z = -(hours / 12) * Math.PI * 2;
    if (minuteRef.current) minuteRef.current.rotation.z = -(minutes / 60) * Math.PI * 2;
    if (secondsRef.current) secondsRef.current.rotation.z = -(seconds / 60) * Math.PI * 2;
  });

  const metal = (
    <meshStandardMaterial
      color={variant.metal}
      metalness={1}
      roughness={0.17}
      envMapIntensity={1.6}
    />
  );

  return (
    <group>
      {/* ---- Bracelet: brushed outer links, polished centre pieces ---- */}
      {band.links.map((link) => (
        <mesh
          key={link.key}
          geometry={geo[link.kind]}
          material={link.kind === "polished" ? mats.polished : mats.brushed}
          position={link.pos}
          rotation={[link.rot, 0, 0]}
          scale={[link.scaleX, 1, 1]}
          castShadow
        />
      ))}

      {/* Solid end links fill the lug gap and join the band to the case. */}
      {[1, -1].map((sign) => (
        <group key={`end-link-${sign}`} position={[0, sign * 0.535, -0.01]}>
          <mesh geometry={geo.endLink} material={mats.brushed} castShadow />
        </group>
      ))}

      {/* Folding deployant clasp joining both halves under the wrist. */}
      <group position={[0, 0, -1.64]}>
        <mesh geometry={geo.claspBase} material={mats.brushed} castShadow />
        <mesh geometry={geo.claspCover} material={mats.polished} position={[0, 0, -0.03]} />
        <mesh position={[0, 0.12, -0.045]}>
          <boxGeometry args={[0.12, 0.022, 0.008]} />
          <meshStandardMaterial color={variant.accent} metalness={1} roughness={0.14} />
        </mesh>
        {[-1, 1].map((side) => (
          <mesh key={`clasp-edge-${side}`} position={[side * 0.205, 0, -0.03]} material={mats.brushed}>
            <boxGeometry args={[0.012, 0.36, 0.03]} />
          </mesh>
        ))}
      </group>

      {/* ---- Lugs ---- */}
      {[
        { x: -0.33, y: 0.44 },
        { x: 0.33, y: 0.44 },
        { x: -0.33, y: -0.44 },
        { x: 0.33, y: -0.44 },
      ].map(({ x, y }, i) => (
        <mesh key={`lug-${i}`} position={[x, y, 0]} castShadow>
          <boxGeometry args={[0.1, 0.24, CASE_D * 0.85]} />
          <meshStandardMaterial color={variant.metal} metalness={1} roughness={0.28} envMapIntensity={1.5} />
        </mesh>
      ))}

      {/* ---- Case body ---- */}
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[CASE_R, CASE_R * 0.96, CASE_D, 72]} />
        <meshStandardMaterial
          color={variant.metal}
          metalness={1}
          roughness={0.22}
          envMapIntensity={1.5}
        />
      </mesh>

      {/* ---- Caseback detail ---- */}
      <mesh position={[0, 0, -CASE_D / 2 - 0.005]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.36, 0.36, 0.02, 64]} />
        <meshStandardMaterial
          color={variant.metal}
          metalness={1}
          roughness={0.05}
          envMapIntensity={2}
        />
      </mesh>

      {/* ---- Bezel ---- */}
      <mesh position={[0, 0, CASE_D / 2 - 0.01]} castShadow>
        <torusGeometry args={[CASE_R - 0.03, 0.035, 20, 96]} />
        <meshStandardMaterial
          color={variant.metal}
          metalness={1}
          roughness={0.07}
          envMapIntensity={2.1}
        />
      </mesh>

      {/* ---- Dial ---- */}
      <mesh position={[0, 0, CASE_D / 2 - 0.02]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.44, 0.44, 0.012, 64]} />
        <meshStandardMaterial
          color={variant.dial}
          metalness={0.55}
          roughness={0.42}
          envMapIntensity={0.9}
        />
      </mesh>

      {/* ---- Dial chapter ring ---- */}
      <mesh position={[0, 0, CASE_D / 2 - 0.008]}>
        <torusGeometry args={[0.41, 0.006, 12, 96]} />
        <meshStandardMaterial color={variant.accent} metalness={1} roughness={0.25} />
      </mesh>

      {/* ---- Hour markers ---- */}
      {markers.map((m, i) => (
        <mesh key={`mk-${i}`} position={[m.x, m.y, CASE_D / 2 - 0.006]} rotation={[0, 0, m.rot]}>
          <boxGeometry args={[m.w, m.h, 0.012]} />
          <meshStandardMaterial
            color={variant.accent}
            metalness={1}
            roughness={0.18}
            emissive={variant.accent}
            emissiveIntensity={0.05}
          />
        </mesh>
      ))}

      {/* ---- Sub-dial ---- */}
      <mesh position={[0, -0.2, CASE_D / 2 - 0.012]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.008, 48]} />
        <meshStandardMaterial color={variant.dial} metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, -0.2, CASE_D / 2 - 0.004]}>
        <torusGeometry args={[0.1, 0.0045, 10, 64]} />
        <meshStandardMaterial color={variant.accent} metalness={1} roughness={0.25} />
      </mesh>

      {/* ---- Hands ---- */}
      <group ref={hourRef} position={[0, 0, CASE_D / 2 + 0.002]}>
        <mesh position={[0, 0.11, -0.002]}>
          <boxGeometry args={[0.044, 0.25, 0.006]} />
          <meshStandardMaterial color={variant.dial} metalness={0.15} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.11, 0]}>
          <boxGeometry args={[0.032, 0.235, 0.01]} />
          <meshStandardMaterial color={variant.accent} metalness={0.82} roughness={0.12} emissive={variant.accent} emissiveIntensity={0.2} />
        </mesh>
      </group>
      <group ref={minuteRef} position={[0, 0, CASE_D / 2 + 0.012]}>
        <mesh position={[0, 0.16, -0.002]}>
          <boxGeometry args={[0.036, 0.35, 0.006]} />
          <meshStandardMaterial color={variant.dial} metalness={0.15} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.16, 0]}>
          <boxGeometry args={[0.024, 0.335, 0.009]} />
          <meshStandardMaterial color={variant.accent} metalness={0.82} roughness={0.12} emissive={variant.accent} emissiveIntensity={0.2} />
        </mesh>
      </group>
      <group ref={secondsRef} position={[0, 0, CASE_D / 2 + 0.02]}>
        <mesh position={[0, 0.15, 0]}>
          <boxGeometry args={[0.007, 0.38, 0.005]} />
          <meshStandardMaterial color="#d8624a" metalness={0.6} roughness={0.35} />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.022, 24, 24]} />
          <meshStandardMaterial color={variant.accent} metalness={1} roughness={0.12} />
        </mesh>
      </group>

      {/* ---- Sapphire crystal (domed) ---- */}
      <mesh position={[0, 0, -0.6]} rotation={[Math.PI / 2, 0, 0]}>
        <sphereGeometry args={[0.8, 56, 32, 0, Math.PI * 2, 0, 0.58]} />
        <meshPhysicalMaterial
          transparent
          transmission={0.98}
          thickness={0.06}
          roughness={0.02}
          ior={1.76}
          clearcoat={1}
          clearcoatRoughness={0.02}
          reflectivity={0.35}
          color="#ffffff"
        />
      </mesh>

      {/* ---- Crown ---- */}
      <mesh position={[CASE_R + 0.035, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.055, 0.055, 0.075, 24]} />
        <meshStandardMaterial
          color={variant.metal}
          metalness={1}
          roughness={0.3}
          envMapIntensity={1.4}
        />
      </mesh>
      <mesh position={[CASE_R + 0.078, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <sphereGeometry args={[0.03, 20, 20]} />
        <meshStandardMaterial color={variant.accent} metalness={1} roughness={0.2} />
      </mesh>
    </group>
  );
}
