"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Stars, Html, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { AgentHealth, Health } from "@/lib/hermes/types";

const HEALTH_HEX: Record<Health, string> = {
  live: "#34d399",
  degraded: "#f59e0b",
  offline: "#46557a",
};
const HEALTH_WORD: Record<Health, string> = { live: "live", degraded: "idle", offline: "offline" };
const ROLE: Record<string, string> = {
  claude: "Orchestrator",
  hermes: "Gateway",
  openclaw: "Runtime",
  obsidian: "Memory",
};

// Per-agent planet recipe — colors + shader params (emissive = inner glow, banded =
// gas-giant latitude bands), tuned to the reference render.
interface Recipe {
  base: string;
  light: string;
  dark: string;
  atm: string;
  emissive: number;
  banded: number;
}
const RECIPE: Record<string, Recipe> = {
  claude: { base: "#b5610a", light: "#ffd27a", dark: "#3a1c02", atm: "#ff8a1f", emissive: 0.95, banded: 0.35 },
  hermes: { base: "#149a6e", light: "#7af0bf", dark: "#063027", atm: "#2fe0a0", emissive: 0.4, banded: 0.55 },
  openclaw: { base: "#b32f3f", light: "#ff8a98", dark: "#420d15", atm: "#ff5a6e", emissive: 0.5, banded: 0.2 },
  obsidian: { base: "#6a3fd0", light: "#c9b3ff", dark: "#23134d", atm: "#b18cff", emissive: 0.6, banded: 0.12 },
};
const FALLBACK: Recipe = { base: "#176079", light: "#7fe6f5", dark: "#06222b", atm: "#22d3ee", emissive: 0.4, banded: 0.3 };

// Slow shared orbital speed (rad/s) — the constellation revolves in formation, so
// it keeps the reference layout while clearly orbiting the operator.
const ORBIT_SPEED = 0.05;

const PLANET_VERT = /* glsl */ `
  varying vec3 vN; varying vec3 vP; varying vec3 vV;
  void main() {
    vP = position;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vN = normalize(mat3(modelMatrix) * normal);
    vV = normalize(cameraPosition - wp.xyz);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const PLANET_FRAG = /* glsl */ `
  varying vec3 vN; varying vec3 vP; varying vec3 vV;
  uniform vec3 uBase; uniform vec3 uLight; uniform vec3 uDark; uniform vec3 uAtm;
  uniform vec3 uLightDir; uniform float uTime; uniform float uEmissive; uniform float uBanded;

  float hash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
  float noise(vec3 x){
    vec3 i = floor(x); vec3 f = fract(x); f = f*f*(3.0-2.0*f);
    return mix(mix(mix(hash(i+vec3(0,0,0)),hash(i+vec3(1,0,0)),f.x),
                   mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
               mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),
                   mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y), f.z);
  }
  float fbm(vec3 p){ float v=0.0, a=0.5; for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.03; a*=0.5; } return v; }

  void main(){
    vec3 sp = normalize(vP);
    float n = fbm(sp * 2.6 + vec3(0.0, uTime * 0.015, 0.0));
    // optional gas-giant banding by latitude
    float band = mix(1.0, 0.55 + 0.45 * sin(sp.y * 9.0 + n * 2.5), uBanded);
    float s = clamp(n * band, 0.0, 1.0);

    vec3 surf = mix(uDark, uBase, smoothstep(0.18, 0.5, s));
    surf = mix(surf, uLight, smoothstep(0.62, 0.92, s));

    // directional lighting → real terminator (lit crescent + shadow)
    float diff = clamp(dot(normalize(vN), normalize(uLightDir)), 0.0, 1.0);
    vec3 lit = surf * (0.1 + 1.3 * diff);

    // inner glow seeping through dark crevices / shadow side (molten feel)
    float hot = smoothstep(0.55, 0.0, s) * uEmissive;
    lit += uAtm * hot * (0.35 + 0.65 * (1.0 - diff));

    // fresnel atmosphere rim
    float fres = pow(1.0 - clamp(dot(normalize(vN), normalize(vV)), 0.0, 1.0), 3.0);
    lit += uAtm * fres * 1.1;

    gl_FragColor = vec4(lit, 1.0);
  }
`;

// Lunar surface: ridged crater detail, hard terminator, no inner glow, soft rim.
const MOON_FRAG = /* glsl */ `
  varying vec3 vN; varying vec3 vP; varying vec3 vV;
  uniform vec3 uBase; uniform vec3 uLight; uniform vec3 uDark; uniform vec3 uAtm;
  uniform vec3 uLightDir; uniform float uTime; uniform float uEmissive; uniform float uBanded;

  float hash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
  float noise(vec3 x){
    vec3 i = floor(x); vec3 f = fract(x); f = f*f*(3.0-2.0*f);
    return mix(mix(mix(hash(i+vec3(0,0,0)),hash(i+vec3(1,0,0)),f.x),
                   mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
               mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),
                   mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y), f.z);
  }
  float fbm(vec3 p){ float v=0.0, a=0.5; for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.03; a*=0.5; } return v; }

  void main(){
    vec3 sp = normalize(vP);
    float maria = fbm(sp * 3.2);                       // dark seas vs bright highlands
    float fine = fbm(sp * 9.0 + 4.0);                  // fine regolith
    float craters = 1.0 - abs(2.0 * fbm(sp * 6.0) - 1.0); // ridged → bright crater rims
    float s = clamp(maria * 0.55 + fine * 0.2 + craters * 0.3, 0.0, 1.0);

    vec3 surf = mix(uDark, uBase, smoothstep(0.18, 0.55, s));
    surf = mix(surf, uLight, smoothstep(0.64, 0.96, s));

    float diff = clamp(dot(normalize(vN), normalize(uLightDir)), 0.0, 1.0);
    vec3 lit = surf * (0.07 + 1.28 * diff);

    // soft cyan rim — keeps the hub identity without an energy glow
    float fres = pow(1.0 - clamp(dot(normalize(vN), normalize(vV)), 0.0, 1.0), 3.0);
    lit += uAtm * fres * 0.5;

    gl_FragColor = vec4(lit, 1.0);
  }
`;

function Planet({
  agent,
  angle,
  radius,
}: {
  agent: AgentHealth;
  angle: number; // degrees around the core (fixed, reference layout)
  radius: number;
}) {
  const orbit = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.ShaderMaterial>(null);
  const r = RECIPE[agent.id] ?? FALLBACK;
  const offline = agent.health === "offline";
  const R = 0.34;

  const rad = (angle * Math.PI) / 180;
  const x = Math.cos(rad) * radius;
  const z = Math.sin(rad) * radius;

  const uniforms = useMemo(
    () => ({
      uBase: { value: new THREE.Color(r.base) },
      uLight: { value: new THREE.Color(r.light) },
      uDark: { value: new THREE.Color(r.dark) },
      uAtm: { value: new THREE.Color(r.atm) },
      uLightDir: { value: new THREE.Vector3(0.45, 0.55, 1.0).normalize() },
      uTime: { value: 0 },
      uEmissive: { value: offline ? 0.06 : r.emissive },
      uBanded: { value: r.banded },
    }),
    [r, offline]
  );

  // Revolve slowly from the reference angle (whole constellation in formation) +
  // spin on axis + a gentle vertical bob.
  useFrame((state, d) => {
    const t = rad + state.clock.elapsedTime * ORBIT_SPEED;
    if (orbit.current) {
      orbit.current.position.x = Math.cos(t) * radius;
      orbit.current.position.z = Math.sin(t) * radius;
      orbit.current.position.y = Math.sin(state.clock.elapsedTime * 0.4 + angle) * 0.07;
    }
    if (spin.current) spin.current.rotation.y += d * 0.22;
    if (mat.current) mat.current.uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <group ref={orbit} position={[x, 0, z]}>
      <mesh ref={spin} rotation={[0.4, 0, 0.12]}>
        <sphereGeometry args={[R, 64, 64]} />
        <shaderMaterial
          ref={mat}
          vertexShader={PLANET_VERT}
          fragmentShader={PLANET_FRAG}
          uniforms={uniforms}
          transparent={offline}
          opacity={offline ? 0.5 : 1}
        />
      </mesh>
      {/* soft outer atmosphere bloom */}
      {!offline && (
        <mesh scale={1.5}>
          <sphereGeometry args={[R, 32, 32]} />
          <meshBasicMaterial color={r.atm} transparent opacity={0.1} side={THREE.BackSide} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      )}
      <Html center distanceFactor={9} position={[0, 0.64, 0]} pointerEvents="none">
        <div className="-translate-y-1 select-none whitespace-nowrap rounded-lg border border-edge/80 bg-bg/70 px-2.5 py-1.5 backdrop-blur-md">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: HEALTH_HEX[agent.health] }} />
            <span className="text-[12px] font-semibold leading-none text-fg">{agent.name}</span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 pl-3 text-[10px] leading-none text-muted">
            <span>{ROLE[agent.id] ?? "agent"}</span>
            <span className="text-faint">·</span>
            <span style={{ color: HEALTH_HEX[agent.health] }}>{HEALTH_WORD[agent.health]}</span>
          </div>
        </div>
      </Html>
    </group>
  );
}

// Central "operator world" — a cratered moon surface (same shader, lunar recipe:
// grey rock, real terminator, no inner glow) ringed by the cyan system rings.
function Core() {
  const spin = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      uBase: { value: new THREE.Color("#7b818c") },
      uLight: { value: new THREE.Color("#d2d7df") },
      uDark: { value: new THREE.Color("#1e2128") },
      uAtm: { value: new THREE.Color("#2ad6f0") }, // faint cyan rim keeps the hub identity
      uLightDir: { value: new THREE.Vector3(0.45, 0.55, 1.0).normalize() },
      uTime: { value: 0 },
      uEmissive: { value: 0.0 },
      uBanded: { value: 0.0 },
    }),
    []
  );
  useFrame((state, d) => {
    if (spin.current) spin.current.rotation.y += d * 0.05;
    if (mat.current) mat.current.uniforms.uTime.value = state.clock.elapsedTime;
  });
  return (
    <group>
      <mesh ref={spin} rotation={[0.3, 0, 0.08]}>
        <sphereGeometry args={[0.74, 96, 96]} />
        <shaderMaterial ref={mat} vertexShader={PLANET_VERT} fragmentShader={MOON_FRAG} uniforms={uniforms} />
      </mesh>
      {/* faint cyan hub glow so the centre still reads as the core */}
      <mesh scale={1.34}>
        <sphereGeometry args={[0.74, 32, 32]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.05} side={THREE.BackSide} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <Html center distanceFactor={9.5} position={[0, 0, 0]} pointerEvents="none">
        <div className="select-none rounded bg-bg/30 px-1.5 py-0.5 font-mono text-[9px] font-semibold tracking-[0.22em] text-white/80 backdrop-blur-sm">
          OPERATOR
        </div>
      </Html>
    </group>
  );
}

function RingSystem() {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, d) => {
    if (ref.current) ref.current.rotation.z += d * 0.05;
  });
  const rings = [
    { r: 1.26, op: 0.4, w: 0.013 },
    { r: 1.66, op: 0.32, w: 0.01 },
    { r: 2.08, op: 0.22, w: 0.007 },
  ];
  return (
    <group rotation={[Math.PI / 2.1, 0, 0]}>
      <group ref={ref}>
        {rings.map((rg, i) => (
          <mesh key={i}>
            <torusGeometry args={[rg.r, rg.w, 12, 200]} />
            <meshBasicMaterial color="#2ad6f0" transparent opacity={rg.op} blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
        ))}
        <mesh>
          <ringGeometry args={[1.28, 2.25, 110]} />
          <meshBasicMaterial color="#0e5e73" transparent opacity={0.12} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      </group>
    </group>
  );
}

function Orbit({ radius }: { radius: number }) {
  return (
    <mesh rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[radius, 0.003, 8, 160]} />
      <meshBasicMaterial color="#22d3ee" transparent opacity={0.07} depthWrite={false} />
    </mesh>
  );
}

// Fixed reference layout: Hermes upper-left, Claude upper-right, OpenClaw
// lower-left, Obsidian lower-right (angle in degrees around the core; the tilted
// plane maps +z→front/bottom, -z→back/top, +x→right, -x→left).
const POS: Record<string, { angle: number; radius: number }> = {
  hermes: { angle: 223, radius: 3.9 },
  claude: { angle: 318, radius: 4.7 },
  openclaw: { angle: 138, radius: 3.4 },
  obsidian: { angle: 44, radius: 4.4 },
};
const FALLBACK_POS = [
  { angle: 44, radius: 4.4 },
  { angle: 138, radius: 3.4 },
  { angle: 223, radius: 3.9 },
  { angle: 318, radius: 4.7 },
];

export function OrreryScene({ agents }: { agents: AgentHealth[] }) {
  const placed = agents.map((a, i) => ({ agent: a, ...(POS[a.id] ?? FALLBACK_POS[i % 4]) }));

  return (
    <Canvas
      camera={{ position: [0, 2.8, 9], fov: 48 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent" }}
      dpr={[1, 2]}
    >
      <ambientLight intensity={0.3} />
      <directionalLight position={[3, 4, 6]} intensity={0.6} color="#dbe9ff" />
      <pointLight position={[8, 5, 5]} intensity={0.5} color="#a78bfa" />
      <Stars radius={80} depth={42} count={1700} factor={3.5} fade speed={0.25} />

      <group>
        <Core />
        <RingSystem />
        {placed.map((p, i) => (
          <Orbit key={i} radius={p.radius} />
        ))}
        {placed.map((p) => (
          <Planet key={p.agent.id} agent={p.agent} angle={p.angle} radius={p.radius} />
        ))}
      </group>

      <OrbitControls
        enableZoom={false}
        enablePan={false}
        minPolarAngle={Math.PI / 3.4}
        maxPolarAngle={Math.PI / 2.05}
        target={[0, 0, 0]}
      />
    </Canvas>
  );
}
