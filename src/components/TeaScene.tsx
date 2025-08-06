import { Canvas } from "@react-three/fiber";
import { OrbitControls, Float } from "@react-three/drei";
import { Suspense, useMemo, useRef } from "react";
import * as THREE from "three";

function Candle({ position = [0, 0, 0] as [number, number, number] }) {
  const lightRef = useRef<THREE.PointLight>(null!);
  const flameRef = useRef<THREE.Mesh>(null!);

  return (
    <group position={position}>
      <mesh castShadow position={[0, 0.1, 0]}> 
        <cylinderGeometry args={[0.05, 0.05, 0.2, 16]} />
        <meshStandardMaterial color="#e6dccd" />
      </mesh>
      <mesh ref={flameRef} position={[0, 0.25, 0]}>
        <sphereGeometry args={[0.03, 16, 16]} />
        <meshBasicMaterial color="#ffcc66" />
      </mesh>
      <pointLight ref={lightRef} color={new THREE.Color(1, 0.85, 0.6)} intensity={1.2} distance={1.5} />
    </group>
  );
}

function Steam({ position = [0, 0, 0] as [number, number, number] }) {
  const group = useRef<THREE.Group>(null!);
  const particles = useMemo(() => {
    const temp: THREE.Vector3[] = [];
    for (let i = 0; i < 40; i++) temp.push(new THREE.Vector3((Math.random()-0.5)*0.08, Math.random()*0.15, (Math.random()-0.5)*0.08));
    return temp;
  }, []);
  return (
    <group ref={group} position={position}>
      {particles.map((p, i) => (
        <Float key={i} speed={1.5} rotationIntensity={0} floatIntensity={0.4}>
          <mesh position={[p.x, p.y, p.z] as [number, number, number]}>
            <sphereGeometry args={[0.01 + Math.random()*0.01, 8, 8]} />
            <meshStandardMaterial color="#ffffff" transparent opacity={0.35} />
          </mesh>
        </Float>
      ))}
    </group>
  );
}

function Petals() {
  const count = 80;
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = new THREE.Color("#ffc0cb");
  const positions = useMemo(() => Array.from({ length: count }, () => [ (Math.random()-0.5)*4, Math.random()*2 + 1, (Math.random()-0.5)*4 ] as [number, number, number]), [count]);

  // Simple downward motion via onBeforeRender
  const speeds = useMemo(() => positions.map(() => 0.003 + Math.random()*0.004), [positions]);

  return (
    <instancedMesh ref={meshRef} args={[undefined as any, undefined as any, count]}>
      <sphereGeometry args={[0.02, 6, 6]} />
      <meshStandardMaterial color={color} roughness={0.8} metalness={0} />
      <primitive
        object={new THREE.Object3D()}
        attach={"userData" as any}
      />
      {(() => {
        let frame = 0;
        return (
          <primitive
            object={new THREE.Object3D()}
            attachObject={["userData", "tick"]}
            onUpdate={() => {
              const m = meshRef.current;
              if (!m) return;
              frame++;
              positions.forEach((pos, i) => {
                const y = pos[1] - speeds[i];
                pos[1] = y < -0.2 ? 2 + Math.random()*1 : y;
                dummy.position.set(pos[0] + Math.sin((frame+i)*0.002)*0.01, pos[1], pos[2]);
                dummy.rotation.set(0, 0, (frame+i)*0.01);
                dummy.updateMatrix();
                m.setMatrixAt(i, dummy.matrix);
              });
              m.instanceMatrix.needsUpdate = true;
            }}
          />
        );
      })()}
    </instancedMesh>
  );
}

function Avatar({ 
  color = "#8ab4f8", 
  name = "", 
  position = [0, 0, 0] as [number, number, number],
  gender = 'male'
}) {
  const avatarColor = gender === 'male' ? "#8ab4f8" : "#f8a8c4";
  
  return (
    <group position={position}>
      <mesh castShadow>
        <capsuleGeometry args={[0.12, 0.35, 8, 16]} />
        <meshStandardMaterial color={avatarColor} />
      </mesh>
      {name && (
        <Float speed={1} floatIntensity={0.5}>
          <mesh position={[0, 0.5, 0]}>
            <planeGeometry args={[0.6, 0.2]} />
            <meshBasicMaterial color="#000000" transparent opacity={0.4} />
          </mesh>
          <group position={[0, 0.5, 0.01]}>
            {/* Text via HTML overlay for simplicity */}
          </group>
        </Float>
      )}
    </group>
  );
}

function TableSet() {
  return (
    <group>
      <mesh receiveShadow rotation={[-Math.PI/2, 0, 0]} position={[0, -0.001, 0]}>
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
      {/* Steam above cups */}
      <Steam position={[-0.25, 0.48, 0.15]} />
      <Steam position={[0.25, 0.48, -0.15]} />

      {/* Candles */}
      <Candle position={[-0.4, 0.45, -0.2]} />
      <Candle position={[0.4, 0.45, 0.2]} />
    </group>
  );
}

export default function TeaScene({ 
  you = "", 
  partner = "", 
  youGender = 'male',
  partnerGender = 'male'
}: { 
  you?: string; 
  partner?: string; 
  youGender?: 'male' | 'female';
  partnerGender?: 'male' | 'female';
}) {
  return (
    <div className="w-full h-full">
      <Canvas shadows camera={{ position: [0, 1.2, 2.4], fov: 50 }}>
        <ambientLight intensity={0.4} />
        <directionalLight position={[2, 3, 2]} intensity={0.8} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />

        <Suspense fallback={null}>
          <group>
            <TableSet />
            <Avatar name={you} gender={youGender} position={[-0.6, 0.46, 0]} />
            <Avatar name={partner} gender={partnerGender} position={[0.6, 0.46, 0]} />
            <Petals />
          </group>
        </Suspense>
        <OrbitControls enablePan={false} minDistance={1.6} maxDistance={3.2} target={[0, 0.5, 0]} />
      </Canvas>
    </div>
  );
}
