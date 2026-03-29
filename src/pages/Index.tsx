import { useState, useMemo, useCallback, useEffect, lazy, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, Download, Grid3X3, Zap, RefreshCw, Save, FolderOpen, Shuffle, Trash2, MapPin, Eye, EyeOff, ChevronDown, ChevronUp, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { SHAPE_PRESETS, generateShape, ShapeConfig, ShapeCategory } from "@/lib/shapeGenerators";
import { computeFootprint, WARN_THRESHOLD, MAX_COMMANDS } from "@/lib/generatorHelpers";
import AxisInspector from "@/components/AxisInspector";
import CommandWarnings from "@/components/CommandWarnings";
import BlueprintLibrary from "@/components/BlueprintLibrary";
import CommandStats from "@/components/CommandStats";
import ShareConfig, { decodeConfig } from "@/components/ShareConfig";
import KeyboardShortcuts from "@/components/KeyboardShortcuts";

const Preview3D = lazy(() => import("@/components/Preview3D"));

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
  
  // UI state
  const [show3D, setShow3D] = useState(true);
  const [showBPLibrary, setShowBPLibrary] = useState(false);
  const [showStats, setShowStats] = useState(true);
  const [showPreview, setShowPreview] = useState(true);
  const [copiedChunks, setCopiedChunks] = useState<Set<number>>(new Set());

  // Presets
  const [presetName, setPresetName] = useState("");
  const [savedPresets, setSavedPresets] = useState(loadPresets);
  const [recentBuilds, setRecentBuilds] = useState(getRecentBuilds);

  // Load config from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const configStr = params.get("config");
    if (configStr) {
      const cfg = decodeConfig(configStr);
      if (cfg) {
        if (cfg.activeShapeName) {
          const found = SHAPE_PRESETS.find(s => s.name === cfg.activeShapeName);
          if (found) { setActiveShape(found); setShapeCategory(found.category); }
        }
        if (typeof cfg.shapeCenterX === "number") setShapeCenterX(cfg.shapeCenterX);
        if (typeof cfg.shapeCenterY === "number") setShapeCenterY(cfg.shapeCenterY);
        if (typeof cfg.shapeCenterZ === "number") setShapeCenterZ(cfg.shapeCenterZ);
        if (typeof cfg.shapeRadius === "number") setShapeRadius(cfg.shapeRadius);
        if (typeof cfg.shapeStep === "number") setShapeStep(cfg.shapeStep);
        if (typeof cfg.blueprint === "string") setBlueprint(cfg.blueprint);
        toast.success("Config loaded from shared link!");
        // Clean URL
        window.history.replaceState({}, "", window.location.pathname);
      }
    }
  }, []);

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
      for (let x = 0; x <= maxX; x += xStep) {
        for (let y = 0; y <= maxY; y += yStep) {
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

  const copyAll = useCallback(() => {
    navigator.clipboard.writeText(formatCommands(commands));
    toast.success(`Copied ${totalCommands} commands`);
    addRecentBuild(mode === "shape" ? activeShape.name : "Flat Grid", totalCommands);
    setRecentBuilds(getRecentBuilds());
    setCopiedChunks(new Set());
  }, [commands, formatCommands, totalCommands, mode, activeShape.name]);

  const copyChunk = (index: number) => {
    const start = index * chunkSize;
    const chunk = commands.slice(start, start + chunkSize);
    navigator.clipboard.writeText(formatCommands(chunk));
    toast.success(`Copied chunk ${index + 1} (${chunk.length} cmds)`);
    setCopiedChunks(prev => new Set([...prev, index]));
  };

  const buildFileContent = useCallback(() => {
    const lines: string[] = [];
    if (includeTeleport) {
      lines.push(`admincheat SetPlayerPos ${Math.round(teleportX)} ${Math.round(teleportY)} ${Math.round(teleportZ)}`);
    }
    lines.push(...commands);
    return lines.join("\n") + "\n";
  }, [commands, includeTeleport, teleportX, teleportY, teleportZ]);

  const downloadFile = useCallback(() => {
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
  }, [mode, activeShape.name, maxX, maxY, customFileName, buildFileContent, totalCommands]);

  const handleSavePreset = useCallback(() => {
    if (!presetName.trim()) { toast.error("Enter a preset name"); return; }
    savePreset(presetName, { mode, activeShapeName: activeShape.name, shapeCenterX, shapeCenterY, shapeCenterZ, shapeRadius, shapeStep, blueprint });
    setSavedPresets(loadPresets());
    toast.success(`Preset "${presetName}" saved`);
    setPresetName("");
  }, [presetName, mode, activeShape.name, shapeCenterX, shapeCenterY, shapeCenterZ, shapeRadius, shapeStep, blueprint]);

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

  const handleRandomizeEvent = useCallback(() => {
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
  }, []);

  const handleShapeSelect = (s: ShapeConfig) => {
    setActiveShape(s);
    setShapeCenterX(s.centerX);
    setShapeCenterY(s.centerY);
    setShapeCenterZ(s.centerZ);
    setShapeRadius(s.radius);
    setShapeStep(s.step);
    setCopiedChunks(new Set());
  };

  const shareConfig = useMemo(() => ({
    activeShapeName: activeShape.name,
    shapeCenterX, shapeCenterY, shapeCenterZ,
    shapeRadius, shapeStep, blueprint,
  }), [activeShape.name, shapeCenterX, shapeCenterY, shapeCenterZ, shapeRadius, shapeStep, blueprint]);

  // Chunk progress
  const chunkProgress = totalChunks > 0 ? (copiedChunks.size / totalChunks) * 100 : 0;

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

    if (name === "Obstacle Course" || name === "Gauntlet") {
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

    if (name === "Lava Run" || name === "Parkour Tower" || name === "Dropper Tower") {
      return (
        <div className="space-y-3">
          <Button variant="outline" onClick={() => setMazeSeed(Date.now())} className="w-full gap-2 font-display tracking-wide text-xs">
            <RefreshCw className="w-3 h-3" /> Regenerate Layout
          </Button>
          <Field label="Seed" value={mazeSeed} onChange={setMazeSeed} />
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Animated Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-neon-cyan/5 pointer-events-none" />
        <div className="container max-w-7xl py-4 flex items-center justify-between relative">
          <div>
            <h1 className="font-display text-2xl md:text-3xl tracking-widest text-primary text-glow-green flex items-center gap-3">
              <span className="text-3xl animate-pulse-glow">⚡</span>
              ARK ARENA ARCHITECT
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Build insane structures · {SHAPE_PRESETS.length} presets · X+Y = ground · Z = height
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={mode === "grid" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("grid")}
              className="gap-2 font-display tracking-wide text-xs"
            >
              <Grid3X3 className="w-3 h-3" /> Grid
            </Button>
            <Button
              variant={mode === "shape" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("shape")}
              className="gap-2 font-display tracking-wide text-xs"
            >
              <Zap className="w-3 h-3" /> Structures
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
                  <div className="grid grid-cols-3 gap-2 mt-3 max-h-64 overflow-y-auto pr-1">
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
                  <Button variant="outline" size="sm" className="w-full text-[10px] font-display gap-1 mt-1" onClick={() => { setTeleportX(shapeCenterX); setTeleportY(shapeCenterY); setTeleportZ(shapeCenterZ); setIncludeTeleport(true); toast.success("Teleport synced"); }}>
                    <MapPin className="w-3 h-3" /> Sync Teleport to Structure
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

            {/* Blueprint Library */}
            <div className="card-ark p-4 space-y-3">
              <button
                onClick={() => setShowBPLibrary(!showBPLibrary)}
                className="flex items-center justify-between w-full"
              >
                <h3 className="font-display text-xs tracking-widest text-muted-foreground uppercase">Blueprint Library</h3>
                {showBPLibrary ? <ChevronUp className="w-3 h-3 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
              </button>
              {showBPLibrary ? (
                <BlueprintLibrary value={blueprint} onChange={setBlueprint} />
              ) : (
                <div>
                  <Label className="text-[10px] text-muted-foreground">Blueprint Path</Label>
                  <Input value={blueprint} onChange={(e) => setBlueprint(e.target.value)} className="bg-muted border-border text-foreground font-mono text-[10px] mt-0.5" />
                </div>
              )}
            </div>

            {/* Output Settings */}
            <div className="card-ark p-4 space-y-3">
              <h3 className="font-display text-xs tracking-widest text-muted-foreground uppercase">Output Settings</h3>
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
                    Multi
                  </Button>
                  <Button variant={copyMode === "singleline" ? "default" : "outline"} size="sm" onClick={() => setCopyMode("singleline")} className="text-[10px] font-display">
                    Single
                  </Button>
                </div>
              </div>
            </div>

            {/* Teleport & Download */}
            <div className="card-ark p-4 space-y-3">
              <h3 className="font-display text-xs tracking-widest text-muted-foreground uppercase flex items-center gap-1.5">
                <MapPin className="w-3 h-3" /> Teleport & Download
              </h3>
              <ToggleOption label="Include Teleport Command" checked={includeTeleport} onChange={setIncludeTeleport} />
              {includeTeleport && (
                <div className="grid grid-cols-3 gap-2">
                  <Field label="TP X" value={teleportX} onChange={setTeleportX} />
                  <Field label="TP Y" value={teleportY} onChange={setTeleportY} />
                  <Field label="TP Z" value={teleportZ} onChange={setTeleportZ} />
                </div>
              )}
              <div>
                <Label className="text-[10px] text-muted-foreground">File Name</Label>
                <Input placeholder="e.g. ice_cave_island" value={customFileName} onChange={(e) => setCustomFileName(e.target.value)} className="bg-muted border-border text-foreground text-xs mt-0.5" />
              </div>
            </div>

            {/* Share */}
            <div className="card-ark p-4 space-y-3">
              <h3 className="font-display text-xs tracking-widest text-muted-foreground uppercase">Share & Export</h3>
              <ShareConfig config={shareConfig} />
            </div>

            {/* Presets */}
            <div className="card-ark p-4 space-y-3">
              <h3 className="font-display text-xs tracking-widest text-muted-foreground uppercase">Presets</h3>
              <div className="flex gap-2">
                <Input placeholder="Preset name" value={presetName} onChange={(e) => setPresetName(e.target.value)} className="bg-muted border-border text-foreground text-xs flex-1" />
                <Button variant="outline" size="sm" onClick={handleSavePreset}><Save className="w-3 h-3" /></Button>
              </div>
              {Object.keys(savedPresets).length > 0 && (
                <div className="space-y-1 max-h-32 overflow-y-auto">
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

            {/* 3D Preview */}
            <div className="card-ark p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display text-sm tracking-widest text-muted-foreground uppercase flex items-center gap-2">
                  <span className="text-primary">◆</span> 3D Preview
                </h3>
                <Button variant="ghost" size="sm" onClick={() => setShow3D(!show3D)} className="text-[10px] gap-1">
                  {show3D ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  {show3D ? "Hide" : "Show"}
                </Button>
              </div>
              {show3D && (
                <Suspense fallback={<div className="w-full h-72 bg-secondary/30 rounded-lg flex items-center justify-center"><span className="text-xs text-muted-foreground font-display animate-pulse">Loading 3D engine...</span></div>}>
                  <Preview3D commands={commands} maxPoints={8000} />
                </Suspense>
              )}
            </div>

            {/* Stats */}
            <div className="card-ark p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display text-sm tracking-widest text-muted-foreground uppercase flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-neon-cyan" /> Statistics
                </h3>
                <Button variant="ghost" size="sm" onClick={() => setShowStats(!showStats)} className="text-[10px] gap-1">
                  {showStats ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </Button>
              </div>
              {showStats && <CommandStats commands={commands} footprint={footprint} chunkSize={chunkSize} />}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button onClick={copyAll} className="gap-2 font-display tracking-wide flex-1 glow-primary">
                <Copy className="w-4 h-4" /> Copy All ({totalCommands.toLocaleString()})
              </Button>
              <Button variant="outline" onClick={downloadFile} className="gap-2 font-display tracking-wide">
                <Download className="w-4 h-4" /> Download .txt
              </Button>
            </div>

            {/* Chunk Progress Bar */}
            {totalChunks > 1 && (
              <div className="card-ark p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-display text-sm tracking-widest text-muted-foreground uppercase">Paste Progress</h3>
                  <span className="text-xs text-muted-foreground font-display">
                    {copiedChunks.size}/{totalChunks} chunks · {Math.round(chunkProgress)}%
                  </span>
                </div>
                <div className="w-full bg-secondary/50 rounded-full h-2 mb-3 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-neon-cyan rounded-full transition-all duration-300"
                    style={{ width: `${chunkProgress}%` }}
                  />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {Array.from({ length: Math.min(totalChunks, 100) }, (_, i) => {
                    const start = i * chunkSize;
                    const end = Math.min(start + chunkSize, totalCommands);
                    const isCopied = copiedChunks.has(i);
                    return (
                      <Button
                        key={i}
                        variant={isCopied ? "default" : "outline"}
                        size="sm"
                        onClick={() => copyChunk(i)}
                        className={`text-[10px] font-body px-2 py-1 ${isCopied ? "bg-primary/20 border-primary text-primary" : ""}`}
                      >
                        {isCopied ? "✓" : ""} {start + 1}–{end}
                      </Button>
                    );
                  })}
                  {totalChunks > 100 && (
                    <span className="text-xs text-muted-foreground self-center">...{totalChunks - 100} more</span>
                  )}
                </div>
              </div>
            )}

            {/* Command Preview */}
            <div className="card-ark p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display text-sm tracking-widest text-muted-foreground uppercase">Command Preview</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowPreview(!showPreview)} className="text-[10px] gap-1">
                  {showPreview ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </Button>
              </div>
              {showPreview && (
                <pre className="bg-secondary/30 rounded p-3 text-xs font-mono text-foreground/80 overflow-x-auto whitespace-pre-wrap break-all max-h-48 overflow-y-auto">
                  {commands.slice(0, 15).join("\n")}
                  {totalCommands > 15 && `\n... and ${totalCommands - 15} more`}
                </pre>
              )}
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

            {/* Help */}
            <div className="card-ark p-4">
              <h3 className="font-display text-sm tracking-widest text-muted-foreground uppercase mb-2">How ARK Coordinates Work</h3>
              <div className="text-xs text-muted-foreground space-y-1.5">
                <p><strong className="text-neon-cyan">X</strong> = horizontal (left/right) · <strong className="text-accent">Y</strong> = horizontal (forward/back) · <strong className="text-primary">Z</strong> = vertical (height)</p>
                <p>The <strong>ground plane</strong> is always X + Y. Height is always Z. All structures are centered around the specified center point.</p>
                <p>Use <strong>Step</strong> to control density — smaller step = more commands but finer detail. Use <strong>Radius</strong> to control overall size.</p>
                <p>Press <kbd className="bg-secondary text-foreground px-1 rounded text-[10px] font-mono">?</kbd> for keyboard shortcuts.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts */}
      <KeyboardShortcuts
        onCopyAll={copyAll}
        onDownload={downloadFile}
        onSavePreset={handleSavePreset}
        onRandomize={handleRandomizeEvent}
        onSetMode={setMode}
      />
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
