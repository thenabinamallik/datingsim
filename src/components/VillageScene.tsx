import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float, Sky, Html } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

/* ────────────────── Keyboard Movement ────────────────── */

function useMovement() {
  const [keys, setKeys] = useState<Record<string, boolean>>({});
  useEffect(() => {
    const isTyping = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      return target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');
    };

    const down = (e: KeyboardEvent) => {
      if (isTyping(e)) return;
      setKeys((k) => ({ ...k, [e.key.toLowerCase()]: true }));
    };
    const up = (e: KeyboardEvent) => {
      if (isTyping(e)) return;
      setKeys((k) => ({ ...k, [e.key.toLowerCase()]: false }));
    };
    
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);
  return {
    forward: keys["w"] || keys["arrowup"],
    back: keys["s"] || keys["arrowdown"],
    left: keys["a"] || keys["arrowleft"],
    right: keys["d"] || keys["arrowright"],
  };
}

/* ────────────────── Speech Bubble ────────────────── */

function SpeechBubble({
  message,
  yOffset = 1.0,
}: {
  message?: string;
  yOffset?: number;
}) {
  if (!message) return null;

  return (
    <Html
      position={[0, yOffset, 0]}
      center
      distanceFactor={4}
      style={{ pointerEvents: "none" }}
    >
      <div
        style={{
          background: "rgba(255, 255, 255, 0.95)",
          color: "#1a1a2e",
          padding: "6px 12px",
          borderRadius: "12px",
          fontSize: "12px",
          fontFamily: "'Inter', sans-serif",
          maxWidth: "140px",
          width: "max-content",
          textAlign: "center",
          boxShadow: "0 3px 12px rgba(0,0,0,0.18)",
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

/* ────────────────── Character Body (shared) ────────────────── */

function CharacterBody({
  gender = "male",
}: {
  gender?: "male" | "female";
}) {
  const isMale = gender === "male";
  const bodyColor = isMale ? "#4a7fd4" : "#e06088";
  const hairColor = isMale ? "#3d2b1f" : "#6b3a2a";
  const skinColor = "#f0c8a0";

  return (
    <group position={[0, -0.05, 0]}>
      {/* ── Legs ── */}
      {isMale ? (
        <>
          <mesh castShadow position={[-0.05, -0.12, 0]}>
            <capsuleGeometry args={[0.045, 0.08, 4, 8]} />
            <meshStandardMaterial color="#5a4a3a" />
          </mesh>
          <mesh castShadow position={[0.05, -0.12, 0]}>
            <capsuleGeometry args={[0.045, 0.08, 4, 8]} />
            <meshStandardMaterial color="#5a4a3a" />
          </mesh>
          {/* Shoes */}
          <mesh position={[-0.05, -0.2, 0.02]}>
            <boxGeometry args={[0.06, 0.03, 0.08]} />
            <meshStandardMaterial color="#333" />
          </mesh>
          <mesh position={[0.05, -0.2, 0.02]}>
            <boxGeometry args={[0.06, 0.03, 0.08]} />
            <meshStandardMaterial color="#333" />
          </mesh>
        </>
      ) : (
        <>
          {/* Skirt / Dress bottom */}
          <mesh castShadow position={[0, -0.1, 0]}>
            <cylinderGeometry args={[0.09, 0.14, 0.15, 12]} />
            <meshStandardMaterial color={bodyColor} />
          </mesh>
          {/* Feet */}
          <mesh position={[-0.04, -0.18, 0.02]}>
            <boxGeometry args={[0.05, 0.03, 0.07]} />
            <meshStandardMaterial color="#e06088" />
          </mesh>
          <mesh position={[0.04, -0.18, 0.02]}>
            <boxGeometry args={[0.05, 0.03, 0.07]} />
            <meshStandardMaterial color="#e06088" />
          </mesh>
        </>
      )}

      {/* ── Body / Torso ── */}
      <mesh castShadow>
        <capsuleGeometry args={[0.1, 0.1, 8, 16]} />
        <meshStandardMaterial color={bodyColor} />
      </mesh>

      {/* ── Arms ── */}
      <mesh castShadow position={[-0.14, -0.02, 0]} rotation={[0, 0, -0.35]}>
        <capsuleGeometry args={[0.035, 0.1, 4, 8]} />
        <meshStandardMaterial color={bodyColor} />
      </mesh>
      <mesh castShadow position={[0.14, -0.02, 0]} rotation={[0, 0, 0.35]}>
        <capsuleGeometry args={[0.035, 0.1, 4, 8]} />
        <meshStandardMaterial color={bodyColor} />
      </mesh>

      {/* ── Hands ── */}
      <mesh position={[-0.18, -0.1, 0]}>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshStandardMaterial color={skinColor} />
      </mesh>
      <mesh position={[0.18, -0.1, 0]}>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshStandardMaterial color={skinColor} />
      </mesh>

      {/* ── Head (Big Chibi Head) ── */}
      <mesh castShadow position={[0, 0.22, 0]}>
        <sphereGeometry args={[0.16, 16, 16]} />
        <meshStandardMaterial color={skinColor} />
      </mesh>

      {/* ── Eyes ── */}
      <mesh position={[-0.05, 0.23, 0.14]}>
        <sphereGeometry args={[0.02, 8, 8]} />
        <meshBasicMaterial color="#2c2c2c" />
      </mesh>
      <mesh position={[0.05, 0.23, 0.14]}>
        <sphereGeometry args={[0.02, 8, 8]} />
        <meshBasicMaterial color="#2c2c2c" />
      </mesh>

      {/* ── Blush cheeks ── */}
      <mesh position={[-0.09, 0.19, 0.12]}>
        <sphereGeometry args={[0.025, 8, 8]} />
        <meshStandardMaterial color="#ffaaaa" transparent opacity={0.6} />
      </mesh>
      <mesh position={[0.09, 0.19, 0.12]}>
        <sphereGeometry args={[0.025, 8, 8]} />
        <meshStandardMaterial color="#ffaaaa" transparent opacity={0.6} />
      </mesh>

      {/* ── Hair ── */}
      {isMale ? (
        <mesh position={[0, 0.33, -0.02]}>
          <sphereGeometry args={[0.15, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
          <meshStandardMaterial color={hairColor} />
        </mesh>
      ) : (
        <>
          <mesh position={[0, 0.34, -0.02]}>
            <sphereGeometry args={[0.155, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
            <meshStandardMaterial color={hairColor} />
          </mesh>
          <mesh position={[-0.12, 0.1, -0.04]}>
            <capsuleGeometry args={[0.035, 0.16, 4, 8]} />
            <meshStandardMaterial color={hairColor} />
          </mesh>
          <mesh position={[0.12, 0.1, -0.04]}>
            <capsuleGeometry args={[0.035, 0.16, 4, 8]} />
            <meshStandardMaterial color={hairColor} />
          </mesh>
          <mesh position={[0.09, 0.36, 0.06]}>
            <boxGeometry args={[0.07, 0.03, 0.015]} />
            <meshStandardMaterial color="#ff6b9d" />
          </mesh>
        </>
      )}
    </group>
  );
}

/* ────────────────── Local Player ────────────────── */

function Player({
  gender = "male",
  name = "",
  message,
  onMove,
}: {
  gender?: "male" | "female";
  name?: string;
  message?: string;
  onMove?: (x: number, y: number, z: number, ry: number) => void;
}) {
  const ref = useRef<THREE.Group>(null!);
  const vel = useRef(new THREE.Vector3());
  const dir = useRef(new THREE.Vector3());
  const speed = 1.8;
  const bounds = 50;
  const { camera, gl } = useThree();
  const move = useMovement();
  const lastSent = useRef(0);
  const angleOffset = useRef(0);
  const cameraAngle = useRef(Math.PI); // behind character (facing +Z by default)

  useEffect(() => {
    let isDragging = false;
    let previousX = 0;

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      previousX = e.clientX;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - previousX;
      angleOffset.current -= deltaX * 0.005;
      previousX = e.clientX;
    };
    const onPointerUp = () => {
      isDragging = false;
    };

    const canvas = gl.domElement;
    canvas.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [gl]);

  useFrame((state, delta) => {
    /* ── Movement relative to camera facing direction ── */
    const camForward = new THREE.Vector3();
    camera.getWorldDirection(camForward);
    camForward.y = 0;
    camForward.normalize();
    const camRight = new THREE.Vector3().crossVectors(camForward, new THREE.Vector3(0, 1, 0)).normalize();

    dir.current.set(0, 0, 0);
    if (move.forward) dir.current.add(camForward);
    if (move.back) dir.current.sub(camForward);
    if (move.left) dir.current.sub(camRight);
    if (move.right) dir.current.add(camRight);

    if (dir.current.lengthSq() > 0) {
      dir.current.normalize().multiplyScalar(speed * delta);
      vel.current.lerp(dir.current, 0.6);
    } else {
      vel.current.lerp(new THREE.Vector3(0, 0, 0), 0.2);
    }

    ref.current.position.add(vel.current);
    ref.current.position.x = THREE.MathUtils.clamp(
      ref.current.position.x,
      -bounds,
      bounds
    );
    ref.current.position.z = THREE.MathUtils.clamp(
      ref.current.position.z,
      -bounds,
      bounds
    );

    /* ── Face the character in the direction of movement ── */
    if (vel.current.lengthSq() > 1e-6) {
      const angle = Math.atan2(vel.current.x, vel.current.z);
      ref.current.rotation.y = angle;
    }

    /* ── Third-person follow camera (always behind character) ── */
    const followDistance = 3.4;
    const followHeight = 2.0;

    // The target camera angle is directly behind the character + manual drag offset
    const targetAngle = ref.current.rotation.y + Math.PI + angleOffset.current;
    // Smoothly lerp the camera's orbit angle toward the target
    cameraAngle.current = THREE.MathUtils.lerp(cameraAngle.current, targetAngle, 0.06);

    const desired = new THREE.Vector3(
      ref.current.position.x + Math.sin(cameraAngle.current) * followDistance,
      ref.current.position.y + followHeight,
      ref.current.position.z + Math.cos(cameraAngle.current) * followDistance
    );
    camera.position.lerp(desired, 0.08);

    // Look slightly above the character
    const lookTarget = new THREE.Vector3(
      ref.current.position.x,
      ref.current.position.y + 0.5,
      ref.current.position.z
    );
    camera.lookAt(lookTarget);

    /* ── Gradually reset drag offset so camera re-centers behind character ── */
    angleOffset.current = THREE.MathUtils.lerp(angleOffset.current, 0, 0.02);

    const now = state.clock.getElapsedTime();
    if (onMove && now - lastSent.current > 0.1) {
      lastSent.current = now;
      onMove(
        ref.current.position.x,
        ref.current.position.y,
        ref.current.position.z,
        ref.current.rotation.y
      );
    }
  });

  return (
    <group ref={ref} position={[0, 0.35, 0] as [number, number, number]}>
      <CharacterBody gender={gender} />

      {/* Name label */}
      {name && (
        <Html
          position={[0, 0.45, 0]}
          center
          distanceFactor={4}
          style={{ pointerEvents: "none" }}
        >
          <div
            style={{
              background: "rgba(0, 0, 0, 0.6)",
              color: "#ffffff",
              padding: "4px 10px",
              borderRadius: "6px",
              fontSize: "13px",
              fontFamily: "'Inter', sans-serif",
              whiteSpace: "nowrap",
              backdropFilter: "blur(4px)",
            }}
          >
            {name}
          </div>
        </Html>
      )}

      {/* Speech bubble */}
      <SpeechBubble message={message} yOffset={0.65} />
    </group>
  );
}

/* ────────────────── Trees ────────────────── */

function Tree({
  position = [0, 0, 0] as [number, number, number],
}) {
  return (
    <group position={position}>
      <mesh castShadow position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.08, 0.1, 1, 8]} />
        <meshStandardMaterial color="#8b5a2b" />
      </mesh>
      <Float speed={1.2} floatIntensity={0.2}>
        <mesh castShadow position={[0, 1.2, 0]}>
          <icosahedronGeometry args={[0.6, 0]} />
          <meshStandardMaterial color="#4caf50" />
        </mesh>
      </Float>
    </group>
  );
}

/* ────────────────── Houses ────────────────── */

function House({
  position = [0, 0, 0] as [number, number, number],
}) {
  return (
    <group position={position}>
      <mesh castShadow position={[0, 0.4, 0]}>
        <boxGeometry args={[1.2, 0.8, 1]} />
        <meshStandardMaterial color="#c7b299" />
      </mesh>
      <mesh castShadow position={[0, 0.95, 0]}>
        <coneGeometry args={[0.9, 0.6, 4]} />
        <meshStandardMaterial color="#795548" />
      </mesh>
    </group>
  );
}

/* ────────────────── Rocks ────────────────── */

function Rock({
  position = [0, 0, 0] as [number, number, number],
}) {
  return (
    <group position={position}>
      <mesh castShadow position={[0, 0.15, 0]}>
        <dodecahedronGeometry args={[0.3, 0]} />
        <meshStandardMaterial color="#7f8c8d" />
      </mesh>
    </group>
  );
}

/* ────────────────── Bushes ────────────────── */

function Bush({
  position = [0, 0, 0] as [number, number, number],
}) {
  return (
    <group position={position}>
      <mesh castShadow position={[0, 0.3, 0]}>
        <sphereGeometry args={[0.4, 8, 8]} />
        <meshStandardMaterial color="#2e7d32" />
      </mesh>
      <mesh castShadow position={[0.2, 0.2, 0.1]}>
        <sphereGeometry args={[0.25, 8, 8]} />
        <meshStandardMaterial color="#2e7d32" />
      </mesh>
      <mesh castShadow position={[-0.2, 0.2, -0.1]}>
        <sphereGeometry args={[0.25, 8, 8]} />
        <meshStandardMaterial color="#2e7d32" />
      </mesh>
    </group>
  );
}

/* ────────────────── Notes ────────────────── */

function Note({
  position = [0, 0, 0] as [number, number, number],
  messageIndex = 0,
}: {
  position?: [number, number, number];
  messageIndex?: number;
}) {
  const messages = [
    "You're doing great!",
    "Keep going!",
    "You've got this!",
    "Stay strong!",
    "You're amazing!",
    "Keep pushing forward!",
    "You're capable of anything!",
    "Believe in yourself!",
    "You're making progress!",
    "Stay focused!",
  ];

  const randomMessage = useMemo(
    () => messages[messageIndex % messages.length],
    [messageIndex]
  );

  return (
    <group position={position}>
      <Float speed={1} floatIntensity={0.3}>
        <mesh castShadow>
          <boxGeometry args={[0.3, 0.4, 0.02]} />
          <meshStandardMaterial color="#fff9c4" />
        </mesh>
        <Html
          position={[0, 0, 0.02]}
          center
          distanceFactor={3}
          transform
          style={{ pointerEvents: "none" }}
        >
          <div
            style={{
              width: "80px",
              textAlign: "center",
              color: "#3e2723",
              fontSize: "9px",
              fontFamily: '"Georgia", serif',
              fontWeight: "bold",
              lineHeight: 1.3,
              padding: "4px",
              userSelect: "none",
            }}
          >
            {randomMessage}
          </div>
        </Html>
      </Float>
    </group>
  );
}

/* ────────────────── Village World ────────────────── */

// Deterministic random number generator
const seededRandom = (seed: number) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

function VillageWorld({
  playerPosition = [0, 0, 0] as [number, number, number],
}) {
  const rawMapSize = Math.max(
    80,
    Math.abs(playerPosition[0]) * 2 + 20,
    Math.abs(playerPosition[2]) * 2 + 20
  );
  const mapSize = Math.ceil(rawMapSize / 20) * 20;

  const fixedObjectArea = 160;

  const trees = useMemo(() => {
    const treeCount = 80;
    return Array.from({ length: treeCount }, (_, i) => [
      (seededRandom(i * 10 + 1) - 0.5) * fixedObjectArea,
      0,
      (seededRandom(i * 10 + 2) - 0.5) * fixedObjectArea,
    ] as [number, number, number]);
  }, []);

  const houses = useMemo(() => {
    const houseCount = 12;
    return Array.from({ length: houseCount }, (_, i) => [
      (seededRandom(i * 10 + 3) - 0.5) * fixedObjectArea,
      0,
      (seededRandom(i * 10 + 4) - 0.5) * fixedObjectArea,
    ] as [number, number, number]);
  }, []);

  const notes = useMemo(() => {
    const noteCount = 10;
    return Array.from({ length: noteCount }, (_, i) => [
      (seededRandom(i * 10 + 5) - 0.5) * fixedObjectArea,
      0.5,
      (seededRandom(i * 10 + 6) - 0.5) * fixedObjectArea,
    ] as [number, number, number]);
  }, []);

  const rocks = useMemo(() => {
    const rockCount = 30;
    return Array.from({ length: rockCount }, (_, i) => [
      (seededRandom(i * 10 + 7) - 0.5) * fixedObjectArea,
      0,
      (seededRandom(i * 10 + 8) - 0.5) * fixedObjectArea,
    ] as [number, number, number]);
  }, []);

  const bushes = useMemo(() => {
    const bushCount = 40;
    return Array.from({ length: bushCount }, (_, i) => [
      (seededRandom(i * 10 + 9) - 0.5) * fixedObjectArea,
      0,
      (seededRandom(i * 10 + 10) - 0.5) * fixedObjectArea,
    ] as [number, number, number]);
  }, []);

  return (
    <group>
      {/* Ground */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[mapSize, mapSize, 1, 1]} />
        <meshStandardMaterial color="#9ccc65" />
      </mesh>

      {/* Paths */}
      <mesh
        receiveShadow
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.001, 0]}
      >
        <planeGeometry args={[4, mapSize, 1, 1]} />
        <meshStandardMaterial color="#a1887f" />
      </mesh>
      <mesh
        receiveShadow
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.001, 0]}
      >
        <planeGeometry args={[mapSize, 3, 1, 1]} />
        <meshStandardMaterial color="#a1887f" />
      </mesh>

      {houses.map((p, i) => (
        <House key={i} position={p} />
      ))}
      {trees.map((p, i) => (
        <Tree key={i} position={p} />
      ))}
      {notes.map((p, i) => (
        <Note key={i} position={p} messageIndex={i} />
      ))}
      {rocks.map((p, i) => (
        <Rock key={i} position={p} />
      ))}
      {bushes.map((p, i) => (
        <Bush key={i} position={p} />
      ))}
    </group>
  );
}

/* ────────────────── Remote Player ────────────────── */

export type RemoteData = {
  x: number;
  y: number;
  z: number;
  ry: number;
  name?: string;
  gender?: "male" | "female";
  lastMessage?: string;
} | null;

function RemotePlayer({ data }: { data: RemoteData }) {
  if (!data) return null;

  return (
    <group
      position={[data.x, data.y, data.z]}
      rotation={[0, data.ry, 0] as [number, number, number]}
    >
      <CharacterBody gender={data.gender} />

      {/* Name label */}
      {data.name && (
        <Html
          position={[0, 0.45, 0]}
          center
          distanceFactor={4}
          style={{ pointerEvents: "none" }}
        >
          <div
            style={{
              background: "rgba(0, 0, 0, 0.6)",
              color: "#ffffff",
              padding: "4px 10px",
              borderRadius: "6px",
              fontSize: "13px",
              fontFamily: "'Inter', sans-serif",
              whiteSpace: "nowrap",
              backdropFilter: "blur(4px)",
            }}
          >
            {data.name}
          </div>
        </Html>
      )}

      {/* Speech bubble */}
      <SpeechBubble message={data.lastMessage} yOffset={0.65} />
    </group>
  );
}

/* ────────────────── Main Scene ────────────────── */

export default function VillageScene({
  onSelfMove,
  partner,
  youGender = "male",
  youName = "",
  youMessage,
}: {
  onSelfMove?: (x: number, y: number, z: number, ry: number) => void;
  partner?: RemoteData;
  youGender?: "male" | "female";
  youName?: string;
  youMessage?: string;
}) {
  const [playerPosition, setPlayerPosition] = useState([0, 0, 0]);

  const handlePlayerMove = (
    x: number,
    y: number,
    z: number,
    ry: number
  ) => {
    setPlayerPosition([x, y, z]);
    onSelfMove?.(x, y, z, ry);
  };

  return (
    <div className="w-full h-full">
      <Canvas shadows camera={{ position: [0, 1.6, 3], fov: 60 }}>
        <fog attach="fog" args={["#c8e6c9", 10, 60]} />
        <hemisphereLight args={[0xffffff, 0x335533, 0.65]} />
        <directionalLight
          position={[6, 8, 3]}
          intensity={0.8}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />

        <Suspense fallback={null}>
          <VillageWorld playerPosition={playerPosition} />
          <Player
            onMove={handlePlayerMove}
            gender={youGender}
            name={youName}
            message={youMessage}
          />
          <RemotePlayer data={partner ?? null} />
          <Sky sunPosition={[100, 20, 100]} turbidity={4} rayleigh={3} />
        </Suspense>
      </Canvas>
    </div>
  );
}
