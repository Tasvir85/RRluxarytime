import { Component, Suspense, useMemo, useRef, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, OrbitControls, useGLTF, Html } from "@react-three/drei";
import * as THREE from "three";
import { Maximize2, RotateCcw } from "lucide-react";

class ModelBoundary extends Component<{ children: ReactNode; resetKey: string }, { failed: boolean; key: string }> {
  override state = { failed: false, key: this.props.resetKey };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  static getDerivedStateFromProps(p: { resetKey: string }, s: { failed: boolean; key: string }) {
    return p.resetKey !== s.key ? { failed: false, key: p.resetKey } : null;
  }
  override componentDidCatch(e: unknown) {
    console.error("[ModelViewer] model failed to load", e);
  }
  override render() {
    if (this.state.failed)
      return (
        <Html center>
          <p className="w-64 text-center text-sm text-muted-foreground">
            We couldn't display this 3D model. Try uploading it again.
          </p>
        </Html>
      );
    return this.props.children;
  }
}

function FittedModel({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  const obj = useMemo(() => {
    const s = scene.clone(true);
    const box = new THREE.Box3().setFromObject(s);
    const size = box.getSize(new THREE.Vector3());
    const centre = box.getCenter(new THREE.Vector3());
    const fit = 1.8 / Math.max(size.x, size.y, size.z, 0.0001);
    s.position.set(-centre.x * fit, -centre.y * fit, -centre.z * fit);
    s.scale.setScalar(fit);
    s.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.castShadow = true;
    });
    return s;
  }, [scene]);
  return <primitive object={obj} />;
}

function Loading() {
  return (
    <Html center>
      <p className="whitespace-nowrap text-xs uppercase tracking-[0.2em] text-muted-foreground">Loading 3D model…</p>
    </Html>
  );
}

type Props = { url: string; className?: string; controls?: boolean; autoRotate?: boolean };

export function ModelViewer({ url, className, controls = true, autoRotate = true }: Props) {
  const orbit = useRef<React.ComponentRef<typeof OrbitControls>>(null);
  const wrap = useRef<HTMLDivElement>(null);

  return (
    <div ref={wrap} className={`relative bg-transparent ${className ?? ""}`}>
      <Canvas
        dpr={[1, 1.75]}
        shadows
        camera={{ position: [0, 0.4, 4.2], fov: 35 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
        style={{ touchAction: "none" }}
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[3, 5, 4]} intensity={1.6} castShadow shadow-mapSize={[1024, 1024]} />
        <spotLight position={[-4, 2, -3]} intensity={30} angle={0.5} penumbra={1} color="#f3e2bd" />
        <Environment resolution={256}>
          <Lightformer intensity={2} position={[0, 4, 3]} scale={[6, 2, 1]} />
          <Lightformer intensity={1} position={[-4, 1, 1]} scale={[2, 4, 1]} color="#cfd8ff" />
          <Lightformer intensity={1.4} position={[4, 1, -2]} scale={[2, 4, 1]} color="#ffe2b0" />
        </Environment>
        <ModelBoundary resetKey={url}>
          <Suspense fallback={<Loading />}>
            <FittedModel url={url} />
          </Suspense>
        </ModelBoundary>
        <ContactShadows position={[0, -1.05, 0]} opacity={0.45} blur={2.6} scale={6} far={2} />
        <OrbitControls
          ref={orbit}
          enablePan={false}
          enableDamping
          dampingFactor={0.08}
          minDistance={2.4}
          maxDistance={7}
          autoRotate={autoRotate}
          autoRotateSpeed={0.6}
          enableZoom={controls}
        />
      </Canvas>
      {controls && (
        <div className="absolute bottom-3 right-3 flex gap-2">
          <button
            type="button"
            aria-label="Reset view"
            onClick={() => orbit.current?.reset()}
            className="rounded-full border border-border bg-background/70 p-2 text-foreground backdrop-blur hover:bg-secondary"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Fullscreen"
            onClick={() =>
              document.fullscreenElement ? document.exitFullscreen() : wrap.current?.requestFullscreen?.()
            }
            className="rounded-full border border-border bg-background/70 p-2 text-foreground backdrop-blur hover:bg-secondary"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
