import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import type { ProductVariant } from "@/lib/product-config";

type Props = { variant: ProductVariant };

const CASE_R = 0.5;
const CASE_D = 0.14;

type BraceletLink = {
  pos: [number, number, number];
  rot: number;
  width: number;
  depth: number;
};

const BRACELET_COLUMNS = [
  { offset: -0.4, width: 0.23, polished: false },
  { offset: -0.19, width: 0.16, polished: true },
  { offset: 0, width: 0.17, polished: true },
  { offset: 0.19, width: 0.16, polished: true },
  { offset: 0.4, width: 0.23, polished: false },
] as const;

/**
 * One half of a closed bracelet. A quadratic curve lets the band leave the
 * lugs naturally, bow around the wrist, and meet the clasp behind the case.
 */
function braceletLinks(sign: 1 | -1, count: number): BraceletLink[] {
  const links: BraceletLink[] = [];
  for (let i = 0; i < count; i += 1) {
    const t = (i + 0.35) / count;
    const inverse = 1 - t;
    const startY = sign * 0.54;
    const controlY = sign * 1.52;
    const endY = 0;
    const controlZ = -0.24;
    const endZ = -1.38;
    const y = inverse * inverse * startY + 2 * inverse * t * controlY + t * t * endY;
    const z = 2 * inverse * t * controlZ + t * t * endZ;
    const tangentY = 2 * inverse * (controlY - startY) + 2 * t * (endY - controlY);
    const tangentZ = 2 * inverse * controlZ + 2 * t * (endZ - controlZ);
    links.push({
      pos: [0, y, z],
      rot: Math.atan2(tangentZ, tangentY),
      width: 0.48 - t * 0.07,
      depth: 0.105 - t * 0.015,
    });
  }
  return links;
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

  const links = useMemo(() => [...braceletLinks(1, 16), ...braceletLinks(-1, 16)], []);

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
      {/* ---- Bracelet ---- */}
      {links.map((link, row) =>
        BRACELET_COLUMNS.map((column, columnIndex) => (
          <mesh
            key={`link-${row}-${columnIndex}`}
            position={[column.offset * link.width, link.pos[1], link.pos[2]]}
            rotation={[link.rot, 0, 0]}
            castShadow
          >
            <boxGeometry args={[link.width * column.width, 0.11, link.depth]} />
            <meshStandardMaterial
              color={variant.metal}
              metalness={1}
              roughness={column.polished ? 0.16 : 0.38}
              envMapIntensity={column.polished ? 1.65 : 1.15}
            />
          </mesh>
        )),
      )}

      {/* Solid end links visually anchor the full-width bracelet to the lugs. */}
      {[1, -1].map((sign) => (
        <group key={`end-link-${sign}`} position={[0, sign * 0.535, -0.005]}>
          <mesh castShadow>
            <boxGeometry args={[0.49, 0.18, 0.13]} />
            <meshStandardMaterial color={variant.metal} metalness={0.92} roughness={0.3} envMapIntensity={1.35} />
          </mesh>
          <mesh position={[0, 0, 0.071]}>
            <boxGeometry args={[0.16, 0.15, 0.018]} />
            <meshStandardMaterial color={variant.metal} metalness={1} roughness={0.08} envMapIntensity={2} />
          </mesh>
        </group>
      ))}

      {/* Folding clasp closes the two bracelet halves behind the watch. */}
      <group position={[0, 0, -1.38]} rotation={[Math.PI / 2, 0, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.43, 0.22, 0.11]} />
          <meshStandardMaterial color={variant.metal} metalness={1} roughness={0.18} envMapIntensity={1.6} />
        </mesh>
        <mesh position={[0, 0.052, 0]}>
          <boxGeometry args={[0.18, 0.014, 0.06]} />
          <meshStandardMaterial color={variant.accent} metalness={1} roughness={0.14} />
        </mesh>
      </group>

      {/* ---- Lugs ---- */}
      {[
        { x: -0.28, y: 0.44 },
        { x: 0.28, y: 0.44 },
        { x: -0.28, y: -0.44 },
        { x: 0.28, y: -0.44 },
      ].map(({ x, y }, i) => (
        <mesh key={`lug-${i}`} position={[x, y, 0]} castShadow>
          <boxGeometry args={[0.09, 0.22, CASE_D * 0.8]} />
          {metal}
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
