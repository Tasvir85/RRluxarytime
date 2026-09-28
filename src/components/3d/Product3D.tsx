import { Suspense, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

import { PRODUCT_MODEL_URL, type ProductVariant } from "@/lib/product-config";
import { KEYFRAMES, damp, stage } from "@/lib/product-stage";
import { WatchModel } from "./WatchModel";

function GltfProduct({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  // Normalize: centre the model and fit it into a ~1.6 unit box.
  const box = new THREE.Box3().setFromObject(scene);
  const size = box.getSize(new THREE.Vector3());
  const centre = box.getCenter(new THREE.Vector3());
  const fit = 1.6 / Math.max(size.x, size.y, size.z || 1);
  return (
    <group scale={fit} position={[-centre.x * fit, -centre.y * fit, -centre.z * fit]}>
      <primitive object={scene} />
    </group>
  );
}

type Props = {
  variant: ProductVariant;
  /** Base rotation speed of the idle turntable, radians/second */
  autoRotate?: number;
};

const FIRST: Keyframe = KEYFRAMES[0] ?? {
  position: [0, 0, 0],
  rotation: [0, 0, 0],
  scale: 1,
};


/**
 * The product rig: keyframed scroll animation + damped pointer parallax +
 * drag rotation + wheel zoom. All motion is delta-timed and damped, so nothing
 * snaps or shakes.
 */
export function Product3D({ variant, autoRotate = 0.12 }: Props) {
  const outer = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Group>(null);
  const spin = useRef(0);
  const current = useRef({
    x: FIRST.position[0],
    y: FIRST.position[1],
    z: FIRST.position[2],
    rx: FIRST.rotation[0],
    ry: FIRST.rotation[1],
    rz: FIRST.rotation[2],
    s: FIRST.scale,
  });

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const c = current.current;

    // --- where on the scroll timeline are we? ---
    const span = KEYFRAMES.length - 1;
    const t = THREE.MathUtils.clamp(stage.progress, 0, 1) * span;
    const i = Math.min(Math.floor(t), span - 1);
    const f = THREE.MathUtils.smoothstep(t - i, 0, 1);
    const a = KEYFRAMES[i] ?? FIRST;
    const b = KEYFRAMES[i + 1] ?? a;
    const mix = (u: number, v: number) => u + (v - u) * f;

    // --- keyframe targets, nudged by pointer parallax + zoom ---
    const tx = mix(a.position[0], b.position[0]) + stage.pointerX * 0.1;
    const ty = mix(a.position[1], b.position[1]) - stage.pointerY * 0.08;
    const tz = mix(a.position[2], b.position[2]) + stage.zoom;
    const trx = mix(a.rotation[0], b.rotation[0]) + stage.pointerY * 0.18 + stage.dragPitch;
    const try_ = mix(a.rotation[1], b.rotation[1]) + stage.pointerX * 0.28 + stage.dragYaw;
    const trz = mix(a.rotation[2], b.rotation[2]);
    const ts = mix(a.scale, b.scale);

    c.x = damp(c.x, tx, 3, dt);
    c.y = damp(c.y, ty, 3, dt);
    c.z = damp(c.z, tz, 3, dt);
    c.rx = damp(c.rx, trx, 3.2, dt);
    c.ry = damp(c.ry, try_, 3.2, dt);
    c.rz = damp(c.rz, trz, 3, dt);
    c.s = damp(c.s, ts, 3, dt);

    // --- idle turntable, paused while the visitor is dragging ---
    if (!stage.dragging) spin.current += dt * autoRotate;

    if (outer.current) {
      outer.current.position.set(c.x, c.y, c.z);
      outer.current.rotation.set(c.rx, c.ry + spin.current, c.rz);
      outer.current.scale.setScalar(c.s);
    }
    if (inner.current) {
      inner.current.position.y = Math.sin(performance.now() * 0.0004) * 0.025;
    }
  });

  return (
    <group ref={outer}>
      <group ref={inner}>
        {PRODUCT_MODEL_URL ? (
          <Suspense fallback={<WatchModel variant={variant} />}>
            <GltfProduct url={PRODUCT_MODEL_URL} />
          </Suspense>
        ) : (
          <WatchModel variant={variant} />
        )}
      </group>
    </group>
  );
}

if (PRODUCT_MODEL_URL) useGLTF.preload(PRODUCT_MODEL_URL);
