import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";

interface Preview3DProps {
  commands: string[];
  maxPoints?: number;
}

function parseCommands(commands: string[], maxPoints: number): Float32Array {
  const step = Math.max(1, Math.floor(commands.length / maxPoints));
  const points: number[] = [];
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;

  const sampled: [number, number, number][] = [];
  for (let i = 0; i < commands.length; i += step) {
    const parts = commands[i].split(" ");
    const x = parseInt(parts[3]);
    const y = parseInt(parts[4]);
    const z = parseInt(parts[5]);
    if (isNaN(x) || isNaN(y) || isNaN(z)) continue;
    sampled.push([x, y, z]);
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
  }

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const cz = (minZ + maxZ) / 2;
  const scale = Math.max(maxX - minX, maxY - minY, maxZ - minZ) || 1;
  const norm = 10 / scale;

  for (const [x, y, z] of sampled) {
    points.push((x - cx) * norm, (z - cz) * norm, -(y - cy) * norm);
  }

  return new Float32Array(points);
}

function PointCloud({ commands, maxPoints }: { commands: string[]; maxPoints: number }) {
  const ref = useRef<THREE.Points>(null);
  
  const positions = useMemo(() => parseCommands(commands, maxPoints), [commands, maxPoints]);
  
  const colors = useMemo(() => {
    const c = new Float32Array(positions.length);
    for (let i = 0; i < positions.length; i += 3) {
      const y = positions[i + 1];
      const t = (y + 5) / 10;
      // Green to cyan gradient based on height
      c[i] = 0.1 + t * 0.2;
      c[i + 1] = 0.7 + t * 0.3;
      c[i + 2] = 0.3 + t * 0.5;
    }
    return c;
  }, [positions]);

  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.08;
    }
  });

  if (positions.length === 0) return null;

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.08}
        vertexColors
        transparent
        opacity={0.85}
        sizeAttenuation
      />
    </points>
  );
}

function GridFloor() {
  return (
    <gridHelper args={[20, 20, "#1a3a2a", "#0d1f15"]} position={[0, -5, 0]} />
  );
}

export default function Preview3D({ commands, maxPoints = 5000 }: Preview3DProps) {
  if (commands.length === 0) {
    return (
      <div className="w-full h-64 rounded-lg bg-secondary/30 border border-border flex items-center justify-center">
        <p className="text-xs text-muted-foreground font-display">No structure to preview</p>
      </div>
    );
  }

  return (
    <div className="w-full h-72 rounded-lg overflow-hidden border border-border bg-[hsl(220,25%,5%)] relative">
      <div className="absolute top-2 left-2 z-10 bg-background/80 backdrop-blur-sm rounded px-2 py-1 border border-border">
        <span className="text-[10px] text-primary font-display tracking-wider">3D PREVIEW</span>
        <span className="text-[10px] text-muted-foreground ml-2">
          {Math.min(commands.length, maxPoints).toLocaleString()} pts
        </span>
      </div>
      <div className="absolute bottom-2 right-2 z-10 bg-background/80 backdrop-blur-sm rounded px-2 py-1 border border-border">
        <span className="text-[9px] text-muted-foreground">Drag to rotate · Scroll to zoom</span>
      </div>
      <Canvas>
        <PerspectiveCamera makeDefault position={[12, 8, 12]} fov={50} />
        <ambientLight intensity={0.3} />
        <pointLight position={[10, 10, 10]} intensity={0.5} color="#22c55e" />
        <PointCloud commands={commands} maxPoints={maxPoints} />
        <GridFloor />
        <OrbitControls
          enableDamping
          dampingFactor={0.1}
          minDistance={3}
          maxDistance={30}
          autoRotate={false}
        />
      </Canvas>
    </div>
  );
}
