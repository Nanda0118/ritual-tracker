"use client";
import { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { EffectComposer, Bloom, ChromaticAberration, Vignette } from "@react-three/postprocessing";
import { Vector2 } from "three";
import ArcReactorCore from "./ArcReactorCore";
import DataRings from "./DataRings";
import ParticleField from "./ParticleField";
import { isSmallViewport, prefersReducedMotion } from "@/lib/motion";
import type { JarvisState } from "../assistant/useBuddyState";

export default function JarvisScene({
  progress = 0,
  state = "idle",
}: {
  progress?: number;
  state?: JarvisState;
}) {
  const [reduced, setReduced] = useState(false);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    setReduced(prefersReducedMotion());
    setMobile(isSmallViewport());
  }, []);

  if (reduced) {
    // Static, non-animated backdrop — no rotation, no particles, no postprocessing.
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          background:
            "radial-gradient(circle at 50% 42%, rgba(34,211,238,0.12), transparent 55%), #04070e",
        }}
      />
    );
  }

  const particleCount = mobile ? 180 : 600;
  const dpr: [number, number] = mobile ? [1, 1.25] : [1, 2];

  return (
    <Canvas
      camera={{ position: [0, 0, 6], fov: 50 }}
      dpr={dpr}
      style={{ position: "fixed", inset: 0, zIndex: 0 }}
    >
      <color attach="background" args={["#04070e"]} />
      <ambientLight intensity={0.3} />
      <pointLight position={[0, 0, 4]} intensity={2.2} color="#22d3ee" />
      <pointLight position={[3, 2, 2]} intensity={0.6} color="#7df9ff" />

      <ParticleField count={particleCount} />
      <DataRings progress={progress} />
      <ArcReactorCore state={state} />

      {mobile ? (
        <EffectComposer enableNormalPass={false}>
          <Bloom intensity={0.7} luminanceThreshold={0.2} luminanceSmoothing={0.9} mipmapBlur />
          <Vignette eskil={false} offset={0.25} darkness={0.9} />
        </EffectComposer>
      ) : (
        <EffectComposer enableNormalPass={false}>
          <Bloom intensity={1.1} luminanceThreshold={0.2} luminanceSmoothing={0.9} mipmapBlur />
          <ChromaticAberration offset={new Vector2(0.0006, 0.0006)} />
          <Vignette eskil={false} offset={0.25} darkness={0.9} />
        </EffectComposer>
      )}
    </Canvas>
  );
}
