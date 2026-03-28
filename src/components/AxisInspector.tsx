import { Footprint } from "@/lib/generatorHelpers";

interface AxisInspectorProps {
  footprint: Footprint;
  shapeName: string;
}

const AxisInspector = ({ footprint, shapeName }: AxisInspectorProps) => {
  return (
    <div className="card-ark p-4 space-y-3">
      <h3 className="font-display text-sm tracking-widest text-primary uppercase">
        Axis Inspector
      </h3>

      {/* Mini coordinate diagram */}
      <div className="flex items-center gap-4">
        <div className="relative w-16 h-16 border border-border rounded">
          {/* XY plane */}
          <div className="absolute bottom-1 left-1 text-[10px] font-display text-neon-cyan">X→</div>
          <div className="absolute top-1 left-1 text-[10px] font-display text-neon-orange">Y↑</div>
          <div className="absolute top-1 right-1 text-[10px] font-display text-primary">Z⬆</div>
          {/* Grid lines */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 64 64">
            <line x1="8" y1="56" x2="56" y2="56" stroke="hsl(185 80% 50% / 0.4)" strokeWidth="1" />
            <line x1="8" y1="56" x2="8" y2="8" stroke="hsl(30 90% 55% / 0.4)" strokeWidth="1" />
            <line x1="8" y1="56" x2="8" y2="20" stroke="hsl(145 70% 45% / 0.4)" strokeWidth="1" strokeDasharray="3 2" />
            <circle cx="32" cy="36" r="3" fill="hsl(145 70% 45% / 0.6)" />
          </svg>
        </div>
        <div className="space-y-1 text-xs">
          <div className="flex gap-2">
            <span className="text-muted-foreground">Plane:</span>
            <span className="font-display text-neon-cyan">{footprint.planeAxes}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-muted-foreground">Height:</span>
            <span className="font-display text-primary">{footprint.heightAxis}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-muted-foreground">Center:</span>
            <span className="font-mono text-foreground">{footprint.centerPoint}</span>
          </div>
        </div>
      </div>

      {/* Footprint stats */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-secondary/50 rounded p-2">
          <span className="text-muted-foreground block">Width (X)</span>
          <span className="font-display text-foreground">{footprint.width.toLocaleString()}</span>
        </div>
        <div className="bg-secondary/50 rounded p-2">
          <span className="text-muted-foreground block">Depth (Y)</span>
          <span className="font-display text-foreground">{footprint.depth.toLocaleString()}</span>
        </div>
        <div className="bg-secondary/50 rounded p-2">
          <span className="text-muted-foreground block">Height (Z)</span>
          <span className="font-display text-foreground">{footprint.height.toLocaleString()}</span>
        </div>
        <div className="bg-secondary/50 rounded p-2">
          <span className="text-muted-foreground block">Commands</span>
          <span className="font-display text-foreground">{footprint.totalCommands.toLocaleString()}</span>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground leading-tight">
        <strong>{shapeName}</strong> is centered around ({footprint.centerPoint}).
        Ground plane uses X + Y axes. Z controls vertical height.
      </p>
    </div>
  );
};

export default AxisInspector;
