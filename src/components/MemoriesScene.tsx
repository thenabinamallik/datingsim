import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float, Html, Image, useTexture } from "@react-three/drei";
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
  const bounds = 19.2; // Confine player inside museum walls
  const { camera, gl } = useThree();
  const move = useMovement();
  const lastSent = useRef(0);
  const angleOffset = useRef(0);

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
      angleOffset.current -= deltaX * 0.01;
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

    if (vel.current.lengthSq() > 1e-6) {
      const angle = Math.atan2(vel.current.x, vel.current.z);
      ref.current.rotation.y = angle;
      angleOffset.current = THREE.MathUtils.lerp(angleOffset.current, 0, 0.1);
    }

    // Align camera angle in the direction the character is facing
    const characterAngle = ref.current.rotation.y;
    // Camera is positioned behind the player: characterAngle + Math.PI
    const cameraAngle = characterAngle + Math.PI + angleOffset.current;
    const distance = 3.2; // distance behind the character

    const desired = new THREE.Vector3(
      ref.current.position.x + Math.sin(cameraAngle) * distance,
      1.6,
      ref.current.position.z + Math.cos(cameraAngle) * distance
    );
    camera.position.lerp(desired, 0.1);
    camera.lookAt(
      ref.current.position.x,
      ref.current.position.y + 0.6,
      ref.current.position.z
    );

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
    // Spawn player slightly off center (at Z=3) to not clip inside the tea table
    <group ref={ref} position={[0, 0.35, 3] as [number, number, number]}>
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

/* ────────────────── Cozy Teatable Set (copied from TeaScene) ────────────────── */

function Steam({ position = [0, 0, 0] as [number, number, number] }) {
  const particles = useMemo(() => {
    const temp: THREE.Vector3[] = [];
    for (let i = 0; i < 25; i++)
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
            <meshStandardMaterial color="#ffffff" transparent opacity={0.25} />
          </mesh>
        </Float>
      ))}
    </group>
  );
}

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

function TableSet() {
  return (
    <group>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]}>
        <circleGeometry args={[2.5, 64]} />
        <meshStandardMaterial color="#2d1a0f" roughness={0.8} /> {/* Dark wood base */}
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

/* ────────────────── Cozy Benches ────────────────── */

function MuseumBench({ position = [0, 0, 0] as [number, number, number] }) {
  return (
    <group position={position}>
      {/* Bench seat */}
      <mesh castShadow position={[0, 0.4, 0]}>
        <boxGeometry args={[2.2, 0.12, 0.7]} />
        <meshStandardMaterial color="#5d4037" roughness={0.7} /> {/* Brown leather seat */}
      </mesh>
      {/* Bench cushion details */}
      <mesh position={[0, 0.46, 0]}>
        <boxGeometry args={[2.1, 0.05, 0.62]} />
        <meshStandardMaterial color="#3e2723" roughness={0.5} />
      </mesh>
      {/* Left leg */}
      <mesh castShadow position={[-1.0, 0.2, 0]}>
        <boxGeometry args={[0.1, 0.4, 0.6]} />
        <meshStandardMaterial color="#1f130e" />
      </mesh>
      {/* Right leg */}
      <mesh castShadow position={[1.0, 0.2, 0]}>
        <boxGeometry args={[0.1, 0.4, 0.6]} />
        <meshStandardMaterial color="#1f130e" />
      </mesh>
    </group>
  );
}

/* ────────────────── Gallery Frame component ────────────────── */

function FrameFallback() {
  return (
    <>
      <mesh castShadow position={[0, 0, -0.02]}>
        <boxGeometry args={[3.2, 1.9, 0.04]} />
        <meshStandardMaterial color="#2d1d0d" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0, -0.005]}>
        <boxGeometry args={[3.04, 1.74, 0.01]} />
        <meshStandardMaterial color="#d4af37" roughness={0.3} metalness={0.8} />
      </mesh>
      <mesh position={[0, 0, 0.01]}>
        <planeGeometry args={[3.0, 1.7]} />
        <meshStandardMaterial color="#1f1f2e" />
      </mesh>
    </>
  );
}

function GalleryFrameContent({
  url,
  title,
  isNear,
}: {
  url: string;
  title: string;
  isNear: boolean;
}) {
  const texture = useTexture(url);
  
  // Calculate aspect ratio dynamically
  const aspect = useMemo(() => {
    if (texture && texture.image) {
      return texture.image.width / texture.image.height;
    }
    return 16 / 9; // fallback
  }, [texture]);

  // We want to fit the image inside a max box of width 3.0 and height 1.7
  const [width, height] = useMemo(() => {
    const maxWidth = 3.0;
    const maxHeight = 1.7;
    
    // Fit maintaining aspect ratio
    let w = maxWidth;
    let h = maxWidth / aspect;
    
    if (h > maxHeight) {
      h = maxHeight;
      w = maxHeight * aspect;
    }
    
    return [w, h];
  }, [aspect]);

  // Adjust frame size to be slightly larger than the image
  const frameWidth = width + 0.2;
  const frameHeight = height + 0.2;
  const goldWidth = width + 0.04;
  const goldHeight = height + 0.04;

  return (
    <>
      {/* Wooden backplate frame */}
      <mesh castShadow position={[0, 0, -0.02]}>
        <boxGeometry args={[frameWidth, frameHeight, 0.04]} />
        <meshStandardMaterial color="#2d1d0d" roughness={0.8} /> {/* Oak wood */}
      </mesh>

      {/* Gold inner border */}
      <mesh position={[0, 0, -0.005]}>
        <boxGeometry args={[goldWidth, goldHeight, 0.01]} />
        <meshStandardMaterial color="#d4af37" roughness={0.3} metalness={0.8} /> {/* Golden trim */}
      </mesh>

      {/* The Image Screen */}
      <mesh position={[0, 0, 0.01]}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial map={texture} transparent />
      </mesh>

      {/* Spotlights mounted on the wall above pointing at the painting */}
      <group position={[0, height / 2 + 0.4, 0.7]}>
        {isNear && (
          <spotLight
            color="#fff6e0"
            intensity={3.5}
            distance={6}
            angle={Math.PI / 5}
            penumbra={0.6}
          />
        )}
        {/* Spotlight hardware fixture */}
        <mesh rotation={[-Math.PI / 5, 0, 0]}>
          <cylinderGeometry args={[0.05, 0.07, 0.18, 12]} />
          <meshStandardMaterial color="#222" />
        </mesh>
        {/* Supporting bracket rod back to wall */}
        <mesh position={[0, 0.05, -0.38]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.01, 0.01, 0.75, 8]} />
          <meshStandardMaterial color="#333" />
        </mesh>
      </group>

      {/* Paper/Brass plaque underneath */}
      <Html
        position={[0, -height / 2 - 0.35, 0.05]}
        center
        distanceFactor={4}
        transform
        style={{ pointerEvents: "none" }}
      >
        <div
          style={{
            background: "rgba(253, 252, 250, 0.95)",
            border: "1px solid #d4af37",
            borderTop: "3px solid #d4af37",
            color: "#2c2520",
            padding: "4px 12px",
            borderRadius: "2px",
            fontSize: "10px",
            fontFamily: "'Georgia', serif",
            fontWeight: "bold",
            textAlign: "center",
            whiteSpace: "nowrap",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          }}
        >
          {title}
        </div>
      </Html>
    </>
  );
}

function GalleryFrame({
  position = [0, 0, 0] as [number, number, number],
  rotation = [0, 0, 0] as [number, number, number],
  url = "",
  title = "",
  playerPosition,
}: {
  position?: [number, number, number];
  rotation?: [number, number, number];
  url: string;
  title: string;
  playerPosition?: [number, number, number];
}) {
  const isNear = useMemo(() => {
    if (!playerPosition) return false;
    const dx = position[0] - playerPosition[0];
    const dz = position[2] - playerPosition[2];
    return dx * dx + dz * dz < 144; // Active when player is within 12 units
  }, [position, playerPosition]);

  return (
    <group position={position} rotation={rotation}>
      <Suspense fallback={<FrameFallback />}>
        <GalleryFrameContent url={url} title={title} isNear={isNear} />
      </Suspense>
    </group>
  );
}

/* ────────────────── Memories World ────────────────── */

const seededRandom = (seed: number) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

/* ─── Add new images here to expand the memories automatically ─── */
const INITIAL_MEMORIES = [
  { url: "/memories/01.jpg", title: "First Glance 🌸" },
  { url: "/memories/02.jpg", title: "Whispered Secret 💞" },
  { url: "/memories/03.jpg", title: "Under the Stars ✨" },
  { url: "/memories/04.jpg", title: "Rainy Day Sanctuary ☔" },
  { url: "/memories/05.jpg", title: "Warm Coffee Date ☕" },
  { url: "/memories/06.jpg", title: "Autumn Walk 🍂" },
  { url: "/memories/07.jpg", title: "Shared Smile 😊" },
  { url: "/memories/08.jpg", title: "Golden Sunset 🌅" },
  { url: "/memories/09.jpg", title: "Late Night Talks 💬" },
  { url: "/memories/10.jpg", title: "Spring Blossom 🌸" },
  { url: "/memories/11.jpg", title: "Holding Hands 🤝" },
  { url: "/memories/12.jpg", title: "Cozy Fireplace 🔥" },
  { url: "/memories/13.jpg", title: "Our Secret Spot 🌲" },
  { url: "/memories/14.jpg", title: "Summer Breeze 🍃" },
  { url: "/memories/15.jpg", title: "Deep Reflection 💭" },
  { url: "/memories/16.jpg", title: "Joyful Laughter 😂" },
  { url: "/memories/17.jpg", title: "Endless Horizon 🌌" },
  { url: "/memories/18.jpg", title: "A Quiet Moment 🤫" },
  { url: "/memories/19.jpg", title: "Together Forever ❤️" },
  { url: "/memories/20.jpg", title: "Sweet Sanctuary 🏰" }
];

function MemoriesWorld({ playerPosition }: { playerPosition?: [number, number, number] }) {
  // We place 20 frames symmetrically along 4 walls of a 40x40 exhibition gallery
  const hoardings = useMemo(() => {
    const list: { position: [number, number, number]; rotation: [number, number, number]; url: string; title: string }[] = [];
    
    // Horizontal or vertical spacing positions for 5 paintings per wall
    const wallCoordinates = [-12, -6, 0, 6, 12];
    
    for (let i = 0; i < 20; i++) {
      const baseImg = INITIAL_MEMORIES[i % INITIAL_MEMORIES.length];
      const title = baseImg.title;
      
      let position: [number, number, number] = [0, 1.8, 0];
      let rotation: [number, number, number] = [0, 0, 0];
      
      const wallIndex = Math.floor(i / 5); // 0 = North, 1 = South, 2 = West, 3 = East
      const slotIndex = i % 5;
      const coordinate = wallCoordinates[slotIndex];

      if (wallIndex === 0) {
        // North Wall (placed at Z = -19.65 facing South)
        position = [coordinate, 1.8, -19.65];
        rotation = [0, 0, 0];
      } else if (wallIndex === 1) {
        // South Wall (placed at Z = 19.65 facing North)
        position = [coordinate, 1.8, 19.65];
        rotation = [0, Math.PI, 0];
      } else if (wallIndex === 2) {
        // West Wall (placed at X = -19.65 facing East)
        position = [-19.65, 1.8, coordinate];
        rotation = [0, Math.PI / 2, 0];
      } else {
        // East Wall (placed at X = 19.65 facing West)
        position = [19.65, 1.8, coordinate];
        rotation = [0, -Math.PI / 2, 0];
      }

      list.push({
        position,
        rotation,
        url: baseImg.url,
        title: title
      });
    }

    return list;
  }, []);

  return (
    <group>
      {/* Polished Wooden Parquet Floor */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[42, 42]} />
        <meshStandardMaterial color="#4e342e" roughness={0.4} metalness={0.1} />
      </mesh>

      {/* Decorative center red velvet carpet under the tea table */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
        <planeGeometry args={[7, 7]} />
        <meshStandardMaterial color="#880e4f" roughness={0.75} />
      </mesh>

      {/* Gallery Walls */}
      {/* North Wall */}
      <mesh position={[0, 3, -20]} receiveShadow castShadow>
        <boxGeometry args={[40, 6, 0.5]} />
        <meshStandardMaterial color="#eceff1" roughness={0.8} />
      </mesh>
      {/* South Wall */}
      <mesh position={[0, 3, 20]} receiveShadow castShadow>
        <boxGeometry args={[40, 6, 0.5]} />
        <meshStandardMaterial color="#eceff1" roughness={0.8} />
      </mesh>
      {/* West Wall */}
      <mesh position={[-20, 3, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow castShadow>
        <boxGeometry args={[40, 6, 0.5]} />
        <meshStandardMaterial color="#eceff1" roughness={0.8} />
      </mesh>
      {/* East Wall */}
      <mesh position={[20, 3, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow castShadow>
        <boxGeometry args={[40, 6, 0.5]} />
        <meshStandardMaterial color="#eceff1" roughness={0.8} />
      </mesh>

      {/* Dark Museum Ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 5, 0]}>
        <planeGeometry args={[42, 42]} />
        <meshStandardMaterial color="#1a1a1c" roughness={0.9} />
      </mesh>

      {/* Render 20 wall mounted paintings */}
      {hoardings.map((h, i) => (
        <GalleryFrame key={i} position={h.position} rotation={h.rotation} url={h.url} title={h.title} playerPosition={playerPosition} />
      ))}

      {/* TableSet in the center of the museum */}
      <TableSet />

      {/* Viewing seats/benches around the gallery */}
      <MuseumBench position={[0, 0, -5]} />
      <MuseumBench position={[0, 0, 5]} />
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

export default function MemoriesScene({
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
  const [playerPosition, setPlayerPosition] = useState([0, 0, 3]);

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
      <Canvas shadows camera={{ position: [0, 1.6, 3.8], fov: 60 }}>
        {/* Light warm gallery background */}
        <color attach="background" args={["#f4f1ea"]} />

        {/* Good ambient light to keep everything visible */}
        <ambientLight intensity={0.7} color="#ffffff" />
        
        {/* Main overhead daylight to illuminate the hall and cast shadows */}
        <directionalLight
          position={[6, 12, 6]}
          intensity={0.8}
          color="#fffaf0"
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />

        {/* Secondary point lights to add museum ceiling glow */}
        <pointLight position={[0, 4.2, 0]} intensity={1.2} color="#fff6e0" distance={25} />

        <Suspense fallback={null}>
          <MemoriesWorld playerPosition={playerPosition as [number, number, number]} />
          <Player
            onMove={handlePlayerMove}
            gender={youGender}
            name={youName}
            message={youMessage}
          />
          <RemotePlayer data={partner ?? null} />
        </Suspense>
      </Canvas>
    </div>
  );
}
