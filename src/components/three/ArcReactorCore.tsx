"use client";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Torus, Icosahedron } from "@react-three/drei";
import { Mesh } from "three";
import type { JarvisState } from "../assistant/useBuddyState";

export default function ArcReactorCore({ state = "idle" }: { state?: JarvisState }) {
  const core = useRef<Mesh>(null!);
  const ring1 = useRef<Mesh>(null!);
  const ring2 = useRef<Mesh>(null!);
  const speed = state === "thinking" ? 2.4 : state === "speaking" ? 1.4 : state === "listening" ? 1.1 : 0.5;

  useFrame((_, dt) => {
    core.current.rotation.y += dt * 0.4;
    core.current.rotation.x += dt * 0.15;
    ring1.current.rotation.z += dt * speed * 0.6;
    ring2.current.rotation.z -= dt * speed * 0.9;
    const pulseSpeed = state === "idle" ? 900 : state === "listening" ? 500 : 300;
    const pulse = 1 + Math.sin(performance.now() / pulseSpeed) * 0.06;
    core.current.scale.setScalar(pulse);
  });

  const coreColor = state === "speaking" ? "#ffb84d" : "#22d3ee";

  return (
    <group>
      <Icosahedron ref={core} args={[0.9, 1]}>
        <meshStandardMaterial color="#0b7c99" emissive={coreColor} emissiveIntensity={1.6} wireframe transparent opacity={0.9} />
      </Icosahedron>
      <Torus ref={ring1} args={[1.6, 0.015, 16, 120]}>
        <meshBasicMaterial color="#7df9ff" />
      </Torus>
      <Torus ref={ring2} args={[2.1, 0.01, 16, 120]} rotation={[Math.PI / 2.4, 0, 0]}>
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.6} />
      </Torus>
    </group>
  );
}
