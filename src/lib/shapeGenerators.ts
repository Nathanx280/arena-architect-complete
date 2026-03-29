/**
 * ARK Coordinate System:
 * X = horizontal (left/right)
 * Y = horizontal (forward/back)
 * Z = vertical (height / up-down)
 *
 * Ground plane = X + Y
 * Height axis = Z
 */

import {
  MAX_COMMANDS, cmd, dedupeCommands, seededRandom, shell,
  sampleCircle, fillCircle, fillRing, centeredRect, rectEdges,
  extrudeZ, circleWall, circleFloor, spiralStairs, rectPlatform,
  rampSegment,
} from "./generatorHelpers";

export type ShapeCategory = "shapes" | "arenas" | "events";

export interface ShapeConfig {
  name: string;
  description: string;
  icon: string;
  category: ShapeCategory;
  centerX: number;
  centerY: number;
  centerZ: number;
  radius: number;
  step: number;
  seed?: number;
  // Extended options
  wallHeight?: number;
  wallThickness?: number;
  difficulty?: "small" | "medium" | "large" | "brutal";
  hasFloor?: boolean;
  hasRoof?: boolean;
  hasBorder?: boolean;
  hasCornerTowers?: boolean;
  hasSolutionPath?: boolean;
  symmetry?: boolean;
  deadEndDensity?: number;
  pathStyle?: "linear" | "zigzag" | "circular" | "serpentine";
  obstacleDensity?: number;
  hasSpectatorPlatforms?: boolean;
  hasRailings?: boolean;
  traversalStyle?: "spiral" | "outer" | "ramp" | "jumpgap";
  floorCount?: number;
  hasCentralPillar?: boolean;
  hasTopPlatform?: boolean;
  hasInnerFloor?: boolean;
  hasBridges?: boolean;
  hasSupportPillars?: boolean;
  gateCount?: number;
  hasVIPPlatform?: boolean;
  roofStyle?: "open" | "closed";
  hasDoors?: boolean;
  hasCornerPosts?: boolean;
  hasCenterMarker?: boolean;
  cageShape?: "square" | "rectangular";
  cagePreset?: "small" | "medium" | "giant";
}

// ============================================================
// SHAPE PRESETS
// ============================================================

const DIFFICULTY_SIZES = { small: 8, medium: 14, large: 22, brutal: 32 };

export const SHAPE_PRESETS: ShapeConfig[] = [
  // --- Shapes ---
  { name: "Sphere", description: "Hollow floating sphere", icon: "⬤", category: "shapes", centerX: 5000, centerY: 5000, centerZ: 3000, radius: 2000, step: 400 },
  { name: "Cube", description: "Hollow floating cube", icon: "⬜", category: "shapes", centerX: 5000, centerY: 5000, centerZ: 3000, radius: 2000, step: 400 },
  { name: "Pac-Man", description: "Pac-Man head with open mouth", icon: "🟡", category: "shapes", centerX: 5000, centerY: 5000, centerZ: 3000, radius: 2000, step: 400 },
  { name: "Pyramid", description: "4-sided pyramid rising on Z", icon: "🔺", category: "shapes", centerX: 5000, centerY: 5000, centerZ: 500, radius: 3000, step: 400 },
  { name: "Torus", description: "Floating donut ring on XY", icon: "🍩", category: "shapes", centerX: 5000, centerY: 5000, centerZ: 3000, radius: 2000, step: 350 },
  { name: "Diamond", description: "Double pyramid diamond", icon: "💎", category: "shapes", centerX: 5000, centerY: 5000, centerZ: 3000, radius: 2000, step: 400 },
  { name: "Helix", description: "Spiral DNA helix tower", icon: "🧬", category: "shapes", centerX: 5000, centerY: 5000, centerZ: 0, radius: 1500, step: 300 },
  { name: "Star", description: "5-pointed star shape", icon: "⭐", category: "shapes", centerX: 5000, centerY: 5000, centerZ: 3000, radius: 2500, step: 400 },
  { name: "Cylinder", description: "Hollow vertical cylinder", icon: "🛢️", category: "shapes", centerX: 5000, centerY: 5000, centerZ: 0, radius: 1500, step: 400 },
  { name: "Hemisphere", description: "Half sphere dome", icon: "🌐", category: "shapes", centerX: 5000, centerY: 5000, centerZ: 0, radius: 2000, step: 400 },
  { name: "Arch", description: "Standing arch gateway", icon: "🚪", category: "shapes", centerX: 5000, centerY: 5000, centerZ: 0, radius: 2000, step: 350 },
  { name: "Tunnel", description: "Long semicircle tunnel", icon: "🕳️", category: "shapes", centerX: 5000, centerY: 5000, centerZ: 0, radius: 1500, step: 350 },
  { name: "Hex Platform", description: "Flat hexagonal platform", icon: "⬡", category: "shapes", centerX: 5000, centerY: 5000, centerZ: 500, radius: 2000, step: 350 },
  { name: "Cone", description: "Solid cone rising on Z", icon: "🔼", category: "shapes", centerX: 5000, centerY: 5000, centerZ: 0, radius: 2000, step: 400 },
  { name: "Cross", description: "3D cross / plus shape", icon: "✚", category: "shapes", centerX: 5000, centerY: 5000, centerZ: 3000, radius: 2000, step: 400 },
  { name: "Spiral Ramp", description: "Drivable spiral ramp", icon: "🌀", category: "shapes", centerX: 5000, centerY: 5000, centerZ: 0, radius: 2000, step: 350 },
  { name: "Obelisk", description: "Tapered obelisk monument", icon: "🗿", category: "shapes", centerX: 5000, centerY: 5000, centerZ: 0, radius: 1000, step: 300 },

  // --- Arenas ---
  { name: "Colosseum", description: "Stepped bowl arena with gates", icon: "🏟️", category: "arenas", centerX: 5000, centerY: 5000, centerZ: 0, radius: 3000, step: 400, gateCount: 4 },
  { name: "Sky Ring", description: "Floating ring arena at height", icon: "💫", category: "arenas", centerX: 5000, centerY: 5000, centerZ: 5000, radius: 2500, step: 350, hasInnerFloor: false, hasBridges: false, hasSupportPillars: false },
  { name: "Tower Arena", description: "Multi-floor cylindrical tower", icon: "🗼", category: "arenas", centerX: 5000, centerY: 5000, centerZ: 0, radius: 1500, step: 400, traversalStyle: "spiral", floorCount: 5, hasCentralPillar: true, hasTopPlatform: true },
  { name: "Cage Match", description: "Enclosed fighting cage", icon: "🔲", category: "arenas", centerX: 5000, centerY: 5000, centerZ: 500, radius: 2000, step: 300, roofStyle: "closed", hasDoors: true, hasCornerPosts: true, hasCenterMarker: true, cageShape: "square", cagePreset: "medium" },
  { name: "Dome Arena", description: "Hemispherical dome enclosure", icon: "🔮", category: "arenas", centerX: 5000, centerY: 5000, centerZ: 0, radius: 2500, step: 400 },
  { name: "Octagon Arena", description: "UFC-style octagon ring", icon: "🛑", category: "arenas", centerX: 5000, centerY: 5000, centerZ: 0, radius: 2000, step: 350 },
  { name: "Pit Arena", description: "Sunken fighting pit", icon: "⬇️", category: "arenas", centerX: 5000, centerY: 5000, centerZ: 0, radius: 2000, step: 400 },
  { name: "Bridge Arena", description: "Two platforms with a bridge", icon: "🌉", category: "arenas", centerX: 5000, centerY: 5000, centerZ: 2000, radius: 3000, step: 400 },
  { name: "King of the Hill", description: "Elevated central platform", icon: "👑", category: "arenas", centerX: 5000, centerY: 5000, centerZ: 0, radius: 2500, step: 400 },
  { name: "Four-Corner Arena", description: "4 platforms with central ring", icon: "🎯", category: "arenas", centerX: 5000, centerY: 5000, centerZ: 0, radius: 3000, step: 400 },
  { name: "Fortress", description: "Walled fortress compound", icon: "🏰", category: "arenas", centerX: 5000, centerY: 5000, centerZ: 0, radius: 3000, step: 400 },
  { name: "Amphitheater", description: "Half-circle tiered theater", icon: "🎭", category: "arenas", centerX: 5000, centerY: 5000, centerZ: 0, radius: 2500, step: 400 },
  { name: "Watchtower Ring", description: "Ring of watchtowers", icon: "🔭", category: "arenas", centerX: 5000, centerY: 5000, centerZ: 0, radius: 3000, step: 350 },

  // --- Events ---
  { name: "Maze", description: "Centered labyrinth with entrance/exit", icon: "🌀", category: "events", centerX: 5000, centerY: 5000, centerZ: 0, radius: 5000, step: 300, difficulty: "medium", hasFloor: true, hasBorder: true },
  { name: "Obstacle Course", description: "Multi-segment challenge course", icon: "🏃", category: "events", centerX: 5000, centerY: 5000, centerZ: 500, radius: 8000, step: 400, pathStyle: "zigzag", obstacleDensity: 0.7 },
  { name: "Spiral Staircase", description: "Giant spiraling ramp", icon: "🌪️", category: "events", centerX: 5000, centerY: 5000, centerZ: 0, radius: 2000, step: 300 },
  { name: "Skull", description: "Giant floating skull", icon: "💀", category: "events", centerX: 5000, centerY: 5000, centerZ: 3000, radius: 2000, step: 350 },
  { name: "Race Track", description: "Oval racing circuit", icon: "🏎️", category: "events", centerX: 5000, centerY: 5000, centerZ: 0, radius: 3000, step: 350 },
  { name: "Parkour Tower", description: "Ascending platform challenge", icon: "🧗", category: "events", centerX: 5000, centerY: 5000, centerZ: 0, radius: 1500, step: 350 },
  { name: "Dropper Tower", description: "Fall through gaps to survive", icon: "💧", category: "events", centerX: 5000, centerY: 5000, centerZ: 0, radius: 1500, step: 400 },
  { name: "Spleef Grid", description: "Breakable floor arena", icon: "🟫", category: "events", centerX: 5000, centerY: 5000, centerZ: 2000, radius: 2000, step: 350 },
  { name: "Capture Point Arena", description: "3-point control map", icon: "🚩", category: "events", centerX: 5000, centerY: 5000, centerZ: 0, radius: 3000, step: 400 },
  { name: "Boss Summon Platform", description: "Ritual summoning platform", icon: "🐉", category: "events", centerX: 5000, centerY: 5000, centerZ: 0, radius: 2000, step: 350 },
  { name: "Last Man Standing", description: "Shrinking circle arena", icon: "⭕", category: "events", centerX: 5000, centerY: 5000, centerZ: 0, radius: 3000, step: 400 },
  { name: "Gauntlet", description: "Linear gauntlet challenge run", icon: "🗡️", category: "events", centerX: 5000, centerY: 5000, centerZ: 0, radius: 4000, step: 400 },
  { name: "Lava Run", description: "Floating platforms over void", icon: "🌋", category: "events", centerX: 5000, centerY: 5000, centerZ: 3000, radius: 3000, step: 350 },
];

// ============================================================
// SHAPE GENERATORS
// ============================================================

function generateSphere(cfg: ShapeConfig, bp: string): string[] {
  const { centerX: cx, centerY: cy, centerZ: cz, radius: r, step } = cfg;
  const cmds: string[] = [];
  const r2 = r * r;
  const ir = r - step * 1.5;
  const ir2 = ir * ir;
  for (let x = cx - r; x <= cx + r; x += step)
    for (let y = cy - r; y <= cy + r; y += step)
      for (let z = cz - r; z <= cz + r; z += step) {
        const d2 = (x - cx) ** 2 + (y - cy) ** 2 + (z - cz) ** 2;
        if (shell(d2, r2, ir2)) cmds.push(cmd(bp, x, y, z));
      }
  return cmds;
}

function generateCube(cfg: ShapeConfig, bp: string): string[] {
  const { centerX: cx, centerY: cy, centerZ: cz, radius: h, step } = cfg;
  const cmds: string[] = [];
  for (let x = cx - h; x <= cx + h; x += step)
    for (let y = cy - h; y <= cy + h; y += step)
      for (let z = cz - h; z <= cz + h; z += step) {
        if (Math.abs(x - cx) >= h - step / 2 || Math.abs(y - cy) >= h - step / 2 || Math.abs(z - cz) >= h - step / 2)
          cmds.push(cmd(bp, x, y, z));
      }
  return cmds;
}

function generatePacMan(cfg: ShapeConfig, bp: string): string[] {
  const { centerX: cx, centerY: cy, centerZ: cz, radius: r, step } = cfg;
  const cmds: string[] = [];
  const r2 = r * r, ir = r - step * 1.5, ir2 = ir * ir;
  const mouthAngle = Math.PI / 6;
  for (let x = cx - r; x <= cx + r; x += step)
    for (let y = cy - r; y <= cy + r; y += step)
      for (let z = cz - r; z <= cz + r; z += step) {
        const dx = x - cx, dy = y - cy, dz = z - cz;
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 > r2) continue;
        const angle = Math.atan2(Math.abs(dz), dx);
        if (dx > 0 && angle < mouthAngle && angle >= 0) continue;
        if (shell(d2, r2, ir2)) cmds.push(cmd(bp, x, y, z));
      }
  const ex = cx + r * 0.3, ey = cy, ez = cz + r * 0.45, er = step * 1.2;
  for (let x = ex - er; x <= ex + er; x += step)
    for (let y = ey - er; y <= ey + er; y += step)
      for (let z = ez - er; z <= ez + er; z += step)
        if ((x - ex) ** 2 + (y - ey) ** 2 + (z - ez) ** 2 <= er * er)
          cmds.push(cmd(bp, x, y, z));
  return cmds;
}

function generatePyramid(cfg: ShapeConfig, bp: string): string[] {
  const { centerX: cx, centerY: cy, centerZ: cz, radius: r, step } = cfg;
  const cmds: string[] = [];
  const height = r * 1.5;
  for (let z = cz; z <= cz + height; z += step) {
    const t = (z - cz) / height;
    const halfW = r * (1 - t);
    for (let x = cx - halfW; x <= cx + halfW; x += step)
      for (let y = cy - halfW; y <= cy + halfW; y += step) {
        const onEdgeX = Math.abs(Math.abs(x - cx) - halfW) < step;
        const onEdgeY = Math.abs(Math.abs(y - cy) - halfW) < step;
        const isBase = Math.abs(z - cz) < step / 2;
        const isTop = halfW < step;
        if (onEdgeX || onEdgeY || isBase || isTop)
          cmds.push(cmd(bp, x, y, z));
      }
  }
  return cmds;
}

function generateTorus(cfg: ShapeConfig, bp: string): string[] {
  const { centerX: cx, centerY: cy, centerZ: cz, radius: R, step } = cfg;
  const cmds: string[] = [];
  const tubeR = R * 0.35;
  const extent = R + tubeR;
  for (let x = cx - extent; x <= cx + extent; x += step)
    for (let y = cy - extent; y <= cy + extent; y += step)
      for (let z = cz - tubeR; z <= cz + tubeR; z += step) {
        const dx = x - cx, dy = y - cy;
        const distCenter = Math.sqrt(dx * dx + dy * dy);
        const d2 = (distCenter - R) ** 2 + (z - cz) ** 2;
        if (d2 <= tubeR * tubeR && d2 >= (tubeR - step * 1.3) ** 2)
          cmds.push(cmd(bp, x, y, z));
      }
  return cmds;
}

function generateDiamond(cfg: ShapeConfig, bp: string): string[] {
  const { centerX: cx, centerY: cy, centerZ: cz, radius: r, step } = cfg;
  const cmds: string[] = [];
  for (let z = cz - r; z <= cz + r; z += step) {
    const t = 1 - Math.abs(z - cz) / r;
    const halfW = r * t;
    for (let x = cx - halfW; x <= cx + halfW; x += step)
      for (let y = cy - halfW; y <= cy + halfW; y += step) {
        const onEdge = Math.abs(Math.abs(x - cx) - halfW) < step || Math.abs(Math.abs(y - cy) - halfW) < step;
        const isTip = halfW < step;
        if (onEdge || isTip) cmds.push(cmd(bp, x, y, z));
      }
  }
  return cmds;
}

function generateHelix(cfg: ShapeConfig, bp: string): string[] {
  const { centerX: cx, centerY: cy, centerZ: cz, radius: r, step } = cfg;
  const cmds: string[] = [];
  const height = r * 4;
  const turns = 5;
  const tubeR = step * 1.5;
  for (let i = 0; i < turns * 60; i++) {
    const t = i / (turns * 60);
    const angle = t * turns * Math.PI * 2;
    const z = cz + t * height;
    for (const offset of [0, Math.PI]) {
      const sx = cx + Math.cos(angle + offset) * r;
      const sy = cy + Math.sin(angle + offset) * r;
      for (let dx = -tubeR; dx <= tubeR; dx += step)
        for (let dy = -tubeR; dy <= tubeR; dy += step)
          if (dx * dx + dy * dy <= tubeR * tubeR)
            cmds.push(cmd(bp, sx + dx, sy + dy, z));
    }
  }
  return cmds;
}

function generateStar(cfg: ShapeConfig, bp: string): string[] {
  const { centerX: cx, centerY: cy, centerZ: cz, radius: r, step } = cfg;
  const cmds: string[] = [];
  const thickness = step * 3;
  const points = 5;
  const innerR = r * 0.4;
  const verts: [number, number][] = [];
  for (let i = 0; i < points * 2; i++) {
    const angle = (i * Math.PI) / points - Math.PI / 2;
    const rad = i % 2 === 0 ? r : innerR;
    verts.push([cx + Math.cos(angle) * rad, cy + Math.sin(angle) * rad]);
  }
  function pointInStar(px: number, py: number): boolean {
    let inside = false;
    for (let i = 0, j = verts.length - 1; i < verts.length; j = i++) {
      const [xi, yi] = verts[i], [xj, yj] = verts[j];
      if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi)
        inside = !inside;
    }
    return inside;
  }
  for (let x = cx - r; x <= cx + r; x += step)
    for (let y = cy - r; y <= cy + r; y += step)
      for (let z = cz - thickness; z <= cz + thickness; z += step)
        if (pointInStar(x, y)) cmds.push(cmd(bp, x, y, z));
  return cmds;
}

function generateCylinder(cfg: ShapeConfig, bp: string): string[] {
  const { centerX: cx, centerY: cy, centerZ: cz, radius: r, step } = cfg;
  const cmds: string[] = [];
  const height = r * 2;
  circleWall(cx, cy, r, cz, height, step, bp, cmds);
  return cmds;
}

function generateHemisphere(cfg: ShapeConfig, bp: string): string[] {
  const { centerX: cx, centerY: cy, centerZ: cz, radius: r, step } = cfg;
  const cmds: string[] = [];
  const r2 = r * r;
  const ir = r - step * 1.5;
  const ir2 = ir * ir;
  for (let x = cx - r; x <= cx + r; x += step)
    for (let y = cy - r; y <= cy + r; y += step)
      for (let z = cz; z <= cz + r; z += step) {
        const d2 = (x - cx) ** 2 + (y - cy) ** 2 + (z - cz) ** 2;
        if (shell(d2, r2, ir2)) cmds.push(cmd(bp, x, y, z));
      }
  return cmds;
}

function generateArch(cfg: ShapeConfig, bp: string): string[] {
  const { centerX: cx, centerY: cy, centerZ: cz, radius: r, step } = cfg;
  const cmds: string[] = [];
  const thickness = step * 2;
  // Arch on XZ plane, thin along Y
  for (let angle = 0; angle <= Math.PI; angle += step / r) {
    const x = cx + Math.cos(angle) * r;
    const z = cz + Math.sin(angle) * r;
    for (let y = cy - thickness; y <= cy + thickness; y += step) {
      cmds.push(cmd(bp, x, y, z));
    }
  }
  // Pillars
  for (let z = cz; z >= cz - r * 0.5; z -= step) {
    for (let y = cy - thickness; y <= cy + thickness; y += step) {
      cmds.push(cmd(bp, cx - r, y, z));
      cmds.push(cmd(bp, cx + r, y, z));
    }
  }
  return cmds;
}

function generateTunnel(cfg: ShapeConfig, bp: string): string[] {
  const { centerX: cx, centerY: cy, centerZ: cz, radius: r, step } = cfg;
  const cmds: string[] = [];
  const length = r * 3;
  // Tunnel runs along Y axis, arch on XZ
  for (let y = cy - length / 2; y <= cy + length / 2; y += step) {
    for (let angle = 0; angle <= Math.PI; angle += step / r) {
      const x = cx + Math.cos(angle) * r;
      const z = cz + Math.sin(angle) * r;
      cmds.push(cmd(bp, x, y, z));
    }
  }
  return cmds;
}

function generateHexPlatform(cfg: ShapeConfig, bp: string): string[] {
  const { centerX: cx, centerY: cy, centerZ: cz, radius: r, step } = cfg;
  const cmds: string[] = [];
  // Hexagon vertices
  const verts: [number, number][] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3;
    verts.push([cx + Math.cos(angle) * r, cy + Math.sin(angle) * r]);
  }
  function inHex(px: number, py: number): boolean {
    let inside = false;
    for (let i = 0, j = 5; i < 6; j = i++) {
      const [xi, yi] = verts[i], [xj, yj] = verts[j];
      if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi)
        inside = !inside;
    }
    return inside;
  }
  for (let x = cx - r; x <= cx + r; x += step)
    for (let y = cy - r; y <= cy + r; y += step)
      if (inHex(x, y)) cmds.push(cmd(bp, x, y, cz));
  // Edge walls
  for (let i = 0; i < 6; i++) {
    const [x1, y1] = verts[i];
    const [x2, y2] = verts[(i + 1) % 6];
    const dist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    const steps = Math.floor(dist / step);
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const x = x1 + (x2 - x1) * t;
      const y = y1 + (y2 - y1) * t;
      for (let z = cz; z <= cz + step * 2; z += step)
        cmds.push(cmd(bp, x, y, z));
    }
  }
  return cmds;
}

// ============================================================
// ARENA GENERATORS (REBUILT)
// ============================================================

function generateColosseum(cfg: ShapeConfig, bp: string): string[] {
  const { centerX: cx, centerY: cy, centerZ: cz, radius: r, step } = cfg;
  const cmds: string[] = [];
  const tiers = 4;
  const tierHeight = step * 3;
  const gateCount = cfg.gateCount ?? 4;
  const gateWidth = Math.PI / 12; // angular width of gates

  // Arena floor
  const arenaR = r * 0.5;
  circleFloor(cx, cy, arenaR, cz, step, bp, cmds);

  // Stepped bowl seating
  for (let tier = 0; tier < tiers; tier++) {
    const innerR = arenaR + tier * step * 3;
    const outerR = innerR + step * 3;
    const tierZ = cz + tier * tierHeight;

    // Seating terrace floor
    fillRing(cx, cy, innerR, outerR, step, (x, y) => {
      cmds.push(cmd(bp, x, y, tierZ));
    });

    // Back wall of tier
    sampleCircle(cx, cy, outerR, step, (x, y, angle) => {
      // Skip gate openings
      for (let g = 0; g < gateCount; g++) {
        const gateAngle = (g * Math.PI * 2) / gateCount;
        if (Math.abs(angle - gateAngle) < gateWidth && tier < 2) return;
      }
      for (let z = tierZ; z <= tierZ + tierHeight; z += step) {
        cmds.push(cmd(bp, x, y, z));
      }
    });
  }

  // Optional VIP platform
  if (cfg.hasVIPPlatform) {
    const vipZ = cz + tiers * tierHeight;
    const vipR = step * 4;
    const vipX = cx, vipY = cy - r;
    rectPlatform(vipX, vipY, vipR, vipR, vipZ, step, bp, cmds);
  }

  return cmds;
}

function generateSkyRing(cfg: ShapeConfig, bp: string): string[] {
  const { centerX: cx, centerY: cy, centerZ: cz, radius: r, step } = cfg;
  const cmds: string[] = [];
  const platformW = step * 3;

  // Ring platform on XY at height cz
  sampleCircle(cx, cy, r, step, (x, y, angle) => {
    for (let w = -platformW; w <= platformW; w += step) {
      const px = x + Math.cos(angle) * w;
      const py = y + Math.sin(angle) * w;
      cmds.push(cmd(bp, px, py, cz));
    }
  });

  // Railings on Z
  if (cfg.hasRailings !== false) {
    for (const rOff of [r - platformW, r + platformW]) {
      sampleCircle(cx, cy, rOff, step, (x, y) => {
        for (let z = cz; z <= cz + step * 3; z += step)
          cmds.push(cmd(bp, x, y, z));
      });
    }
  }

  // Optional inner floor fill
  if (cfg.hasInnerFloor) {
    circleFloor(cx, cy, r - platformW, cz, step, bp, cmds);
  }

  // Optional bridges (4 cross bridges)
  if (cfg.hasBridges) {
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      const bridgeW = step;
      for (let d = -r + platformW; d <= r - platformW; d += step) {
        const bx = cx + Math.cos(angle) * d;
        const by = cy + Math.sin(angle) * d;
        for (let w = -bridgeW; w <= bridgeW; w += step) {
          const px = bx + Math.cos(angle + Math.PI / 2) * w;
          const py = by + Math.sin(angle + Math.PI / 2) * w;
          cmds.push(cmd(bp, px, py, cz));
        }
      }
    }
  }

  // Optional support pillars
  if (cfg.hasSupportPillars) {
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;
      const px = cx + Math.cos(angle) * r;
      const py = cy + Math.sin(angle) * r;
      for (let z = cz - r; z <= cz; z += step) {
        cmds.push(cmd(bp, px, py, z));
      }
    }
  }

  return cmds;
}

function generateTowerArena(cfg: ShapeConfig, bp: string): string[] {
  const { centerX: cx, centerY: cy, centerZ: cz, radius: r, step } = cfg;
  const cmds: string[] = [];
  const floors = cfg.floorCount ?? 5;
  const height = r * 3;
  const floorSpacing = height / floors;

  // Outer wall cylinder
  circleWall(cx, cy, r, cz, height, step, bp, cmds);

  // Floor platforms with openings for traversal
  for (let f = 0; f <= floors; f++) {
    const fz = cz + f * floorSpacing;
    const openingAngle = (f % 4) * (Math.PI / 2); // rotate opening each floor

    fillCircle(cx, cy, r - step, step, (x, y) => {
      // Create opening for traversal
      const dx = x - cx, dy = y - cy;
      const angle = Math.atan2(dy, dx);
      const angleDiff = Math.abs(((angle - openingAngle + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      if (angleDiff < Math.PI / 6 && f > 0 && f < floors) return; // opening
      cmds.push(cmd(bp, x, y, fz));
    });
  }

  // Traversal system
  const style = cfg.traversalStyle ?? "spiral";
  if (style === "spiral") {
    spiralStairs(cx, cy, cz, height, r - step * 2, floors, step * 2, step, bp, cmds);
  } else if (style === "ramp") {
    // Outer ramp
    const rampR = r - step;
    const totalSteps = floors * 20;
    for (let i = 0; i <= totalSteps; i++) {
      const t = i / totalSteps;
      const angle = t * floors * Math.PI * 2;
      const z = cz + t * height;
      for (let w = 0; w <= step * 2; w += step) {
        const px = cx + Math.cos(angle) * (rampR - w);
        const py = cy + Math.sin(angle) * (rampR - w);
        cmds.push(cmd(bp, px, py, z));
      }
    }
  } else if (style === "jumpgap") {
    // Jump-gap floors with small platforms to hop between
    for (let f = 0; f < floors; f++) {
      const fz = cz + (f + 0.5) * floorSpacing;
      const jumpAngle = (f * Math.PI) / 3;
      const jumpR = r * 0.5;
      const px = cx + Math.cos(jumpAngle) * jumpR;
      const py = cy + Math.sin(jumpAngle) * jumpR;
      rectPlatform(px, py, step * 2, step * 2, fz, step, bp, cmds);
    }
  }

  // Central pillar
  if (cfg.hasCentralPillar) {
    extrudeZ(cz, height, step, (z) => {
      cmds.push(cmd(bp, cx, cy, z));
    });
  }

  // Top battle platform
  if (cfg.hasTopPlatform) {
    circleFloor(cx, cy, r + step * 2, cz + height, step, bp, cmds);
    // Railings on top
    sampleCircle(cx, cy, r + step * 2, step, (x, y) => {
      for (let z = cz + height; z <= cz + height + step * 3; z += step)
        cmds.push(cmd(bp, x, y, z));
    });
  }

  return cmds;
}

function generateCageMatch(cfg: ShapeConfig, bp: string): string[] {
  const { centerX: cx, centerY: cy, centerZ: cz, step } = cfg;
  const cmds: string[] = [];

  // Size based on preset
  const sizes = { small: 1000, medium: 2000, giant: 3500 };
  const h = sizes[cfg.cagePreset ?? "medium"] ?? cfg.radius;
  const halfW = cfg.cageShape === "rectangular" ? h * 1.5 : h;
  const halfD = h;
  const wallH = h * 1.2;

  // Floor
  centeredRect(cx, cy, halfW, halfD, step, (x, y) => {
    cmds.push(cmd(bp, x, y, cz));
  });

  // Walls
  rectEdges(cx, cy, halfW, halfD, step, (x, y) => {
    extrudeZ(cz, wallH, step, (z) => {
      cmds.push(cmd(bp, x, y, z));
    });
  });

  // Roof
  if (cfg.roofStyle === "closed") {
    centeredRect(cx, cy, halfW, halfD, step, (x, y) => {
      cmds.push(cmd(bp, x, y, cz + wallH));
    });
  }

  // Door openings (gaps in walls)
  // Already handled by wall generation — doors are just visual gaps
  if (cfg.hasDoors) {
    // We add door frame markers at two sides
    const doorW = step * 2;
    for (const side of [-1, 1]) {
      const dx = cx + side * halfW;
      cmds.push(cmd(bp, dx, cy - doorW, cz + wallH * 0.7));
      cmds.push(cmd(bp, dx, cy + doorW, cz + wallH * 0.7));
    }
  }

  // Corner posts
  if (cfg.hasCornerPosts) {
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        const px = cx + sx * halfW;
        const py = cy + sy * halfD;
        extrudeZ(cz, wallH + step * 2, step, (z) => {
          cmds.push(cmd(bp, px, py, z));
          cmds.push(cmd(bp, px + sx * step, py, z));
          cmds.push(cmd(bp, px, py + sy * step, z));
        });
      }
    }
  }

  // Center marker
  if (cfg.hasCenterMarker) {
    cmds.push(cmd(bp, cx, cy, cz));
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      cmds.push(cmd(bp, cx + Math.cos(angle) * step, cy + Math.sin(angle) * step, cz));
    }
  }

  return cmds;
}

// ============================================================
// NEW ARENA GENERATORS
// ============================================================

function generateDomeArena(cfg: ShapeConfig, bp: string): string[] {
  const { centerX: cx, centerY: cy, centerZ: cz, radius: r, step } = cfg;
  const cmds: string[] = [];
  // Floor
  circleFloor(cx, cy, r, cz, step, bp, cmds);
  // Dome shell
  const r2 = r * r;
  const ir = r - step * 1.5;
  const ir2 = ir * ir;
  for (let x = cx - r; x <= cx + r; x += step)
    for (let y = cy - r; y <= cy + r; y += step)
      for (let z = cz; z <= cz + r; z += step) {
        const d2 = (x - cx) ** 2 + (y - cy) ** 2 + (z - cz) ** 2;
        if (shell(d2, r2, ir2)) cmds.push(cmd(bp, x, y, z));
      }
  return cmds;
}

function generateOctagonArena(cfg: ShapeConfig, bp: string): string[] {
  const { centerX: cx, centerY: cy, centerZ: cz, radius: r, step } = cfg;
  const cmds: string[] = [];
  const wallH = step * 4;
  const sides = 8;
  const verts: [number, number][] = [];
  for (let i = 0; i < sides; i++) {
    const angle = (i * Math.PI * 2) / sides;
    verts.push([cx + Math.cos(angle) * r, cy + Math.sin(angle) * r]);
  }
  // Floor fill (octagon)
  function inOct(px: number, py: number): boolean {
    let inside = false;
    for (let i = 0, j = sides - 1; i < sides; j = i++) {
      const [xi, yi] = verts[i], [xj, yj] = verts[j];
      if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi)
        inside = !inside;
    }
    return inside;
  }
  for (let x = cx - r; x <= cx + r; x += step)
    for (let y = cy - r; y <= cy + r; y += step)
      if (inOct(x, y)) cmds.push(cmd(bp, x, y, cz));
  // Walls
  for (let i = 0; i < sides; i++) {
    const [x1, y1] = verts[i];
    const [x2, y2] = verts[(i + 1) % sides];
    const dist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    const segs = Math.floor(dist / step);
    for (let s = 0; s <= segs; s++) {
      const t = s / segs;
      const x = x1 + (x2 - x1) * t;
      const y = y1 + (y2 - y1) * t;
      extrudeZ(cz, wallH, step, (z) => {
        cmds.push(cmd(bp, x, y, z));
      });
    }
  }
  return cmds;
}

function generatePitArena(cfg: ShapeConfig, bp: string): string[] {
  const { centerX: cx, centerY: cy, centerZ: cz, radius: r, step } = cfg;
  const cmds: string[] = [];
  const depth = r * 0.5;
  // Pit floor
  circleFloor(cx, cy, r * 0.7, cz - depth, step, bp, cmds);
  // Sloped walls going down
  const tiers = 4;
  for (let t = 0; t < tiers; t++) {
    const tierR = r - t * (r * 0.3 / tiers);
    const tierZ = cz - t * (depth / tiers);
    sampleCircle(cx, cy, tierR, step, (x, y) => {
      cmds.push(cmd(bp, x, y, tierZ));
    });
    circleWall(cx, cy, tierR, tierZ - depth / tiers, depth / tiers, step, bp, cmds);
  }
  // Surface ring
  fillRing(cx, cy, r * 0.8, r, step, (x, y) => {
    cmds.push(cmd(bp, x, y, cz));
  });
  return cmds;
}

function generateBridgeArena(cfg: ShapeConfig, bp: string): string[] {
  const { centerX: cx, centerY: cy, centerZ: cz, radius: r, step } = cfg;
  const cmds: string[] = [];
  const platR = r * 0.3;
  const bridgeW = step * 2;
  // Two platforms
  circleFloor(cx - r * 0.5, cy, platR, cz, step, bp, cmds);
  circleFloor(cx + r * 0.5, cy, platR, cz, step, bp, cmds);
  // Bridge connecting them
  rampSegment(cx - r * 0.5 + platR, cy, cz, cx + r * 0.5 - platR, cy, cz, bridgeW, step, bp, cmds);
  // Railings on bridge
  for (let x = cx - r * 0.5 + platR; x <= cx + r * 0.5 - platR; x += step) {
    for (let z = cz; z <= cz + step * 3; z += step) {
      cmds.push(cmd(bp, x, cy - bridgeW - step, z));
      cmds.push(cmd(bp, x, cy + bridgeW + step, z));
    }
  }
  return cmds;
}

function generateKingOfTheHill(cfg: ShapeConfig, bp: string): string[] {
  const { centerX: cx, centerY: cy, centerZ: cz, radius: r, step } = cfg;
  const cmds: string[] = [];
  const tiers = 5;
  const tierH = step * 2;
  // Tiered hill
  for (let t = 0; t < tiers; t++) {
    const tierR = r * (1 - t * 0.18);
    const tierZ = cz + t * tierH;
    circleFloor(cx, cy, tierR, tierZ, step, bp, cmds);
  }
  // Top platform with marker
  const topZ = cz + tiers * tierH;
  circleFloor(cx, cy, step * 3, topZ, step, bp, cmds);
  // Flag post
  for (let z = topZ; z <= topZ + step * 6; z += step) {
    cmds.push(cmd(bp, cx, cy, z));
  }
  return cmds;
}

function generateFourCornerArena(cfg: ShapeConfig, bp: string): string[] {
  const { centerX: cx, centerY: cy, centerZ: cz, radius: r, step } = cfg;
  const cmds: string[] = [];
  const platR = r * 0.25;
  // 4 corner platforms
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      const px = cx + sx * r * 0.6;
      const py = cy + sy * r * 0.6;
      circleFloor(px, py, platR, cz, step, bp, cmds);
      // Walls around each platform
      sampleCircle(px, py, platR, step, (x, y) => {
        for (let z = cz; z <= cz + step * 3; z += step)
          cmds.push(cmd(bp, x, y, z));
      });
    }
  }
  // Central ring
  fillRing(cx, cy, r * 0.15, r * 0.25, step, (x, y) => {
    cmds.push(cmd(bp, x, y, cz));
  });
  // Connecting paths
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      const px = cx + sx * r * 0.6;
      const py = cy + sy * r * 0.6;
      rampSegment(cx, cy, cz, px, py, cz, step, step, bp, cmds);
    }
  }
  return cmds;
}

// ============================================================
// EVENT GENERATORS (REBUILT)
// ============================================================

function generateMaze(cfg: ShapeConfig, bp: string): string[] {
  const { centerX: cx, centerY: cy, centerZ: cz, step } = cfg;
  const cmds: string[] = [];
  const difficulty = cfg.difficulty ?? "medium";
  const gridSize = DIFFICULTY_SIZES[difficulty] ?? 14;
  const wallH = cfg.wallHeight ?? step * 4;
  const wallThick = cfg.wallThickness ?? 1;

  const rand = seededRandom(cfg.seed ?? Date.now());

  // Compute the total maze footprint and center it
  const mazeWidth = gridSize * step;
  const originX = cx - mazeWidth / 2;
  const originY = cy - mazeWidth / 2;

  // Initialize: all cells are walls (even indices)
  const walls = new Set<string>();
  for (let gx = 0; gx <= gridSize; gx++)
    for (let gy = 0; gy <= gridSize; gy++) {
      if (gx % 2 === 0 || gy % 2 === 0) walls.add(`${gx},${gy}`);
    }

  // Recursive backtracker
  const visited = new Set<string>();
  const stack: [number, number][] = [[1, 1]];
  visited.add("1,1");
  while (stack.length > 0) {
    const [gx, gy] = stack[stack.length - 1];
    const neighbors = [[0, 2], [2, 0], [0, -2], [-2, 0]].filter(([dx, dy]) => {
      const nx = gx + dx, ny = gy + dy;
      return nx > 0 && nx < gridSize && ny > 0 && ny < gridSize && !visited.has(`${nx},${ny}`);
    });
    if (neighbors.length === 0) { stack.pop(); continue; }
    // Shuffle
    for (let i = neighbors.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [neighbors[i], neighbors[j]] = [neighbors[j], neighbors[i]];
    }
    const [dx, dy] = neighbors[0];
    const nx = gx + dx, ny = gy + dy;
    walls.delete(`${gx + dx / 2},${gy + dy / 2}`);
    visited.add(`${nx},${ny}`);
    stack.push([nx, ny]);
  }

  // Dead-end density: optionally remove some dead-end walls
  const deadEndDensity = cfg.deadEndDensity ?? 0;
  if (deadEndDensity > 0) {
    const wallList = [...walls];
    const removeCount = Math.floor(wallList.length * deadEndDensity * 0.3);
    for (let i = 0; i < removeCount; i++) {
      const idx = Math.floor(rand() * wallList.length);
      const key = wallList[idx];
      const [gs1, gs2] = key.split(",");
      const gx = parseInt(gs1), gy = parseInt(gs2);
      if (gx > 0 && gx < gridSize && gy > 0 && gy < gridSize) {
        walls.delete(key);
      }
    }
  }

  // Create entrance and exit openings
  walls.delete("0,1"); // entrance on left side
  walls.delete(`${gridSize},${gridSize - 1}`); // exit on right side

  // Optional outer border
  if (cfg.hasBorder) {
    // Top and bottom borders
    for (let gx = 0; gx <= gridSize; gx++) {
      walls.add(`${gx},0`);
      walls.add(`${gx},${gridSize}`);
    }
    for (let gy = 0; gy <= gridSize; gy++) {
      walls.add(`0,${gy}`);
      walls.add(`${gridSize},${gy}`);
    }
    // Re-open entrance/exit
    walls.delete("0,1");
    walls.delete(`${gridSize},${gridSize - 1}`);
  }

  // Optional floor layer
  if (cfg.hasFloor) {
    for (let gx = 0; gx <= gridSize; gx++) {
      for (let gy = 0; gy <= gridSize; gy++) {
        const x = originX + gx * step;
        const y = originY + gy * step;
        cmds.push(cmd(bp, x, y, cz));
      }
    }
  }

  // Generate wall commands
  for (const key of walls) {
    const [gxs, gys] = key.split(",");
    const gx = parseInt(gxs), gy = parseInt(gys);
    const x = originX + gx * step;
    const y = originY + gy * step;
    for (let wt = 0; wt < wallThick; wt++) {
      for (let z = cz; z <= cz + wallH; z += step) {
        cmds.push(cmd(bp, x + wt * step * 0.5, y, z));
        if (cmds.length >= MAX_COMMANDS) return dedupeCommands(cmds);
      }
    }
  }

  // Optional corner towers
  if (cfg.hasCornerTowers) {
    for (const sx of [0, gridSize]) {
      for (const sy of [0, gridSize]) {
        const tx = originX + sx * step;
        const ty = originY + sy * step;
        for (let z = cz; z <= cz + wallH + step * 3; z += step) {
          cmds.push(cmd(bp, tx, ty, z));
          cmds.push(cmd(bp, tx + step, ty, z));
          cmds.push(cmd(bp, tx, ty + step, z));
          cmds.push(cmd(bp, tx + step, ty + step, z));
        }
      }
    }
  }

  // Center spawn pad
  const centerGX = Math.floor(gridSize / 2);
  const centerGY = Math.floor(gridSize / 2);
  if (centerGX % 2 !== 0) {
    const padX = originX + centerGX * step;
    const padY = originY + centerGY * step;
    for (let dx = -step; dx <= step; dx += step)
      for (let dy = -step; dy <= step; dy += step)
        cmds.push(cmd(bp, padX + dx, padY + dy, cz));
  }

  return dedupeCommands(cmds);
}

function generateObstacleCourse(cfg: ShapeConfig, bp: string): string[] {
  const { centerX: cx, centerY: cy, centerZ: cz, radius: length, step } = cfg;
  const cmds: string[] = [];
  const pathStyle = cfg.pathStyle ?? "linear";
  const density = cfg.obstacleDensity ?? 0.7;
  const platformCount = Math.floor(12 + density * 10);
  const platW = step * 3;
  const rand = seededRandom(cfg.seed ?? 42);

  // Start platform
  rectPlatform(cx - length / 2, cy, platW * 2, platW * 2, cz, step, bp, cmds);
  // Start marker
  cmds.push(cmd(bp, cx - length / 2, cy, cz + step));

  // End platform
  rectPlatform(cx + length / 2, cy, platW * 2, platW * 2, cz, step, bp, cmds);
  // End marker
  cmds.push(cmd(bp, cx + length / 2, cy, cz + step));

  // Generate obstacle segments along path
  for (let i = 0; i < platformCount; i++) {
    const t = (i + 1) / (platformCount + 1);
    let px: number, py: number, pz: number;

    if (pathStyle === "linear") {
      px = cx - length / 2 + t * length;
      py = cy;
      pz = cz + Math.sin(i * 1.3) * step * 4;
    } else if (pathStyle === "zigzag") {
      px = cx - length / 2 + t * length;
      py = cy + (i % 2 === 0 ? 1 : -1) * step * 6;
      pz = cz + Math.abs(Math.sin(i * 0.8)) * step * 5;
    } else if (pathStyle === "serpentine") {
      px = cx - length / 2 + t * length;
      py = cy + Math.sin(t * Math.PI * 4) * step * 8;
      pz = cz + Math.sin(i * 0.5) * step * 3;
    } else { // circular
      const angle = t * Math.PI * 1.8;
      const r = length * 0.4;
      px = cx + Math.cos(angle) * r;
      py = cy + Math.sin(angle) * r;
      pz = cz + t * step * 10;
    }

    // Obstacle type selection
    const obstacleType = Math.floor(rand() * 6);

    if (obstacleType === 0) {
      // Standard platform
      rectPlatform(px, py, platW, platW, pz, step, bp, cmds);
    } else if (obstacleType === 1) {
      // Narrow beam
      for (let d = -platW * 2; d <= platW * 2; d += step) {
        cmds.push(cmd(bp, px + d, py, pz));
      }
    } else if (obstacleType === 2) {
      // Pillar jumps (3 small pillars)
      for (let j = 0; j < 3; j++) {
        const jx = px + (j - 1) * step * 2;
        cmds.push(cmd(bp, jx, py, pz));
        cmds.push(cmd(bp, jx + step, py, pz));
        cmds.push(cmd(bp, jx, py + step, pz));
      }
    } else if (obstacleType === 3) {
      // Alternating height platforms
      for (let j = 0; j < 4; j++) {
        const jx = px + (j - 1.5) * step * 2;
        const jz = pz + (j % 2) * step * 2;
        cmds.push(cmd(bp, jx, py, jz));
        cmds.push(cmd(bp, jx + step, py, jz));
        cmds.push(cmd(bp, jx, py + step, jz));
      }
    } else if (obstacleType === 4) {
      // Gap jump (wider platform with gap in middle)
      for (let dx = -platW * 2; dx <= platW * 2; dx += step) {
        if (Math.abs(dx) > step * 1.5 || Math.abs(dx) < step * 0.5) {
          for (let dy = -step; dy <= step; dy += step) {
            cmds.push(cmd(bp, px + dx, py + dy, pz));
          }
        }
      }
    } else {
      // Spiral ascent segment
      for (let j = 0; j < 6; j++) {
        const angle = (j * Math.PI) / 3;
        const sx = px + Math.cos(angle) * step * 2;
        const sy = py + Math.sin(angle) * step * 2;
        const sz = pz + j * step;
        cmds.push(cmd(bp, sx, sy, sz));
        cmds.push(cmd(bp, sx + step, sy, sz));
      }
    }

    // Checkpoint every 4 obstacles
    if (i % 4 === 3) {
      rectPlatform(px, py, platW * 1.5, platW * 1.5, pz, step, bp, cmds);
      // Checkpoint marker post
      for (let z = pz; z <= pz + step * 4; z += step) {
        cmds.push(cmd(bp, px, py, z));
      }
    }

    // Optional rails on some segments
    if (cfg.hasRailings && i % 3 === 0) {
      for (let dx = -platW; dx <= platW; dx += step) {
        cmds.push(cmd(bp, px + dx, py - platW - step, pz + step));
        cmds.push(cmd(bp, px + dx, py + platW + step, pz + step));
      }
    }
  }

  // Spectator platforms
  if (cfg.hasSpectatorPlatforms) {
    for (let i = 0; i < 4; i++) {
      const sx = cx + (i / 3 - 0.5) * length;
      const sy = cy + (i % 2 === 0 ? 1 : -1) * step * 15;
      rectPlatform(sx, sy, step * 4, step * 3, cz + step * 8, step, bp, cmds);
    }
  }

  return dedupeCommands(cmds);
}

function generateSpiralStaircase(cfg: ShapeConfig, bp: string): string[] {
  const { centerX: cx, centerY: cy, centerZ: cz, radius: r, step } = cfg;
  const cmds: string[] = [];
  const height = r * 4;
  const turns = 6;
  spiralStairs(cx, cy, cz, height, r, turns, step * 3, step, bp, cmds);
  // Central pillar
  extrudeZ(cz, height, step, (z) => { cmds.push(cmd(bp, cx, cy, z)); });
  return cmds;
}

function generateSkull(cfg: ShapeConfig, bp: string): string[] {
  const { centerX: cx, centerY: cy, centerZ: cz, radius: r, step } = cfg;
  const cmds: string[] = [];
  const r2 = r * r, ir = r - step * 1.5, ir2 = ir * ir;
  for (let x = cx - r; x <= cx + r; x += step)
    for (let y = cy - r; y <= cy + r; y += step)
      for (let z = cz - r * 0.3; z <= cz + r; z += step) {
        const d2 = (x - cx) ** 2 + (y - cy) ** 2 + (z - cz) ** 2;
        if (shell(d2, r2, ir2)) cmds.push(cmd(bp, x, y, z));
      }
  const jawW = r * 0.6, jawH = r * 0.4;
  for (let x = cx - jawW; x <= cx + jawW; x += step)
    for (let y = cy - jawW; y <= cy + jawW; y += step)
      for (let z = cz - r * 0.3 - jawH; z <= cz - r * 0.3; z += step) {
        const onEdge = Math.abs(Math.abs(x - cx) - jawW) < step || Math.abs(Math.abs(y - cy) - jawW) < step ||
          Math.abs(z - (cz - r * 0.3 - jawH)) < step / 2;
        if (onEdge) cmds.push(cmd(bp, x, y, z));
      }
  return cmds;
}

// --- New Event Generators ---

function generateRaceTrack(cfg: ShapeConfig, bp: string): string[] {
  const { centerX: cx, centerY: cy, centerZ: cz, radius: r, step } = cfg;
  const cmds: string[] = [];
  const trackW = step * 4;
  // Oval track on XY
  const rx = r, ry = r * 0.6;
  for (let angle = 0; angle < Math.PI * 2; angle += step / r) {
    const x = cx + Math.cos(angle) * rx;
    const y = cy + Math.sin(angle) * ry;
    for (let w = -trackW; w <= trackW; w += step) {
      const px = x + Math.cos(angle) * w;
      const py = y + Math.sin(angle) * w;
      cmds.push(cmd(bp, px, py, cz));
    }
    // Barriers
    for (const wOff of [-trackW - step, trackW + step]) {
      const bx = x + Math.cos(angle) * wOff;
      const by = y + Math.sin(angle) * wOff;
      cmds.push(cmd(bp, bx, by, cz + step));
    }
  }
  return cmds;
}

function generateParkourTower(cfg: ShapeConfig, bp: string): string[] {
  const { centerX: cx, centerY: cy, centerZ: cz, radius: r, step } = cfg;
  const cmds: string[] = [];
  const floors = 12;
  const floorH = step * 4;
  const rand = seededRandom(cfg.seed ?? 99);

  for (let f = 0; f < floors; f++) {
    const fz = cz + f * floorH;
    const angle = f * (Math.PI * 2 / 5) + rand() * 0.5;
    const dist = r * 0.4 + rand() * r * 0.4;
    const px = cx + Math.cos(angle) * dist;
    const py = cy + Math.sin(angle) * dist;

    // Platform
    const platSize = step * (2 + Math.floor(rand() * 2));
    rectPlatform(px, py, platSize, platSize, fz, step, bp, cmds);

    // Occasional pillar support
    if (f % 3 === 0) {
      for (let z = cz; z <= fz; z += step)
        cmds.push(cmd(bp, px, py, z));
    }
  }
  // Top platform
  circleFloor(cx, cy, r * 0.3, cz + floors * floorH, step, bp, cmds);
  return cmds;
}

function generateDropperTower(cfg: ShapeConfig, bp: string): string[] {
  const { centerX: cx, centerY: cy, centerZ: cz, radius: r, step } = cfg;
  const cmds: string[] = [];
  const floors = 8;
  const floorH = step * 5;
  const height = floors * floorH;
  const rand = seededRandom(cfg.seed ?? 77);

  // Outer walls
  circleWall(cx, cy, r, cz, height, step, bp, cmds);

  // Floors with holes
  for (let f = 0; f < floors; f++) {
    const fz = cz + (f + 1) * floorH;
    const holeAngle = rand() * Math.PI * 2;
    const holeDist = rand() * r * 0.5;
    const holeX = cx + Math.cos(holeAngle) * holeDist;
    const holeY = cy + Math.sin(holeAngle) * holeDist;
    const holeR = step * 2;

    fillCircle(cx, cy, r - step, step, (x, y) => {
      if ((x - holeX) ** 2 + (y - holeY) ** 2 > holeR * holeR) {
        cmds.push(cmd(bp, x, y, fz));
      }
    });
  }

  // Water/safe pad at bottom
  circleFloor(cx, cy, r * 0.3, cz, step, bp, cmds);
  // Top entry platform
  circleFloor(cx, cy, r, cz + height + floorH, step, bp, cmds);
  return cmds;
}

function generateSpleefGrid(cfg: ShapeConfig, bp: string): string[] {
  const { centerX: cx, centerY: cy, centerZ: cz, radius: r, step } = cfg;
  const cmds: string[] = [];
  // Grid floor at height
  for (let x = cx - r; x <= cx + r; x += step)
    for (let y = cy - r; y <= cy + r; y += step)
      if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r)
        cmds.push(cmd(bp, x, y, cz));
  // Walls around
  sampleCircle(cx, cy, r, step, (x, y) => {
    for (let z = cz - step * 2; z <= cz + step * 3; z += step)
      cmds.push(cmd(bp, x, y, z));
  });
  // Safety net below
  circleFloor(cx, cy, r, cz - step * 10, step, bp, cmds);
  return cmds;
}

function generateCapturePointArena(cfg: ShapeConfig, bp: string): string[] {
  const { centerX: cx, centerY: cy, centerZ: cz, radius: r, step } = cfg;
  const cmds: string[] = [];
  // 3 capture points
  const points = [
    { x: cx, y: cy, label: "center" },
    { x: cx - r * 0.6, y: cy, label: "left" },
    { x: cx + r * 0.6, y: cy, label: "right" },
  ];
  for (const pt of points) {
    // Platform
    circleFloor(pt.x, pt.y, step * 4, cz, step, bp, cmds);
    // Flag post
    for (let z = cz; z <= cz + step * 5; z += step)
      cmds.push(cmd(bp, pt.x, pt.y, z));
    // Low wall ring
    sampleCircle(pt.x, pt.y, step * 4, step, (x, y) => {
      cmds.push(cmd(bp, x, y, cz + step));
    });
  }
  // Connecting terrain
  rampSegment(cx - r * 0.6, cy, cz, cx, cy, cz, step * 3, step, bp, cmds);
  rampSegment(cx, cy, cz, cx + r * 0.6, cy, cz, step * 3, step, bp, cmds);
  // Outer boundary
  sampleCircle(cx, cy, r, step, (x, y) => {
    for (let z = cz; z <= cz + step * 2; z += step)
      cmds.push(cmd(bp, x, y, z));
  });
  return cmds;
}

function generateBossSummonPlatform(cfg: ShapeConfig, bp: string): string[] {
  const { centerX: cx, centerY: cy, centerZ: cz, radius: r, step } = cfg;
  const cmds: string[] = [];
  // Main ritual platform
  circleFloor(cx, cy, r, cz, step, bp, cmds);
  // Inner ritual ring
  fillRing(cx, cy, r * 0.3, r * 0.4, step, (x, y) => {
    cmds.push(cmd(bp, x, y, cz + step));
  });
  // Pillar ring (8 pillars)
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI * 2) / 8;
    const px = cx + Math.cos(angle) * r * 0.6;
    const py = cy + Math.sin(angle) * r * 0.6;
    extrudeZ(cz, step * 8, step, (z) => {
      cmds.push(cmd(bp, px, py, z));
    });
  }
  // Center summon point (raised)
  rectPlatform(cx, cy, step * 2, step * 2, cz + step, step, bp, cmds);
  // Steps up from edge
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2;
    for (let s = 0; s < 3; s++) {
      const d = r - s * step * 2;
      const sx = cx + Math.cos(angle) * d;
      const sy = cy + Math.sin(angle) * d;
      rectPlatform(sx, sy, step * 2, step * 2, cz - (2 - s) * step, step, bp, cmds);
    }
  }
  return cmds;
}

function generateLastManStanding(cfg: ShapeConfig, bp: string): string[] {
  const { centerX: cx, centerY: cy, centerZ: cz, radius: r, step } = cfg;
  const cmds: string[] = [];
  // Concentric rings (representing shrinking zones)
  const rings = 5;
  for (let i = 0; i < rings; i++) {
    const ringR = r * (1 - i * 0.18);
    sampleCircle(cx, cy, ringR, step, (x, y) => {
      cmds.push(cmd(bp, x, y, cz));
      cmds.push(cmd(bp, x, y, cz + step));
    });
  }
  // Full floor in innermost ring
  circleFloor(cx, cy, r * 0.2, cz, step, bp, cmds);
  // Outer wall
  circleWall(cx, cy, r, cz, step * 4, step, bp, cmds);
  return cmds;
}

// ============================================================
// MAIN GENERATOR DISPATCH
// ============================================================

export function generateShape(preset: ShapeConfig, blueprint: string): string[] {
  const safeCfg = { ...preset, step: Math.max(preset.step, 100) };
  let cmds: string[];
  switch (safeCfg.name) {
    case "Sphere": cmds = generateSphere(safeCfg, blueprint); break;
    case "Cube": cmds = generateCube(safeCfg, blueprint); break;
    case "Pac-Man": cmds = generatePacMan(safeCfg, blueprint); break;
    case "Pyramid": cmds = generatePyramid(safeCfg, blueprint); break;
    case "Torus": cmds = generateTorus(safeCfg, blueprint); break;
    case "Diamond": cmds = generateDiamond(safeCfg, blueprint); break;
    case "Helix": cmds = generateHelix(safeCfg, blueprint); break;
    case "Star": cmds = generateStar(safeCfg, blueprint); break;
    case "Cylinder": cmds = generateCylinder(safeCfg, blueprint); break;
    case "Hemisphere": cmds = generateHemisphere(safeCfg, blueprint); break;
    case "Arch": cmds = generateArch(safeCfg, blueprint); break;
    case "Tunnel": cmds = generateTunnel(safeCfg, blueprint); break;
    case "Hex Platform": cmds = generateHexPlatform(safeCfg, blueprint); break;
    case "Colosseum": cmds = generateColosseum(safeCfg, blueprint); break;
    case "Sky Ring": cmds = generateSkyRing(safeCfg, blueprint); break;
    case "Tower Arena": cmds = generateTowerArena(safeCfg, blueprint); break;
    case "Cage Match": cmds = generateCageMatch(safeCfg, blueprint); break;
    case "Dome Arena": cmds = generateDomeArena(safeCfg, blueprint); break;
    case "Octagon Arena": cmds = generateOctagonArena(safeCfg, blueprint); break;
    case "Pit Arena": cmds = generatePitArena(safeCfg, blueprint); break;
    case "Bridge Arena": cmds = generateBridgeArena(safeCfg, blueprint); break;
    case "King of the Hill": cmds = generateKingOfTheHill(safeCfg, blueprint); break;
    case "Four-Corner Arena": cmds = generateFourCornerArena(safeCfg, blueprint); break;
    case "Maze": cmds = generateMaze(safeCfg, blueprint); break;
    case "Obstacle Course": cmds = generateObstacleCourse(safeCfg, blueprint); break;
    case "Spiral Staircase": cmds = generateSpiralStaircase(safeCfg, blueprint); break;
    case "Skull": cmds = generateSkull(safeCfg, blueprint); break;
    case "Race Track": cmds = generateRaceTrack(safeCfg, blueprint); break;
    case "Parkour Tower": cmds = generateParkourTower(safeCfg, blueprint); break;
    case "Dropper Tower": cmds = generateDropperTower(safeCfg, blueprint); break;
    case "Spleef Grid": cmds = generateSpleefGrid(safeCfg, blueprint); break;
    case "Capture Point Arena": cmds = generateCapturePointArena(safeCfg, blueprint); break;
    case "Boss Summon Platform": cmds = generateBossSummonPlatform(safeCfg, blueprint); break;
    case "Last Man Standing": cmds = generateLastManStanding(safeCfg, blueprint); break;
    default: cmds = [];
  }
  return dedupeCommands(cmds).slice(0, MAX_COMMANDS);
}
