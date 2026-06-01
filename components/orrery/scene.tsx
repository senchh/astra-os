"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Stars, Html, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { AgentHealth, Health } from "@/lib/hermes/types";

const HEX: Record<string, string> = {
  "var(--color-claude)": "#f59e0b",
  "var(--color-hermes)": "#22d3ee",
  "var(--color-openclaw)": "#fb7185",
  "var(--color-obsidian)": "#a78bfa",
};

const HEALTH_HEX: Record<Health, string> = {
  live: "#34d399",
  degraded: "#f59e0b",
  offline: "#46557a",
};

function Core() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, d) => {
    if (ref.current) ref.current.rotation.y += d * 0.12;
  });
  return (
    <group>
      <mesh ref={ref}>
        <icosahedronGeometry args={[0.78, 1]} />
        <meshStandardMaterial
          color="#0a2536"
          emissive="#22d3ee"
          emissiveIntensity={0.55}
          metalness={0.4}
          roughness={0.35}
          flatShading
        />
      </mesh>
      <mesh scale={1.18}>
        <icosahedronGeometry args={[0.78, 1]} />
        <meshBasicMaterial color="#22d3ee" wireframe transparent opacity={0.12} />
      </mesh>
    </group>
  );
}

function Ring({ radius }: { radius: number }) {
  return (
    <mesh rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[radius, 0.004, 8, 140]} />
      <meshBasicMaterial color="#1e2a44" transparent opacity={0.8} />
    </mesh>
  );
}

function AgentNode({
  agent,
  radius,
  speed,
  phase,
}: {
  agent: AgentHealth;
  radius: number;
  speed: number;
  phase: number;
}) {
  const ref = useRef<THREE.Group>(null);
  const color = HEX[agent.color] ?? "#22d3ee";
  const offline = agent.health === "offline";

  useFrame((state) => {
    const t = state.clock.elapsedTime * speed + phase;
    if (ref.current) {
      ref.current.position.set(
        Math.cos(t) * radius,
        Math.sin(t * 0.6) * 0.22,
        Math.sin(t) * radius
      );
    }
  });

  return (
    <group ref={ref}>
      <mesh>
        <sphereGeometry args={[0.17, 28, 28]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={offline ? 0.12 : 1.15}
          transparent
          opacity={offline ? 0.4 : 1}
        />
      </mesh>
      <Html center distanceFactor={10} position={[0, 0.4, 0]} pointerEvents="none">
        <div className="flex -translate-y-1 select-none items-center gap-1.5 whitespace-nowrap rounded-full border border-edge bg-bg-2/80 px-2 py-0.5 backdrop-blur">
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ background: HEALTH_HEX[agent.health] }}
          />
          <span className="text-[11px] font-medium text-fg">{agent.name}</span>
        </div>
      </Html>
    </group>
  );
}

export function OrreryScene({ agents }: { agents: AgentHealth[] }) {
  const radii = [2.2, 3.0, 3.8, 4.6];
  const speeds = [0.22, 0.17, 0.13, 0.1];

  return (
    <Canvas
      camera={{ position: [0, 3.4, 7.4], fov: 50 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent" }}
      dpr={[1, 2]}
    >
      <ambientLight intensity={0.45} />
      <pointLight position={[0, 0, 0]} intensity={2.4} color="#22d3ee" distance={14} />
      <pointLight position={[6, 5, 4]} intensity={0.6} color="#a78bfa" />
      <Stars radius={70} depth={32} count={1300} factor={3.2} fade speed={0.4} />

      <Core />
      {agents.map((_, i) => (
        <Ring key={i} radius={radii[i % radii.length]} />
      ))}
      {agents.map((a, i) => (
        <AgentNode
          key={a.id}
          agent={a}
          radius={radii[i % radii.length]}
          speed={speeds[i % speeds.length]}
          phase={(i / agents.length) * Math.PI * 2}
        />
      ))}

      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate
        autoRotateSpeed={0.35}
        minPolarAngle={Math.PI / 3.2}
        maxPolarAngle={Math.PI / 1.9}
      />
    </Canvas>
  );
}
