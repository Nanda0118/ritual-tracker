"use client";
import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { Icosahedron, Torus } from "@react-three/drei";
import { Group } from "three";
import { prefersReducedMotion } from "@/lib/motion";

function Core() {
  const g = useRef<Group>(null!);
  useFrame((_, dt) => {
    g.current.rotation.y += dt * 0.08;
    g.current.rotation.x += dt * 0.03;
  });
  return (
    <group ref={g}>
      <Icosahedron args={[1.4, 1]}>
        <meshBasicMaterial color="#1b6f86" wireframe transparent opacity={0.22} />
      </Icosahedron>
      <Torus args={[2.4, 0.008, 12, 120]} rotation={[Math.PI / 2.3, 0, 0]}>
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.14} />
      </Torus>
    </group>
  );
}

export default function JarvisBackdrop({ theme }: { theme: "dark" | "light" }) {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(prefersReducedMotion());
  }, []);

  if (reduced) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          background: theme === "dark" ? "#0a0f1a" : "#eef2f7",
        }}
      />
    );
  }

  return (
    <Canvas camera={{ position: [0, 0, 6], fov: 50 }} dpr={[1, 1.5]} style={{ position: "fixed", inset: 0, zIndex: 0 }}>
      <color attach="background" args={[theme === "dark" ? "#0a0f1a" : "#eef2f7"]} />
      <ambientLight intensity={0.4} />
      <Core />
      <EffectComposer enableNormalPass={false}>
        <Bloom intensity={theme === "dark" ? 0.5 : 0.12} luminanceThreshold={0.3} mipmapBlur />
      </EffectComposer>
    </Canvas>
  );
}
