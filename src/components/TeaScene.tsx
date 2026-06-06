import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Float, Html } from "@react-three/drei";
import { Suspense, useMemo, useRef } from "react";
import * as THREE from "three";

function Candle({ position = [0, 0, 0] as [number, number, number] }) {
  const lightRef = useRef<THREE.PointLight>(null!);

  useFrame(({ clock }) => {
    if (lightRef.current) {
      const t = clock.elapsedTime;
      lightRef.current.intensity =
        1.15 + 0.35 * Math.sin(t * 5.0) * Math.sin(t * 3.7 + 1.2);
    }
  });

  return (
    <group position={position}>
      <mesh castShadow position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.2, 16]} />
        <meshStandardMaterial color="#e6dccd" />
      </mesh>
      <mesh position={[0, 0.25, 0]}>
        <sphereGeometry args={[0.03, 16, 16]} />
        <meshBasicMaterial color="#ffcc66" />
      </mesh>
      <pointLight
        ref={lightRef}
        color={new THREE.Color(1, 0.85, 0.6)}
        intensity={1.2}
        distance={1.5}
      />
    </group>
  );
}

/* ────────────────── Steam particles ────────────────── */

function Steam({ position = [0, 0, 0] as [number, number, number] }) {
  const particles = useMemo(() => {
    const temp: THREE.Vector3[] = [];
    for (let i = 0; i < 40; i++)
      temp.push(
        new THREE.Vector3(
          (Math.random() - 0.5) * 0.08,
          Math.random() * 0.15,
          (Math.random() - 0.5) * 0.08
        )
      );
    return temp;
  }, []);

  return (
    <group position={position}>
      {particles.map((p, i) => (
        <Float key={i} speed={1.5} rotationIntensity={0} floatIntensity={0.4}>
          <mesh position={[p.x, p.y, p.z] as [number, number, number]}>
            <sphereGeometry args={[0.01 + Math.random() * 0.01, 8, 8]} />
            <meshStandardMaterial color="#ffffff" transparent opacity={0.35} />
          </mesh>
        </Float>
      ))}
    </group>
  );
}

/* ────────────────── Falling Petals ────────────────── */

function Petals() {
  const count = 80;
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = new THREE.Color("#ffc0cb");
  const positions = useMemo(
    () =>
      Array.from(
        { length: count },
        () =>
          [
            (Math.random() - 0.5) * 4,
            Math.random() * 2 + 1,
            (Math.random() - 0.5) * 4,
          ] as [number, number, number]
      ),
    [count]
  );
  const speeds = useMemo(
    () => positions.map(() => 0.003 + Math.random() * 0.004),
    [positions]
  );

  useFrame(({ clock }) => {
    const m = meshRef.current;
    if (!m) return;
    const t = clock.elapsedTime;
    positions.forEach((pos, i) => {
      const y = pos[1] - speeds[i];
      pos[1] = y < -0.2 ? 2 + Math.random() * 1 : y;
      dummy.position.set(
        pos[0] + Math.sin((t * 60 + i) * 0.002) * 0.01,
        pos[1],
        pos[2]
      );
      dummy.rotation.set(0, 0, (t * 60 + i) * 0.01);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined as any, undefined as any, count]}
    >
      <sphereGeometry args={[0.02, 6, 6]} />
      <meshStandardMaterial color={color} roughness={0.8} metalness={0} />
    </instancedMesh>
  );
}

/* ────────────────── Speech Bubble ────────────────── */

function SpeechBubble({
  message,
  yOffset = 0.6,
}: {
  message?: string;
  yOffset?: number;
}) {
  if (!message) return null;

  return (
    <Html
      position={[0, yOffset, 0]}
      center
      distanceFactor={2}
      style={{ pointerEvents: "none" }}
    >
      <div
        style={{
          background: "rgba(255, 255, 255, 0.95)",
          color: "#1a1a2e",
          padding: "6px 12px",
          borderRadius: "12px",
          fontSize: "11px",
          fontFamily: "'Inter', sans-serif",
          maxWidth: "130px",
          width: "max-content",
          textAlign: "center",
          boxShadow: "0 3px 12px rgba(0,0,0,0.15)",
          wordBreak: "break-word",
          whiteSpace: "pre-wrap",
          lineHeight: 1.35,
          position: "relative",
        }}
      >
        {message}
        <div
          style={{
            position: "absolute",
            bottom: "-5px",
            left: "50%",
            transform: "translateX(-50%)",
            width: 0,
            height: 0,
            borderLeft: "5px solid transparent",
            borderRight: "5px solid transparent",
            borderTop: "5px solid rgba(255, 255, 255, 0.95)",
          }}
        />
      </div>
    </Html>
  );
}

/* ────────────────── Avatar ────────────────── */

function Avatar({
  name = "",
  position = [0, 0, 0] as [number, number, number],
  gender = "male",
  message,
}: {
  name?: string;
  position?: [number, number, number];
  gender?: "male" | "female";
  message?: string;
}) {
  const isMale = gender === "male";
  const bodyColor = isMale ? "#4a7fd4" : "#e06088";
  const hairColor = isMale ? "#3d2b1f" : "#6b3a2a";
  const skinColor = "#f0c8a0";

  return (
    <group position={position}>
      <group position={[0, -0.05, 0]}>
        {/* ── Body / Torso ── */}
        <mesh castShadow>
          <capsuleGeometry args={[0.07, 0.08, 8, 16]} />
          <meshStandardMaterial color={bodyColor} />
        </mesh>

        {/* ── Arms ── */}
        <mesh castShadow position={[-0.1, -0.01, 0]} rotation={[0, 0, -0.35]}>
          <capsuleGeometry args={[0.025, 0.07, 4, 8]} />
          <meshStandardMaterial color={bodyColor} />
        </mesh>
        <mesh castShadow position={[0.1, -0.01, 0]} rotation={[0, 0, 0.35]}>
          <capsuleGeometry args={[0.025, 0.07, 4, 8]} />
          <meshStandardMaterial color={bodyColor} />
        </mesh>

        {/* ── Hands ── */}
        <mesh position={[-0.13, -0.07, 0]}>
          <sphereGeometry args={[0.02, 8, 8]} />
          <meshStandardMaterial color={skinColor} />
        </mesh>
        <mesh position={[0.13, -0.07, 0]}>
          <sphereGeometry args={[0.02, 8, 8]} />
          <meshStandardMaterial color={skinColor} />
        </mesh>

        {/* ── Head (Big Chibi Head) ── */}
        <mesh castShadow position={[0, 0.16, 0]}>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshStandardMaterial color={skinColor} />
        </mesh>

        {/* ── Eyes ── */}
        <mesh position={[-0.04, 0.17, 0.1]}>
          <sphereGeometry args={[0.015, 8, 8]} />
          <meshBasicMaterial color="#2c2c2c" />
        </mesh>
        <mesh position={[0.04, 0.17, 0.1]}>
          <sphereGeometry args={[0.015, 8, 8]} />
          <meshBasicMaterial color="#2c2c2c" />
        </mesh>

        {/* ── Blush cheeks ── */}
        <mesh position={[-0.07, 0.14, 0.09]}>
          <sphereGeometry args={[0.02, 8, 8]} />
          <meshStandardMaterial color="#ffaaaa" transparent opacity={0.6} />
        </mesh>
        <mesh position={[0.07, 0.14, 0.09]}>
          <sphereGeometry args={[0.02, 8, 8]} />
          <meshStandardMaterial color="#ffaaaa" transparent opacity={0.6} />
        </mesh>

        {/* ── Hair ── */}
        {isMale ? (
          <mesh position={[0, 0.24, -0.01]}>
            <sphereGeometry args={[0.11, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
            <meshStandardMaterial color={hairColor} />
          </mesh>
        ) : (
          <>
            <mesh position={[0, 0.25, -0.01]}>
              <sphereGeometry args={[0.115, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
              <meshStandardMaterial color={hairColor} />
            </mesh>
            <mesh position={[-0.09, 0.07, -0.03]}>
              <capsuleGeometry args={[0.025, 0.12, 4, 8]} />
              <meshStandardMaterial color={hairColor} />
            </mesh>
            <mesh position={[0.09, 0.07, -0.03]}>
              <capsuleGeometry args={[0.025, 0.12, 4, 8]} />
              <meshStandardMaterial color={hairColor} />
            </mesh>
            <mesh position={[0.07, 0.26, 0.04]}>
              <boxGeometry args={[0.05, 0.02, 0.01]} />
              <meshStandardMaterial color="#ff6b9d" />
            </mesh>
          </>
        )}
      </group>

      {/* ── Name label ── */}
      {name && (
        <Html
          position={[0, 0.4, 0]}
          center
          distanceFactor={2}
          style={{ pointerEvents: "none" }}
        >
          <div
            style={{
              background: "rgba(0, 0, 0, 0.6)",
              color: "#fff",
              padding: "3px 9px",
              borderRadius: "6px",
              fontSize: "11px",
              fontFamily: "'Inter', sans-serif",
              whiteSpace: "nowrap",
              backdropFilter: "blur(4px)",
            }}
          >
            {name}
          </div>
        </Html>
      )}

      {/* ── Message bubble ── */}
      <SpeechBubble message={message} yOffset={0.58} />
    </group>
  );
}

/* ────────────────── Table Set ────────────────── */

function TableSet() {
  return (
    <group>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]}>
        <circleGeometry args={[3, 64]} />
        <meshStandardMaterial color="#2a2a2a" />
      </mesh>
      <mesh castShadow position={[0, 0.4, 0]}>
        <cylinderGeometry args={[0.6, 0.6, 0.05, 32]} />
        <meshStandardMaterial color="#5b4636" />
      </mesh>
      {/* Teapot */}
      <mesh castShadow position={[0, 0.48, 0]}>
        <sphereGeometry args={[0.12, 24, 24]} />
        <meshStandardMaterial color="#d9d2c4" />
      </mesh>
      {/* Teacups */}
      <mesh castShadow position={[-0.25, 0.46, 0.15]}>
        <cylinderGeometry args={[0.05, 0.05, 0.03, 16]} />
        <meshStandardMaterial color="#e9e3d8" />
      </mesh>
      <mesh castShadow position={[0.25, 0.46, -0.15]}>
        <cylinderGeometry args={[0.05, 0.05, 0.03, 16]} />
        <meshStandardMaterial color="#e9e3d8" />
      </mesh>
      <Steam position={[-0.25, 0.48, 0.15]} />
      <Steam position={[0.25, 0.48, -0.15]} />
      <Candle position={[-0.4, 0.45, -0.2]} />
      <Candle position={[0.4, 0.45, 0.2]} />
    </group>
  );
}

/* ────────────────── Main Scene ────────────────── */

export default function TeaScene({
  you = "",
  partner = "",
  youGender = "male",
  partnerGender = "male",
  youMessage,
  partnerMessage,
}: {
  you?: string;
  partner?: string;
  youGender?: "male" | "female";
  partnerGender?: "male" | "female";
  youMessage?: string;
  partnerMessage?: string;
}) {
  return (
    <div className="w-full h-full">
      <Canvas shadows camera={{ position: [0, 1.2, 2.4], fov: 50 }}>
        <ambientLight intensity={0.4} />
        <directionalLight
          position={[2, 3, 2]}
          intensity={0.8}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />

        <Suspense fallback={null}>
          <group>
            <TableSet />
            <Avatar
              name={you}
              gender={youGender}
              position={[-0.6, 0.46, 0]}
              message={youMessage}
            />
            <Avatar
              name={partner}
              gender={partnerGender}
              position={[0.6, 0.46, 0]}
              message={partnerMessage}
            />
            <Petals />
          </group>
        </Suspense>
        <OrbitControls
          enablePan={false}
          minDistance={1.6}
          maxDistance={3.2}
          target={[0, 0.5, 0]}
        />
      </Canvas>
    </div>
  );
}
