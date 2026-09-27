import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import type { ProductVariant } from "@/lib/product-config";

type Props = { variant: ProductVariant };

const CASE_R = 0.5;
const CASE_D = 0.14;

/** One bracelet arm: links march away from the lugs and curve back in -z. */
function braceletLinks(sign: 1 | -1, count: number) {
  const links: { pos: [number, number, number]; rot: number; w: number }[] = [];
  for (let i = 0; i < count; i += 1) {
    const t = (i + 1) / count;
    const y = sign * (0.6 + t * 0.6);
    const z = -(t * t) * 0.62;
    links.push({
      pos: [0, y, z],
      rot: sign * t * 1.05,
      w: 0.34 - t * 0.09,
    });
  }
  return links;
}

export function WatchModel({ variant }: Props) {
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

  const links = useMemo(() => [...braceletLinks(1, 8), ...braceletLinks(-1, 8)], []);

  useFrame((_, delta) => {
    if (secondsRef.current) secondsRef.current.rotation.z -= delta * 0.35;
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
      {links.map((l, i) => (
        <mesh key={`link-${i}`} position={l.pos} rotation={[l.rot, 0, 0]} castShadow>
          <boxGeometry args={[l.w, 0.115, 0.055]} />
          <meshStandardMaterial
            color={variant.metal}
            metalness={1}
            roughness={0.28}
            envMapIntensity={1.2}
          />
        </mesh>
      ))}

      {/* ---- Lugs ---- */}
      {[
        [-0.3, 0.52],
        [0.3, 0.52],
        [-0.3, -0.52],
        [0.3, -0.52],
      ].map(([x, y], i) => (
        <mesh key={`lug-${i}`} position={[x, y, 0]} castShadow>
          <boxGeometry args={[0.1, 0.16, CASE_D * 0.85]} />
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
      <group position={[0, 0, CASE_D / 2 + 0.002]} rotation={[0, 0, -0.9]}>
        <mesh position={[0, 0.11, 0]}>
          <boxGeometry args={[0.026, 0.24, 0.008]} />
          <meshStandardMaterial color={variant.accent} metalness={1} roughness={0.15} />
        </mesh>
      </group>
      <group position={[0, 0, CASE_D / 2 + 0.012]} rotation={[0, 0, 1.8]}>
        <mesh position={[0, 0.16, 0]}>
          <boxGeometry args={[0.018, 0.34, 0.007]} />
          <meshStandardMaterial color={variant.accent} metalness={1} roughness={0.15} />
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
      <mesh position={[0, 0, CASE_D / 2 + 0.012]} rotation={[-Math.PI / 2, 0, 0]}>
        <sphereGeometry args={[0.62, 48, 32, 0, Math.PI * 2, 0, 0.78]} />
        <meshPhysicalMaterial
          transparent
          transmission={0.98}
          thickness={0.12}
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
