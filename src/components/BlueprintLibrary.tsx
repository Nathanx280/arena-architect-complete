import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star, Search } from "lucide-react";
import { toast } from "sonner";

export interface BlueprintEntry {
  name: string;
  path: string;
  category: string;
}

const BLUEPRINT_LIBRARY: BlueprintEntry[] = [
  // Structures
  { name: "Tribute Terminal", path: `"Blueprint'/Game/PrimalEarth/Structures/TributeTerminal_Base.TributeTerminal_Base'"`, category: "Structures" },
  { name: "Metal Foundation", path: `"Blueprint'/Game/PrimalEarth/Structures/Metal/Floors/MetalFloor.MetalFloor'"`, category: "Structures" },
  { name: "Metal Wall", path: `"Blueprint'/Game/PrimalEarth/Structures/Metal/Walls/MetalWall.MetalWall'"`, category: "Structures" },
  { name: "Metal Ceiling", path: `"Blueprint'/Game/PrimalEarth/Structures/Metal/Ceilings/MetalCeiling.MetalCeiling'"`, category: "Structures" },
  { name: "Metal Pillar", path: `"Blueprint'/Game/PrimalEarth/Structures/Metal/Pillars/MetalPillar.MetalPillar'"`, category: "Structures" },
  { name: "Metal Ramp", path: `"Blueprint'/Game/PrimalEarth/Structures/Metal/Ramps/MetalRamp.MetalRamp'"`, category: "Structures" },
  { name: "Stone Foundation", path: `"Blueprint'/Game/PrimalEarth/Structures/Stone/Floors/StoneFloor.StoneFloor'"`, category: "Structures" },
  { name: "Stone Wall", path: `"Blueprint'/Game/PrimalEarth/Structures/Stone/Walls/StoneWall.StoneWall'"`, category: "Structures" },
  { name: "Thatch Foundation", path: `"Blueprint'/Game/PrimalEarth/Structures/Thatch/Floors/ThatchFloor.ThatchFloor'"`, category: "Structures" },
  { name: "Wood Foundation", path: `"Blueprint'/Game/PrimalEarth/Structures/Wood/Floors/WoodFloor.WoodFloor'"`, category: "Structures" },
  // Tek
  { name: "Tek Foundation", path: `"Blueprint'/Game/PrimalEarth/Structures/Tek/TekFloor.TekFloor'"`, category: "Tek" },
  { name: "Tek Wall", path: `"Blueprint'/Game/PrimalEarth/Structures/Tek/TekWall.TekWall'"`, category: "Tek" },
  { name: "Tek Ceiling", path: `"Blueprint'/Game/PrimalEarth/Structures/Tek/TekCeiling.TekCeiling'"`, category: "Tek" },
  { name: "Tek Forcefield", path: `"Blueprint'/Game/PrimalEarth/Structures/Tek/TekShieldGenerator.TekShieldGenerator'"`, category: "Tek" },
  { name: "Tek Teleporter", path: `"Blueprint'/Game/PrimalEarth/Structures/Tek/TekTeleporter.TekTeleporter'"`, category: "Tek" },
  { name: "Tek Light", path: `"Blueprint'/Game/PrimalEarth/Structures/Tek/TekLight.TekLight'"`, category: "Tek" },
  // Misc
  { name: "Campfire", path: `"Blueprint'/Game/PrimalEarth/Structures/Campfire.Campfire'"`, category: "Misc" },
  { name: "Standing Torch", path: `"Blueprint'/Game/PrimalEarth/Structures/StandingTorch.StandingTorch'"`, category: "Misc" },
  { name: "Storage Box", path: `"Blueprint'/Game/PrimalEarth/Structures/StorageBox_Small.StorageBox_Small'"`, category: "Misc" },
  { name: "Sleeping Bag", path: `"Blueprint'/Game/PrimalEarth/Structures/SleepingBag.SleepingBag'"`, category: "Misc" },
  { name: "Smithy", path: `"Blueprint'/Game/PrimalEarth/Structures/Smithy.Smithy'"`, category: "Misc" },
  // Decorative
  { name: "Flag", path: `"Blueprint'/Game/PrimalEarth/Structures/Flag.Flag'"`, category: "Decorative" },
  { name: "Trophy Base", path: `"Blueprint'/Game/PrimalEarth/Structures/TrophyBase.TrophyBase'"`, category: "Decorative" },
  { name: "War Map", path: `"Blueprint'/Game/PrimalEarth/Structures/WarMap.WarMap'"`, category: "Decorative" },
  // Dinos
  { name: "Rex", path: `"Blueprint'/Game/PrimalEarth/Dinos/Rex/Rex_Character_BP.Rex_Character_BP'"`, category: "Dinos" },
  { name: "Raptor", path: `"Blueprint'/Game/PrimalEarth/Dinos/Raptor/Raptor_Character_BP.Raptor_Character_BP'"`, category: "Dinos" },
  { name: "Dodo", path: `"Blueprint'/Game/PrimalEarth/Dinos/Dodo/Dodo_Character_BP.Dodo_Character_BP'"`, category: "Dinos" },
];

const CATEGORIES = [...new Set(BLUEPRINT_LIBRARY.map(b => b.category))];

interface BlueprintLibraryProps {
  value: string;
  onChange: (bp: string) => void;
}

export default function BlueprintLibrary({ value, onChange }: BlueprintLibraryProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [favorites, setFavorites] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("ark_bp_favs") || "[]"); } catch { return []; }
  });

  const toggleFav = (path: string) => {
    const next = favorites.includes(path) ? favorites.filter(f => f !== path) : [...favorites, path];
    setFavorites(next);
    localStorage.setItem("ark_bp_favs", JSON.stringify(next));
  };

  const filtered = BLUEPRINT_LIBRARY.filter(b => {
    if (category !== "all" && category !== "favorites" && b.category !== category) return false;
    if (category === "favorites" && !favorites.includes(b.path)) return false;
    if (search && !b.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-2">
      <div className="flex gap-1.5">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
          <Input
            placeholder="Search blueprints..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-muted border-border text-foreground text-xs pl-7 h-8"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="bg-muted border-border text-foreground text-xs w-28 h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="favorites">⭐ Favs</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="max-h-32 overflow-y-auto space-y-0.5 scrollbar-thin">
        {filtered.map(b => (
          <div
            key={b.name}
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs cursor-pointer transition-colors ${
              value === b.path ? "bg-primary/15 text-primary border border-primary/30" : "bg-secondary/20 text-foreground hover:bg-secondary/40"
            }`}
            onClick={() => { onChange(b.path); toast.success(`Blueprint: ${b.name}`); }}
          >
            <button onClick={(e) => { e.stopPropagation(); toggleFav(b.path); }} className="shrink-0">
              <Star className={`w-3 h-3 ${favorites.includes(b.path) ? "fill-accent text-accent" : "text-muted-foreground"}`} />
            </button>
            <span className="font-display truncate">{b.name}</span>
            <span className="text-[9px] text-muted-foreground ml-auto shrink-0">{b.category}</span>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">No blueprints found</p>}
      </div>
      <div>
        <Label className="text-[10px] text-muted-foreground">Custom Blueprint Path</Label>
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="bg-muted border-border text-foreground font-mono text-[10px] mt-0.5" />
      </div>
    </div>
  );
}
