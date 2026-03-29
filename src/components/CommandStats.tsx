import { useMemo } from "react";
import { Footprint } from "@/lib/generatorHelpers";

interface CommandStatsProps {
  commands: string[];
  footprint: Footprint;
  chunkSize: number;
}

export default function CommandStats({ commands, footprint, chunkSize }: CommandStatsProps) {
  const stats = useMemo(() => {
    if (commands.length === 0) return null;
    const total = commands.length;
    const chunks = Math.ceil(total / chunkSize);
    const volume = footprint.width * footprint.depth * footprint.height;
    const density = volume > 0 ? (total / (volume / 1e9)).toFixed(1) : "N/A";
    const uniqueBps = new Set(commands.map(c => c.split(" ")[2])).size;
    const estBytes = commands.reduce((s, c) => s + c.length, 0);
    const estKB = (estBytes / 1024).toFixed(1);

    return { total, chunks, density, uniqueBps, estKB, volume };
  }, [commands, footprint, chunkSize]);

  if (!stats) return null;

  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
      {[
        { label: "Commands", value: stats.total.toLocaleString(), color: "text-primary" },
        { label: "Chunks", value: stats.chunks.toString(), color: "text-neon-cyan" },
        { label: "Blueprints", value: stats.uniqueBps.toString(), color: "text-accent" },
        { label: "Density", value: stats.density, color: "text-neon-purple" },
        { label: "File Size", value: `${stats.estKB} KB`, color: "text-neon-orange" },
        { label: "Dimensions", value: `${(footprint.width/100).toFixed(0)}×${(footprint.depth/100).toFixed(0)}×${(footprint.height/100).toFixed(0)}`, color: "text-foreground" },
      ].map(s => (
        <div key={s.label} className="bg-secondary/20 rounded-lg p-2 text-center">
          <div className={`text-sm font-display ${s.color}`}>{s.value}</div>
          <div className="text-[9px] text-muted-foreground uppercase tracking-wider font-display">{s.label}</div>
        </div>
      ))}
    </div>
  );
}
