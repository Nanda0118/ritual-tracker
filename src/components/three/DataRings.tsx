"use client";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Ring } from "@react-three/drei";
import { Group, MathUtils } from "three";

export default function DataRings({ progress = 0 }: { progress?: number }) {
  const g = useRef<Group>(null!);
  useFrame((_, dt) => {
    g.current.rotation.z += dt * 0.08;
  });
  const theta = MathUtils.lerp(0.0001, Math.PI * 2, Math.max(0, Math.min(1, progress)));
  return (
    <group ref={g}>
      <Ring args={[2.6, 2.63, 128, 1, 0, Math.PI * 2]}>
        <meshBasicMaterial color="#0b7c99" transparent opacity={0.25} />
      </Ring>
      <Ring args={[2.6, 2.66, 128, 1, 0, theta]}>
        <meshBasicMaterial color="#ffb84d" />
      </Ring>
    </group>
  );
}
