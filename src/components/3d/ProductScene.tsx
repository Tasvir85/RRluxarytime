import { useEffect, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer } from "@react-three/drei";

import type { ProductVariant } from "@/lib/product-config";
import { damp, stage } from "@/lib/product-stage";
import { Product3D } from "./Product3D";

/**
 * Full-screen studio stage. Owns the pointer/drag/wheel interaction layer and
 * feeds the shared stage state that Product3D reads each frame.
 */
export function ProductScene({ variant }: { variant: ProductVariant }) {
  const host = useRef<HTMLDivElement>(null);
  const raw = useRef({ x: 0, y: 0 });
  const drag = useRef<{ active: boolean; x: number; y: number }>({
    active: false,
    x: 0,
    y: 0,
  });

  // Damp the raw pointer towards the value the render loop consumes.
  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      stage.pointerX = damp(stage.pointerX, raw.current.x, 4, dt);
      stage.pointerY = damp(stage.pointerY, raw.current.y, 4, dt);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      raw.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      raw.current.y = (e.clientY / window.innerHeight) * 2 - 1;
      if (drag.current.active) {
        stage.dragYaw += (e.clientX - drag.current.x) * 0.006;
        stage.dragPitch += (e.clientY - drag.current.y) * 0.004;
        stage.dragPitch = Math.max(-0.7, Math.min(0.7, stage.dragPitch));
        drag.current.x = e.clientX;
        drag.current.y = e.clientY;
      }
    };
    const onDown = (e: PointerEvent) => {
      drag.current = { active: true, x: e.clientX, y: e.clientY };
      stage.dragging = true;
      document.body.style.cursor = "grabbing";
    };
    const onUp = () => {
      drag.current.active = false;
      stage.dragging = false;
      document.body.style.cursor = "";
    };
    const onWheel = (e: WheelEvent) => {
      stage.zoom = Math.max(-0.6, Math.min(0.9, stage.zoom + e.deltaY * -0.0012));
    };

    const el = host.current;
    window.addEventListener("pointermove", onMove, { passive: true });
    el?.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    window.addEventListener("wheel", onWheel, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      el?.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      window.removeEventListener("wheel", onWheel);
      document.body.style.cursor = "";
    };
  }, []);

  return (
    <div ref={host} className="fixed inset-0 touch-none" aria-hidden="true">
      <Canvas
        shadows
        dpr={[1, 1.75]}
        gl={{ antialias: true, preserveDrawingBuffer: false }}
        camera={{ position: [0, 0.15, 4.4], fov: 38 }}
      >
        {/* Soft studio key + fill + rim */}
        <ambientLight intensity={0.55} />
        <directionalLight
          position={[3.2, 4.4, 3.6]}
          intensity={2.6}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-left={-3}
          shadow-camera-right={3}
          shadow-camera-top={3}
          shadow-camera-bottom={-3}
        />
        <directionalLight position={[-4, 1.2, 2]} intensity={0.9} color="#cfd8e6" />
        <spotLight
          position={[-1.6, 2.4, -3.4]}
          angle={0.7}
          penumbra={1}
          intensity={5}
          color="#f4e2b8"
        />

        {/* Local IBL — softbox panels, no CDN fetch */}
        <Environment resolution={256}>
          <Lightformer intensity={3.2} position={[0, 4, 2]} scale={[8, 4, 1]} />
          <Lightformer
            intensity={1.6}
            color="#e8ecf5"
            position={[-5, 1, 1]}
            rotation-y={Math.PI / 2}
            scale={[12, 3, 1]}
          />
          <Lightformer
            intensity={2.2}
            color="#ffe9c2"
            position={[5, 0.5, -1]}
            rotation-y={-Math.PI / 2}
            scale={[12, 2, 1]}
          />
          <Lightformer intensity={0.8} color="#1b2230" position={[0, -3, 0]} scale={[10, 6, 1]} />
        </Environment>

        <Product3D variant={variant} />

        <ContactShadows
          position={[0, -1.35, 0]}
          opacity={0.6}
          scale={9}
          blur={3}
          far={4}
          resolution={512}
          color="#000000"
        />
      </Canvas>
    </div>
  );
}
