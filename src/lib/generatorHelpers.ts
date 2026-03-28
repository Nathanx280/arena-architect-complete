/**
 * ARK Coordinate System:
 * X = horizontal (left/right)
 * Y = horizontal (forward/back)
 * Z = vertical (height / up-down)
 *
 * Ground plane = X + Y
 * Height axis = Z
 */

export const MAX_COMMANDS = 50000;
export const WARN_THRESHOLD = 30000;
export const ARK_PASTE_SAFE = 10000;

// --- Command generation ---
export function cmd(bp: string, x: number, y: number, z: number): string {
  return `admincheat spawnactor ${bp} ${Math.round(x)} ${Math.round(y)} ${Math.round(z)}|`;
}

// --- Deduplication by XYZ key ---
export function dedupeCommands(cmds: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const c of cmds) {
    if (!seen.has(c)) {
      seen.add(c);
      result.push(c);
    }
  }
  return result;
}

// --- Seeded PRNG ---
export function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

// --- Circle/Ring sampling on XY plane ---
export function sampleCircle(
  cx: number, cy: number, radius: number, step: number,
  callback: (x: number, y: number, angle: number) => void
) {
  const angStep = Math.max(step / radius, 0.01);
  for (let angle = 0; angle < Math.PI * 2; angle += angStep) {
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    callback(x, y, angle);
  }
}

// --- Filled circle on XY plane ---
export function fillCircle(
  cx: number, cy: number, radius: number, step: number,
  callback: (x: number, y: number) => void
) {
  for (let x = cx - radius; x <= cx + radius; x += step) {
    for (let y = cy - radius; y <= cy + radius; y += step) {
      if ((x - cx) ** 2 + (y - cy) ** 2 <= radius * radius) {
        callback(x, y);
      }
    }
  }
}

// --- Ring (annulus) on XY plane ---
export function fillRing(
  cx: number, cy: number, innerR: number, outerR: number, step: number,
  callback: (x: number, y: number) => void
) {
  for (let x = cx - outerR; x <= cx + outerR; x += step) {
    for (let y = cy - outerR; y <= cy + outerR; y += step) {
      const d2 = (x - cx) ** 2 + (y - cy) ** 2;
      if (d2 <= outerR * outerR && d2 >= innerR * innerR) {
        callback(x, y);
      }
    }
  }
}

// --- Centered rectangular footprint ---
export function centeredRect(
  cx: number, cy: number, halfW: number, halfD: number, step: number,
  callback: (x: number, y: number) => void
) {
  for (let x = cx - halfW; x <= cx + halfW; x += step) {
    for (let y = cy - halfD; y <= cy + halfD; y += step) {
      callback(x, y);
    }
  }
}

// --- Rectangular edges (walls) ---
export function rectEdges(
  cx: number, cy: number, halfW: number, halfD: number, step: number,
  callback: (x: number, y: number) => void
) {
  for (let x = cx - halfW; x <= cx + halfW; x += step) {
    callback(x, cy - halfD);
    callback(x, cy + halfD);
  }
  for (let y = cy - halfD + step; y < cy + halfD; y += step) {
    callback(cx - halfW, y);
    callback(cx + halfW, y);
  }
}

// --- Vertical extrusion ---
export function extrudeZ(
  baseZ: number, height: number, step: number,
  callback: (z: number) => void
) {
  for (let z = baseZ; z <= baseZ + height; z += step) {
    callback(z);
  }
}

// --- Wall generation (circle wall going up Z) ---
export function circleWall(
  cx: number, cy: number, radius: number, baseZ: number,
  height: number, step: number, bp: string, cmds: string[]
) {
  sampleCircle(cx, cy, radius, step, (x, y) => {
    extrudeZ(baseZ, height, step, (z) => {
      cmds.push(cmd(bp, x, y, z));
    });
  });
}

// --- Floor fill (circle) ---
export function circleFloor(
  cx: number, cy: number, radius: number, z: number,
  step: number, bp: string, cmds: string[]
) {
  fillCircle(cx, cy, radius, step, (x, y) => {
    cmds.push(cmd(bp, x, y, z));
  });
}

// --- Staircase generators ---
export function spiralStairs(
  cx: number, cy: number, baseZ: number, height: number,
  radius: number, turns: number, stairWidth: number,
  step: number, bp: string, cmds: string[]
) {
  const totalSteps = turns * 40;
  for (let i = 0; i <= totalSteps; i++) {
    const t = i / totalSteps;
    const angle = t * turns * Math.PI * 2;
    const z = baseZ + t * height;
    for (let w = 0; w <= stairWidth; w += step) {
      const px = cx + Math.cos(angle) * (radius - w);
      const py = cy + Math.sin(angle) * (radius - w);
      cmds.push(cmd(bp, px, py, z));
    }
  }
}

// --- Ramp ---
export function rampSegment(
  startX: number, startY: number, startZ: number,
  endX: number, endY: number, endZ: number,
  width: number, step: number, bp: string, cmds: string[]
) {
  const dist = Math.sqrt((endX - startX) ** 2 + (endY - startY) ** 2);
  const steps = Math.max(Math.floor(dist / step), 1);
  const perpX = -(endY - startY) / dist;
  const perpY = (endX - startX) / dist;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = startX + (endX - startX) * t;
    const y = startY + (endY - startY) * t;
    const z = startZ + (endZ - startZ) * t;
    for (let w = -width; w <= width; w += step) {
      cmds.push(cmd(bp, x + perpX * w, y + perpY * w, z));
    }
  }
}

// --- Platform (filled rectangle at a Z height) ---
export function rectPlatform(
  cx: number, cy: number, halfW: number, halfD: number,
  z: number, step: number, bp: string, cmds: string[]
) {
  centeredRect(cx, cy, halfW, halfD, step, (x, y) => {
    cmds.push(cmd(bp, x, y, z));
  });
}

// --- Shell check ---
export function shell(dist2: number, outerR2: number, innerR2: number): boolean {
  return dist2 <= outerR2 && dist2 >= innerR2;
}

// --- Footprint calculation ---
export interface Footprint {
  width: number;
  depth: number;
  height: number;
  totalCommands: number;
  planeAxes: string;
  heightAxis: string;
  centerPoint: string;
}

export function computeFootprint(cmds: string[], cx: number, cy: number, cz: number): Footprint {
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;
  for (const c of cmds) {
    const parts = c.split(' ');
    const x = parseInt(parts[3]);
    const y = parseInt(parts[4]);
    const z = parseInt(parts[5]);
    if (!isNaN(x)) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); }
    if (!isNaN(y)) { minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
    if (!isNaN(z)) { minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z); }
  }
  return {
    width: cmds.length > 0 ? maxX - minX : 0,
    depth: cmds.length > 0 ? maxY - minY : 0,
    height: cmds.length > 0 ? maxZ - minZ : 0,
    totalCommands: cmds.length,
    planeAxes: "X + Y",
    heightAxis: "Z",
    centerPoint: `${Math.round(cx)}, ${Math.round(cy)}, ${Math.round(cz)}`,
  };
}
