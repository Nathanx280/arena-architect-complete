import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, Download, Grid3X3, Zap, RefreshCw, Save, FolderOpen, Shuffle, Trash2, FileText, MapPin } from "lucide-react";
import { toast } from "sonner";
import { SHAPE_PRESETS, generateShape, ShapeConfig, ShapeCategory } from "@/lib/shapeGenerators";
import { computeFootprint, WARN_THRESHOLD, MAX_COMMANDS } from "@/lib/generatorHelpers";
import AxisInspector from "@/components/AxisInspector";
import CommandWarnings from "@/components/CommandWarnings";

const DEFAULT_BLUEPRINT =
  '"Blueprint\'/Game/PrimalEarth/Structures/TributeTerminal_Base.TributeTerminal_Base\'"';

type Mode = "grid" | "shape";

// Local storage helpers
function savePreset(name: string, config: Record<string, unknown>) {
  const presets = JSON.parse(localStorage.getItem("ark_presets") || "{}");
  presets[name] = { ...config, savedAt: Date.now() };
  localStorage.setItem("ark_presets", JSON.stringify(presets));
}
function loadPresets(): Record<string, Record<string, unknown>> {
  return JSON.parse(localStorage.getItem("ark_presets") || "{}");
}
function deletePreset(name: string) {
  const presets = JSON.parse(localStorage.getItem("ark_presets") || "{}");
  delete presets[name];
  localStorage.setItem("ark_presets", JSON.stringify(presets));
}
function addRecentBuild(shapeName: string, commandCount: number) {
  const recent = JSON.parse(localStorage.getItem("ark_recent") || "[]");
  recent.unshift({ name: shapeName, commands: commandCount, time: Date.now() });
  localStorage.setItem("ark_recent", JSON.stringify(recent.slice(0, 20)));
}
function getRecentBuilds(): { name: string; commands: number; time: number }[] {
  return JSON.parse(localStorage.getItem("ark_recent") || "[]");
}

const CHUNK_PRESETS = [100, 200, 300, 500];

const Index = () => {
  const [mode, setMode] = useState<Mode>("shape");

  // Grid mode state
  const [maxX, setMaxX] = useState(20000);
  const [maxY, setMaxY] = useState(20000);
  const [xStep, setXStep] = useState(300);
  const [yStep, setYStep] = useState(500);
  const [gridZ, setGridZ] = useState(5000);
  const [gridStyle, setGridStyle] = useState<"flat" | "walls">("flat");
  const [gridWallHeight, setGridWallHeight] = useState(1200);

  // Shape mode state
  const [shapeCategory, setShapeCategory] = useState<ShapeCategory>("shapes");
  const [activeShape, setActiveShape] = useState(SHAPE_PRESETS[0]);
  const [shapeCenterX, setShapeCenterX] = useState(5000);
  const [shapeCenterY, setShapeCenterY] = useState(5000);
  const [shapeCenterZ, setShapeCenterZ] = useState(3000);
  const [shapeRadius, setShapeRadius] = useState(2000);
  const [shapeStep, setShapeStep] = useState(400);
  const [mazeSeed, setMazeSeed] = useState(() => Date.now());

  // Extended options
  const [wallHeight, setWallHeight] = useState(1200);
  const [wallThickness, setWallThickness] = useState(1);
  const [difficulty, setDifficulty] = useState<"small" | "medium" | "large" | "brutal">("medium");
  const [hasFloor, setHasFloor] = useState(true);
  const [hasBorder, setHasBorder] = useState(true);
  const [hasCornerTowers, setHasCornerTowers] = useState(false);
  const [deadEndDensity, setDeadEndDensity] = useState(0);
  const [pathStyle, setPathStyle] = useState<"linear" | "zigzag" | "circular" | "serpentine">("zigzag");
  const [obstacleDensity, setObstacleDensity] = useState(0.7);
  const [hasSpectatorPlatforms, setHasSpectatorPlatforms] = useState(false);
  const [hasRailings, setHasRailings] = useState(true);
  const [traversalStyle, setTraversalStyle] = useState<"spiral" | "outer" | "ramp" | "jumpgap">("spiral");
  const [floorCount, setFloorCount] = useState(5);
  const [hasCentralPillar, setHasCentralPillar] = useState(true);
  const [hasTopPlatform, setHasTopPlatform] = useState(true);
  const [hasInnerFloor, setHasInnerFloor] = useState(false);
  const [hasBridges, setHasBridges] = useState(false);
  const [hasSupportPillars, setHasSupportPillars] = useState(false);
  const [roofStyle, setRoofStyle] = useState<"open" | "closed">("closed");
  const [hasDoors, setHasDoors] = useState(true);
  const [hasCornerPosts, setHasCornerPosts] = useState(true);
  const [hasCenterMarker, setHasCenterMarker] = useState(true);
  const [cagePreset, setCagePreset] = useState<"small" | "medium" | "giant">("medium");
  const [gateCount, setGateCount] = useState(4);
  const [hasVIPPlatform, setHasVIPPlatform] = useState(false);

  // Shared
  const [blueprint, setBlueprint] = useState(DEFAULT_BLUEPRINT);
  const [chunkSize, setChunkSize] = useState(300);
  const [copyMode, setCopyMode] = useState<"multiline" | "singleline">("multiline");
  const [includeTeleport, setIncludeTeleport] = useState(true);
  const [teleportX, setTeleportX] = useState(5000);
  const [teleportY, setTeleportY] = useState(5000);
  const [teleportZ, setTeleportZ] = useState(3000);
  const [customFileName, setCustomFileName] = useState("");
  // Presets
  const [presetName, setPresetName] = useState("");
  const [savedPresets, setSavedPresets] = useState(loadPresets);
  const [recentBuilds, setRecentBuilds] = useState(getRecentBuilds);

  // Build current config
  const currentConfig = useMemo((): ShapeConfig => ({
    ...activeShape,
    centerX: shapeCenterX,
    centerY: shapeCenterY,
    centerZ: shapeCenterZ,
    radius: shapeRadius,
    step: shapeStep,
    seed: mazeSeed,
    wallHeight,
    wallThickness,
    difficulty,
    hasFloor,
    hasBorder,
    hasCornerTowers,
    deadEndDensity,
    pathStyle,
    obstacleDensity,
    hasSpectatorPlatforms,
    hasRailings,
    traversalStyle,
    floorCount,
    hasCentralPillar,
    hasTopPlatform,
    hasInnerFloor,
    hasBridges,
    hasSupportPillars,
    roofStyle,
    hasDoors,
    hasCornerPosts,
    hasCenterMarker,
    cagePreset,
    gateCount,
    hasVIPPlatform,
  }), [activeShape, shapeCenterX, shapeCenterY, shapeCenterZ, shapeRadius, shapeStep, mazeSeed,
    wallHeight, wallThickness, difficulty, hasFloor, hasBorder, hasCornerTowers, deadEndDensity,
    pathStyle, obstacleDensity, hasSpectatorPlatforms, hasRailings, traversalStyle, floorCount,
    hasCentralPillar, hasTopPlatform, hasInnerFloor, hasBridges, hasSupportPillars, roofStyle,
    hasDoors, hasCornerPosts, hasCenterMarker, cagePreset, gateCount, hasVIPPlatform]);

  const commands = useMemo(() => {
    if (mode === "shape") {
      return generateShape(currentConfig, blueprint);
    }
    const cmds: string[] = [];
    if (gridStyle === "flat") {
      for (let x = 0; x <= maxX; x += xStep) {
        for (let y = 0; y <= maxY; y += yStep) {
          cmds.push(`admincheat spawnactor ${blueprint} ${x} ${y} ${gridZ}|`);
        }
      }
    } else {
      // Walls: grid edges extruded upward along Z
      for (let x = 0; x <= maxX; x += xStep) {
        for (let y = 0; y <= maxY; y += yStep) {
          // Only place on grid lines (edges of each cell)
          const onXEdge = x % xStep === 0;
          const onYEdge = y % yStep === 0;
          if (onXEdge || onYEdge) {
            for (let z = gridZ; z <= gridZ + gridWallHeight; z += Math.min(xStep, yStep)) {
              cmds.push(`admincheat spawnactor ${blueprint} ${x} ${y} ${z}|`);
            }
          }
        }
      }
    }
    return cmds;
  }, [mode, currentConfig, blueprint, maxX, maxY, xStep, yStep, gridZ, gridStyle, gridWallHeight]);

  const footprint = useMemo(() =>
    computeFootprint(commands, shapeCenterX, shapeCenterY, shapeCenterZ),
    [commands, shapeCenterX, shapeCenterY, shapeCenterZ]);

  const totalCommands = commands.length;
  const totalChunks = Math.ceil(totalCommands / chunkSize);

  const formatCommands = useCallback((cmds: string[]) => {
    return copyMode === "singleline" ? cmds.join("") : cmds.join("\n");
  }, [copyMode]);

  const copyAll = () => {
    navigator.clipboard.writeText(formatCommands(commands));
    toast.success(`Copied ${totalCommands} commands`);
    addRecentBuild(mode === "shape" ? activeShape.name : "Flat Grid", totalCommands);
    setRecentBuilds(getRecentBuilds());
  };

  const copyChunk = (index: number) => {
    const start = index * chunkSize;
    const chunk = commands.slice(start, start + chunkSize);
    navigator.clipboard.writeText(formatCommands(chunk));
    toast.success(`Copied chunk ${index + 1} (${chunk.length} cmds)`);
  };

  const buildFileContent = useCallback(() => {
    const lines: string[] = [];
    if (includeTeleport) {
      lines.push(`admincheat SetPlayerPos ${Math.round(teleportX)} ${Math.round(teleportY)} ${Math.round(teleportZ)}`);
    }
    lines.push(...commands);
    return lines.join("\n") + "\n";
  }, [commands, includeTeleport, teleportX, teleportY, teleportZ]);

  const downloadFile = () => {
    const defaultLabel = mode === "shape" ? activeShape.name.toLowerCase().replace(/\s+/g, "_") : `${maxX}x${maxY}`;
    const fileName = customFileName.trim() ? customFileName.trim().replace(/[^a-zA-Z0-9_\-\s]/g, "").replace(/\s+/g, "_") : `ark_tribute_${defaultLabel}`;
    const blob = new Blob([buildFileContent()], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileName}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${fileName}.txt`);
    addRecentBuild(mode === "shape" ? activeShape.name : "Flat Grid", totalCommands);
    setRecentBuilds(getRecentBuilds());
  };

  const handleSavePreset = () => {
    if (!presetName.trim()) { toast.error("Enter a preset name"); return; }
    savePreset(presetName, { mode, activeShapeName: activeShape.name, shapeCenterX, shapeCenterY, shapeCenterZ, shapeRadius, shapeStep, blueprint });
    setSavedPresets(loadPresets());
    toast.success(`Preset "${presetName}" saved`);
    setPresetName("");
  };

  const handleLoadPreset = (name: string) => {
    const p = savedPresets[name] as Record<string, unknown>;
    if (!p) return;
    if (p.activeShapeName) {
      const found = SHAPE_PRESETS.find(s => s.name === p.activeShapeName);
      if (found) { setActiveShape(found); setShapeCategory(found.category); }
    }
    if (typeof p.shapeCenterX === "number") setShapeCenterX(p.shapeCenterX);
    if (typeof p.shapeCenterY === "number") setShapeCenterY(p.shapeCenterY);
    if (typeof p.shapeCenterZ === "number") setShapeCenterZ(p.shapeCenterZ);
    if (typeof p.shapeRadius === "number") setShapeRadius(p.shapeRadius);
    if (typeof p.shapeStep === "number") setShapeStep(p.shapeStep);
    if (typeof p.blueprint === "string") setBlueprint(p.blueprint);
    setMode((p.mode as Mode) ?? "shape");
    toast.success(`Loaded preset "${name}"`);
  };

  const handleRandomizeEvent = () => {
    const events = SHAPE_PRESETS.filter(s => s.category === "events");
    const pick = events[Math.floor(Math.random() * events.length)];
    setActiveShape(pick);
    setShapeCategory("events");
    setMazeSeed(Date.now());
    setShapeCenterX(pick.centerX);
    setShapeCenterY(pick.centerY);
    setShapeCenterZ(pick.centerZ);
    setShapeRadius(pick.radius);
    setShapeStep(pick.step);
    toast.success(`Random event: ${pick.name}`);
  };

  const handleShapeSelect = (s: ShapeConfig) => {
    setActiveShape(s);
    setShapeCenterX(s.centerX);
    setShapeCenterY(s.centerY);
    setShapeCenterZ(s.centerZ);
    setShapeRadius(s.radius);
    setShapeStep(s.step);
  };

  // Render shape-specific options
  const renderShapeOptions = () => {
    const name = activeShape.name;

    if (name === "Maze") {
      return (
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">Difficulty</Label>
            <Select value={difficulty} onValueChange={(v) => setDifficulty(v as typeof difficulty)}>
              <SelectTrigger className="bg-muted border-border text-foreground text-xs mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Small (8×8)</SelectItem>
                <SelectItem value="medium">Medium (14×14)</SelectItem>
                <SelectItem value="large">Large (22×22)</SelectItem>
                <SelectItem value="brutal">Brutal (32×32)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Field label="Wall Height" value={wallHeight} onChange={setWallHeight} min={300} />
          <Field label="Wall Thickness" value={wallThickness} onChange={setWallThickness} min={1} />
          <div>
            <Label className="text-xs text-muted-foreground">Dead-End Density: {Math.round(deadEndDensity * 100)}%</Label>
            <Slider value={[deadEndDensity]} onValueChange={([v]) => setDeadEndDensity(v)} min={0} max={1} step={0.05} className="mt-1" />
          </div>
          <ToggleOption label="Floor Layer" checked={hasFloor} onChange={setHasFloor} />
          <ToggleOption label="Outer Border" checked={hasBorder} onChange={setHasBorder} />
          <ToggleOption label="Corner Towers" checked={hasCornerTowers} onChange={setHasCornerTowers} />
          <Button variant="outline" onClick={() => setMazeSeed(Date.now())} className="w-full gap-2 font-display tracking-wide text-xs">
            <RefreshCw className="w-3 h-3" /> Regenerate Maze
          </Button>
          <Field label="Seed" value={mazeSeed} onChange={setMazeSeed} />
        </div>
      );
    }

    if (name === "Obstacle Course") {
      return (
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">Path Style</Label>
            <Select value={pathStyle} onValueChange={(v) => setPathStyle(v as typeof pathStyle)}>
              <SelectTrigger className="bg-muted border-border text-foreground text-xs mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="linear">Linear</SelectItem>
                <SelectItem value="zigzag">Zig-Zag</SelectItem>
                <SelectItem value="serpentine">Serpentine</SelectItem>
                <SelectItem value="circular">Circular</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Obstacle Density: {Math.round(obstacleDensity * 100)}%</Label>
            <Slider value={[obstacleDensity]} onValueChange={([v]) => setObstacleDensity(v)} min={0.3} max={1} step={0.05} className="mt-1" />
          </div>
          <ToggleOption label="Railings" checked={hasRailings} onChange={setHasRailings} />
          <ToggleOption label="Spectator Platforms" checked={hasSpectatorPlatforms} onChange={setHasSpectatorPlatforms} />
        </div>
      );
    }

    if (name === "Tower Arena") {
      return (
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">Traversal</Label>
            <Select value={traversalStyle} onValueChange={(v) => setTraversalStyle(v as typeof traversalStyle)}>
              <SelectTrigger className="bg-muted border-border text-foreground text-xs mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="spiral">Spiral Staircase</SelectItem>
                <SelectItem value="outer">Outer Staircase</SelectItem>
                <SelectItem value="ramp">Ramp</SelectItem>
                <SelectItem value="jumpgap">Jump-Gap Floors</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Field label="Floor Count" value={floorCount} onChange={setFloorCount} min={2} />
          <ToggleOption label="Central Pillar" checked={hasCentralPillar} onChange={setHasCentralPillar} />
          <ToggleOption label="Top Battle Platform" checked={hasTopPlatform} onChange={setHasTopPlatform} />
        </div>
      );
    }

    if (name === "Colosseum") {
      return (
        <div className="space-y-3">
          <Field label="Gate Count" value={gateCount} onChange={setGateCount} min={0} />
          <ToggleOption label="VIP Platform" checked={hasVIPPlatform} onChange={setHasVIPPlatform} />
        </div>
      );
    }

    if (name === "Cage Match") {
      return (
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">Cage Size</Label>
            <Select value={cagePreset} onValueChange={(v) => setCagePreset(v as typeof cagePreset)}>
              <SelectTrigger className="bg-muted border-border text-foreground text-xs mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Small Duel</SelectItem>
                <SelectItem value="medium">Medium Team</SelectItem>
                <SelectItem value="giant">Giant Tournament</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Roof</Label>
            <Select value={roofStyle} onValueChange={(v) => setRoofStyle(v as typeof roofStyle)}>
              <SelectTrigger className="bg-muted border-border text-foreground text-xs mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open Roof</SelectItem>
                <SelectItem value="closed">Closed Roof</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <ToggleOption label="Door Openings" checked={hasDoors} onChange={setHasDoors} />
          <ToggleOption label="Corner Posts" checked={hasCornerPosts} onChange={setHasCornerPosts} />
          <ToggleOption label="Center Marker" checked={hasCenterMarker} onChange={setHasCenterMarker} />
        </div>
      );
    }

    if (name === "Sky Ring") {
      return (
        <div className="space-y-3">
          <ToggleOption label="Inner Floor Fill" checked={hasInnerFloor} onChange={setHasInnerFloor} />
          <ToggleOption label="Cross Bridges" checked={hasBridges} onChange={setHasBridges} />
          <ToggleOption label="Support Pillars" checked={hasSupportPillars} onChange={setHasSupportPillars} />
          <ToggleOption label="Railings" checked={hasRailings} onChange={setHasRailings} />
          <div className="bg-secondary/30 rounded p-2 text-xs text-muted-foreground">
            <strong className="text-neon-cyan">Plane:</strong> X + Y (horizontal) · <strong className="text-primary">Fixed axis:</strong> Z = {shapeCenterZ}
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container max-w-7xl py-4 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl tracking-widest text-primary text-glow-green">
              ARK GRID BUILDER
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Tribute terminal spawn commands · X+Y = ground · Z = height
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={mode === "grid" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("grid")}
              className="gap-2 font-display tracking-wide text-xs"
            >
              <Grid3X3 className="w-3 h-3" /> Flat Grid
            </Button>
            <Button
              variant={mode === "shape" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("shape")}
              className="gap-2 font-display tracking-wide text-xs"
            >
              <Zap className="w-3 h-3" /> 3D Structures
            </Button>
          </div>
        </div>
      </header>

      <div className="container max-w-7xl py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Panel - Controls */}
          <div className="lg:col-span-4 space-y-4">
            {mode === "shape" ? (
              <>
                {/* Category tabs */}
                <div className="card-ark p-4">
                  <Tabs value={shapeCategory} onValueChange={(v) => setShapeCategory(v as ShapeCategory)}>
                    <TabsList className="w-full bg-secondary/50">
                      <TabsTrigger value="shapes" className="font-display text-xs tracking-wide flex-1">🔷 Shapes</TabsTrigger>
                      <TabsTrigger value="arenas" className="font-display text-xs tracking-wide flex-1">🏟️ Arenas</TabsTrigger>
                      <TabsTrigger value="events" className="font-display text-xs tracking-wide flex-1">🎮 Events</TabsTrigger>
                    </TabsList>
                  </Tabs>

                  {/* Shape picker grid */}
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    {SHAPE_PRESETS.filter((s) => s.category === shapeCategory).map((s) => (
                      <button
                        key={s.name}
                        onClick={() => handleShapeSelect(s)}
                        className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-md border text-xs font-display transition-all ${
                          activeShape.name === s.name
                            ? "border-primary bg-primary/10 text-primary neon-border"
                            : "border-border bg-secondary/30 text-muted-foreground hover:border-primary/40 hover:bg-secondary/50"
                        }`}
                      >
                        <span className="text-lg">{s.icon}</span>
                        <span className="text-[10px] leading-tight text-center">{s.name}</span>
                      </button>
                    ))}
                  </div>

                  <p className="text-xs text-muted-foreground mt-2">{activeShape.description}</p>

                  {shapeCategory === "events" && (
                    <Button variant="outline" size="sm" onClick={handleRandomizeEvent} className="w-full mt-2 gap-2 font-display text-xs">
                      <Shuffle className="w-3 h-3" /> Randomize Event
                    </Button>
                  )}
                </div>

                {/* Coordinate inputs */}
                <div className="card-ark p-4 space-y-3">
                  <h3 className="font-display text-xs tracking-widest text-muted-foreground uppercase">Coordinates</h3>
                  <div className="grid grid-cols-3 gap-2">
                    <Field label="Center X" value={shapeCenterX} onChange={setShapeCenterX} />
                    <Field label="Center Y" value={shapeCenterY} onChange={setShapeCenterY} />
                    <Field label="Center Z" value={shapeCenterZ} onChange={setShapeCenterZ} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Radius" value={shapeRadius} onChange={setShapeRadius} min={100} />
                    <Field label="Step" value={shapeStep} onChange={setShapeStep} min={100} />
                  </div>
                  <Button variant="outline" size="sm" className="w-full text-[10px] font-display gap-1 mt-1" onClick={() => { setTeleportX(shapeCenterX); setTeleportY(shapeCenterY); setTeleportZ(shapeCenterZ); setIncludeTeleport(true); toast.success("Teleport synced — you'll spawn right at the structure"); }}>
                    <MapPin className="w-3 h-3" /> Spawn At My Position (sync teleport)
                  </Button>
                </div>

                {/* Shape-specific options */}
                {renderShapeOptions() && (
                  <div className="card-ark p-4 space-y-3">
                    <h3 className="font-display text-xs tracking-widest text-muted-foreground uppercase">Options</h3>
                    {renderShapeOptions()}
                  </div>
                )}

                {/* Axis Inspector */}
                <AxisInspector footprint={footprint} shapeName={activeShape.name} />
              </>
            ) : (
              <>
                <div className="card-ark p-4 space-y-3">
                  <div className="bg-primary/10 border border-primary/30 rounded p-3 text-xs">
                    <span className="font-display text-primary">✅ AXIS CONVENTION</span>
                    <p className="text-muted-foreground mt-1">X + Y = flat ground plane · Z = {gridStyle === "flat" ? "constant height" : "wall height"}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Grid Style</Label>
                    <div className="flex gap-1 mt-1">
                      <Button variant={gridStyle === "flat" ? "default" : "outline"} size="sm" onClick={() => setGridStyle("flat")} className="text-xs font-display flex-1">
                        Flat
                      </Button>
                      <Button variant={gridStyle === "walls" ? "default" : "outline"} size="sm" onClick={() => setGridStyle("walls")} className="text-xs font-display flex-1">
                        Walls
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Max X" value={maxX} onChange={setMaxX} min={100} />
                    <Field label="Max Y" value={maxY} onChange={setMaxY} min={100} />
                    <Field label="X Step" value={xStep} onChange={setXStep} min={50} />
                    <Field label="Y Step" value={yStep} onChange={setYStep} min={50} />
                  </div>
                  <Field label="Z Height" value={gridZ} onChange={setGridZ} />
                  {gridStyle === "walls" && (
                    <Field label="Wall Height" value={gridWallHeight} onChange={setGridWallHeight} min={100} />
                  )}
                </div>
              </>
            )}

            {/* Blueprint + Chunk settings */}
            <div className="card-ark p-4 space-y-3">
              <h3 className="font-display text-xs tracking-widest text-muted-foreground uppercase">Output Settings</h3>
              <div>
                <Label className="text-xs text-muted-foreground">Blueprint Path</Label>
                <Input value={blueprint} onChange={(e) => setBlueprint(e.target.value)} className="bg-muted border-border text-foreground font-mono text-xs mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Chunk Size</Label>
                <div className="flex gap-1 mt-1">
                  {CHUNK_PRESETS.map((size) => (
                    <Button key={size} variant={chunkSize === size ? "default" : "outline"} size="sm" onClick={() => setChunkSize(size)} className="text-xs font-display flex-1">
                      {size}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Copy Mode</Label>
                <div className="flex gap-1">
                  <Button variant={copyMode === "multiline" ? "default" : "outline"} size="sm" onClick={() => setCopyMode("multiline")} className="text-[10px] font-display">
                    Multi-line
                  </Button>
                  <Button variant={copyMode === "singleline" ? "default" : "outline"} size="sm" onClick={() => setCopyMode("singleline")} className="text-[10px] font-display">
                    Single-line
                  </Button>
                </div>
              </div>
            </div>

            {/* Teleport & Download */}
            <div className="card-ark p-4 space-y-3">
              <h3 className="font-display text-xs tracking-widest text-muted-foreground uppercase flex items-center gap-1.5">
                <MapPin className="w-3 h-3" /> Teleport & Download
              </h3>
              <p className="text-[10px] text-muted-foreground">Include a teleport command at the top of the file so you land exactly where you need to be before spawning.</p>
              <ToggleOption label="Include Teleport Command" checked={includeTeleport} onChange={setIncludeTeleport} />
              {includeTeleport && (
                <div className="grid grid-cols-3 gap-2">
                  <Field label="TP X" value={teleportX} onChange={setTeleportX} />
                  <Field label="TP Y" value={teleportY} onChange={setTeleportY} />
                  <Field label="TP Z" value={teleportZ} onChange={setTeleportZ} />
                </div>
              )}
              {includeTeleport && mode === "shape" && (
                <Button variant="outline" size="sm" className="w-full text-[10px] font-display gap-1" onClick={() => { setTeleportX(shapeCenterX); setTeleportY(shapeCenterY); setTeleportZ(shapeCenterZ); toast.success("Teleport set to structure center"); }}>
                  <MapPin className="w-3 h-3" /> Use Structure Center
                </Button>
              )}
              <div>
                <Label className="text-[10px] text-muted-foreground">File Name</Label>
                <Input placeholder="e.g. ice_cave_island" value={customFileName} onChange={(e) => setCustomFileName(e.target.value)} className="bg-muted border-border text-foreground text-xs mt-0.5" />
                <p className="text-[10px] text-muted-foreground mt-0.5">.txt added automatically</p>
              </div>
            </div>

            {/* Save/Load Presets */}
            <div className="card-ark p-4 space-y-3">
              <h3 className="font-display text-xs tracking-widest text-muted-foreground uppercase">Presets</h3>
              <div className="flex gap-2">
                <Input placeholder="Preset name" value={presetName} onChange={(e) => setPresetName(e.target.value)} className="bg-muted border-border text-foreground text-xs flex-1" />
                <Button variant="outline" size="sm" onClick={handleSavePreset}><Save className="w-3 h-3" /></Button>
              </div>
              {Object.keys(savedPresets).length > 0 && (
                <div className="space-y-1">
                  {Object.entries(savedPresets).map(([name]) => (
                    <div key={name} className="flex items-center justify-between bg-secondary/30 rounded px-2 py-1">
                      <button onClick={() => handleLoadPreset(name)} className="text-xs text-foreground hover:text-primary flex items-center gap-1">
                        <FolderOpen className="w-3 h-3" /> {name}
                      </button>
                      <button onClick={() => { deletePreset(name); setSavedPresets(loadPresets()); }} className="text-destructive hover:text-destructive/80">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Output */}
          <div className="lg:col-span-8 space-y-4">
            {/* Warnings */}
            <CommandWarnings count={totalCommands} />

            {/* Stats bar */}
            <div className="card-ark p-4">
              <div className="flex flex-wrap gap-4 items-center">
                {mode === "grid" ? (
                  <>
                    <Stat label="Grid" value={`${Math.floor(maxX / xStep + 1)} × ${Math.floor(maxY / yStep + 1)}`} />
                    <Stat label="Height (Z)" value={gridZ.toLocaleString()} />
                  </>
                ) : (
                  <>
                    <Stat label="Structure" value={activeShape.name} />
                    <Stat label="Footprint" value={`${footprint.width.toLocaleString()} × ${footprint.depth.toLocaleString()} × ${footprint.height.toLocaleString()}`} />
                  </>
                )}
                <Stat label="Commands" value={totalCommands.toLocaleString()} highlight={totalCommands > WARN_THRESHOLD} />
                <Stat label="Chunks" value={totalChunks.toString()} />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button onClick={copyAll} className="gap-2 font-display tracking-wide flex-1">
                <Copy className="w-4 h-4" /> Copy All
              </Button>
              <Button variant="outline" onClick={downloadFile} className="gap-2 font-display tracking-wide">
                <Download className="w-4 h-4" /> Download .txt
              </Button>
            </div>

            {/* Chunks */}
            <div className="card-ark p-4">
              <h3 className="font-display text-sm tracking-widest text-muted-foreground uppercase mb-3">Copy by Chunk</h3>
              <p className="text-xs text-muted-foreground mb-3">Paste chunks individually into ARK console to avoid overflow.</p>
              <div className="flex flex-wrap gap-1.5">
                {Array.from({ length: Math.min(totalChunks, 100) }, (_, i) => {
                  const start = i * chunkSize;
                  const end = Math.min(start + chunkSize, totalCommands);
                  return (
                    <Button key={i} variant="outline" size="sm" onClick={() => copyChunk(i)} className="text-[10px] font-body px-2 py-1">
                      {start + 1}–{end}
                    </Button>
                  );
                })}
                {totalChunks > 100 && (
                  <span className="text-xs text-muted-foreground self-center">...{totalChunks - 100} more chunks</span>
                )}
              </div>
            </div>

            {/* Preview */}
            <div className="card-ark p-4">
              <h3 className="font-display text-sm tracking-widest text-muted-foreground uppercase mb-3">Preview (first 10)</h3>
              <pre className="bg-secondary/30 rounded p-3 text-xs font-mono text-foreground/80 overflow-x-auto whitespace-pre-wrap break-all">
                {commands.slice(0, 10).join("\n")}
                {totalCommands > 10 && `\n... and ${totalCommands - 10} more`}
              </pre>
            </div>

            {/* Recent Builds */}
            {recentBuilds.length > 0 && (
              <div className="card-ark p-4">
                <h3 className="font-display text-sm tracking-widest text-muted-foreground uppercase mb-3">Recent Builds</h3>
                <div className="space-y-1">
                  {recentBuilds.slice(0, 8).map((b, i) => (
                    <div key={i} className="flex items-center justify-between text-xs bg-secondary/20 rounded px-3 py-1.5">
                      <span className="text-foreground font-display">{b.name}</span>
                      <span className="text-muted-foreground">{b.commands.toLocaleString()} cmds · {new Date(b.time).toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Help text */}
            <div className="card-ark p-4">
              <h3 className="font-display text-sm tracking-widest text-muted-foreground uppercase mb-2">How ARK Coordinates Work</h3>
              <div className="text-xs text-muted-foreground space-y-1.5">
                <p><strong className="text-neon-cyan">X</strong> = horizontal (left/right) · <strong className="text-neon-orange">Y</strong> = horizontal (forward/back) · <strong className="text-primary">Z</strong> = vertical (height)</p>
                <p>The <strong>ground plane</strong> is always X + Y. Height is always Z. All structures are centered around the specified center point.</p>
                <p>Use <strong>Step</strong> to control density — smaller step = more commands but finer detail. Use <strong>Radius</strong> to control overall size.</p>
                <p>When pasting into the ARK console, paste one chunk at a time. Each command ends with <code className="text-foreground">|</code> as a delimiter.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Sub-components ---

const Field = ({ label, value, onChange, min = 0 }: { label: string; value: number; onChange: (v: number) => void; min?: number }) => (
  <div>
    <Label className="text-[10px] text-muted-foreground">{label}</Label>
    <Input type="number" min={min} value={value} onChange={(e) => onChange(Number(e.target.value))} className="bg-muted border-border text-foreground text-xs mt-0.5" />
  </div>
);

const Stat = ({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) => (
  <div className="flex flex-col">
    <span className="text-[10px] text-muted-foreground font-display uppercase tracking-wider">{label}</span>
    <span className={`text-sm font-display ${highlight ? "text-destructive animate-pulse-glow" : "text-foreground"}`}>{value}</span>
  </div>
);

const ToggleOption = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) => (
  <div className="flex items-center justify-between">
    <Label className="text-xs text-muted-foreground">{label}</Label>
    <Switch checked={checked} onCheckedChange={onChange} />
  </div>
);

export default Index;
