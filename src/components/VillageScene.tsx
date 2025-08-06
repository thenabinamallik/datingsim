import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float, Sky } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

function useMovement() {
  const [keys, setKeys] = useState<Record<string, boolean>>({});
  useEffect(() => {
    const down = (e: KeyboardEvent) => setKeys((k) => ({ ...k, [e.key.toLowerCase()]: true }));
    const up = (e: KeyboardEvent) => setKeys((k) => ({ ...k, [e.key.toLowerCase()]: false }));
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

function Player({ 
  gender = 'male', 
  onMove 
}: { 
  gender?: 'male' | 'female'; 
  onMove?: (x: number, y: number, z: number, ry: number) => void 
}) {
  const ref = useRef<THREE.Group>(null!);
  const vel = useRef(new THREE.Vector3());
  const dir = useRef(new THREE.Vector3());
  const speed = 1.8; // m/s
  const bounds = 50; // Increased world bounds for auto-extending
  const { camera } = useThree();
  const move = useMovement();
  const lastSent = useRef(0);

  const playerColor = gender === 'male' ? "#8ab4f8" : "#f8a8c4";

  useFrame((state, delta) => {
    dir.current.set(0, 0, 0);
    if (move.forward) dir.current.z -= 1;
    if (move.back) dir.current.z += 1;
    if (move.left) dir.current.x -= 1;
    if (move.right) dir.current.x += 1;

    if (dir.current.lengthSq() > 0) {
      dir.current.normalize().multiplyScalar(speed * delta);
      vel.current.lerp(dir.current, 0.6);
    } else {
      vel.current.lerp(new THREE.Vector3(0, 0, 0), 0.2);
    }

    ref.current.position.add(vel.current);
    // Clamp to bounds
    ref.current.position.x = THREE.MathUtils.clamp(ref.current.position.x, -bounds, bounds);
    ref.current.position.z = THREE.MathUtils.clamp(ref.current.position.z, -bounds, bounds);

    // Face movement direction
    if (vel.current.lengthSq() > 1e-6) {
      const angle = Math.atan2(vel.current.x, vel.current.z);
      ref.current.rotation.y = angle;
    }

    // Camera follow
    const desired = new THREE.Vector3(ref.current.position.x - 2.2, 1.6, ref.current.position.z + 2.6);
    camera.position.lerp(desired, 0.1);
    camera.lookAt(ref.current.position.x, ref.current.position.y + 0.6, ref.current.position.z);

    // Emit movement (throttled)
    const now = state.clock.getElapsedTime();
    if (onMove && (now - lastSent.current > 0.1)) {
      lastSent.current = now;
      onMove(ref.current.position.x, ref.current.position.y, ref.current.position.z, ref.current.rotation.y);
    }
  });

  return (
    <group ref={ref} position={[0, 0.35, 0] as [number, number, number]}> 
      <mesh castShadow>
        <capsuleGeometry args={[0.2, 0.5, 8, 16]} />
        <meshStandardMaterial color={playerColor} />
      </mesh>
    </group>
  );
}

function Tree({ position = [0, 0, 0] as [number, number, number] }) {
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

function House({ position = [0, 0, 0] as [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow position={[0, 0.4, 0]}> 
        <boxGeometry args={[1.2, 0.8, 1]} />
        <meshStandardMaterial color="#c7b299" />
      </mesh>
      <mesh castShadow position={[0, 0.95, 0]} rotation={[0, 0, 0]}>
        <coneGeometry args={[0.9, 0.6, 4]} />
        <meshStandardMaterial color="#795548" />
      </mesh>
    </group>
  );
}

function Note({ position = [0, 0, 0] as [number, number, number] }) {
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
    "Stay focused!"
  ];
  
  const randomMessage = messages[Math.floor(Math.random() * messages.length)];
  
  return (
    <group position={position}>
      <Float speed={1} floatIntensity={0.3}>
        <mesh castShadow>
          <boxGeometry args={[0.3, 0.4, 0.02]} />
          <meshStandardMaterial color="#fff9c4" />
        </mesh>
        <mesh position={[0, 0, 0.02]}>
          <planeGeometry args={[0.25, 0.35]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.8} />
        </mesh>
      </Float>
    </group>
  );
}

function VillageWorld({ playerPosition = [0, 0, 0] as [number, number, number] }) {
  // Auto-extend map based on player position
  const mapSize = Math.max(80, Math.abs(playerPosition[0]) * 2 + 20, Math.abs(playerPosition[2]) * 2 + 20);
  
  const trees = useMemo(() => {
    const treeCount = Math.floor(mapSize / 2);
    return Array.from({ length: treeCount }, () => [
      (Math.random() - 0.5) * mapSize,
      0,
      (Math.random() - 0.5) * mapSize,
    ] as [number, number, number]);
  }, [mapSize]);
  
  const houses = useMemo(() => {
    const houseCount = Math.floor(mapSize / 20);
    return Array.from({ length: houseCount }, () => [
      (Math.random() - 0.5) * mapSize,
      0,
      (Math.random() - 0.5) * mapSize,
    ] as [number, number, number]);
  }, [mapSize]);

  const notes = useMemo(() => {
    const noteCount = Math.floor(mapSize / 15);
    return Array.from({ length: noteCount }, () => [
      (Math.random() - 0.5) * mapSize,
      0.5,
      (Math.random() - 0.5) * mapSize,
    ] as [number, number, number]);
  }, [mapSize]);

  return (
    <group>
      {/* Ground - auto-extending */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[mapSize, mapSize, 1, 1]} />
        <meshStandardMaterial color="#9ccc65" />
      </mesh>

      {/* Paths - auto-extending */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
        <planeGeometry args={[4, mapSize, 1, 1]} />
        <meshStandardMaterial color="#a1887f" />
      </mesh>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
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
        <Note key={i} position={p} />
      ))}
    </group>
  );
}

export type RemoteData = { 
  x: number; 
  y: number; 
  z: number; 
  ry: number; 
  name?: string;
  gender?: 'male' | 'female';
} | null;

function RemotePlayer({ data }: { data: RemoteData }) {
  if (!data) return null;
  
  const playerColor = data.gender === 'female' ? "#f8a8c4" : "#8ab4f8";
  
  return (
    <group position={[data.x, data.y, data.z]} rotation={[0, data.ry, 0] as [number, number, number]}>
      <mesh castShadow>
        <capsuleGeometry args={[0.2, 0.5, 8, 16]} />
        <meshStandardMaterial color={playerColor} />
      </mesh>
    </group>
  );
}

export default function VillageScene({ 
  onSelfMove, 
  partner, 
  youGender = 'male'
}: { 
  onSelfMove?: (x: number, y: number, z: number, ry: number) => void; 
  partner?: RemoteData;
  youGender?: 'male' | 'female';
}) {
  const [playerPosition, setPlayerPosition] = useState([0, 0, 0]);

  const handlePlayerMove = (x: number, y: number, z: number, ry: number) => {
    setPlayerPosition([x, y, z]);
    onSelfMove?.(x, y, z, ry);
  };

  return (
    <div className="w-full h-full">
      <Canvas shadows camera={{ position: [0, 1.6, 3], fov: 60 }}>
        <fog attach="fog" args={["#c8e6c9", 10, 60]} />
        <hemisphereLight args={[0xffffff, 0x335533, 0.65]} />
        <directionalLight position={[6, 8, 3]} intensity={0.8} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />

        <Suspense fallback={null}>
          <VillageWorld playerPosition={playerPosition} />
          <Player onMove={handlePlayerMove} gender={youGender} />
          <RemotePlayer data={partner ?? null} />
          <Sky sunPosition={[100, 20, 100]} turbidity={4} rayleigh={3} />
        </Suspense>
      </Canvas>
    </div>
  );
}

