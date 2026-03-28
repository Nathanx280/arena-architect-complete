import { WARN_THRESHOLD, ARK_PASTE_SAFE } from "@/lib/generatorHelpers";

interface CommandWarningsProps {
  count: number;
}

const CommandWarnings = ({ count }: CommandWarningsProps) => {
  if (count === 0) return null;

  const isAbovePaste = count > ARK_PASTE_SAFE;
  const isAboveWarn = count > WARN_THRESHOLD;

  if (!isAbovePaste && !isAboveWarn) return null;

  return (
    <div className="space-y-2">
      {isAboveWarn && (
        <div className="flex items-center gap-2 rounded border border-destructive/50 bg-destructive/10 p-2 text-xs">
          <span className="text-destructive font-display">⚠ HIGH</span>
          <span className="text-destructive/80">
            {count.toLocaleString()} commands — may freeze browser or hit ARK limits. Reduce radius or increase step.
          </span>
        </div>
      )}
      {isAbovePaste && !isAboveWarn && (
        <div className="flex items-center gap-2 rounded border border-accent/50 bg-accent/10 p-2 text-xs">
          <span className="text-accent font-display">⚡ LARGE</span>
          <span className="text-accent/80">
            {count.toLocaleString()} commands — use chunk copy to avoid ARK console overflow.
          </span>
        </div>
      )}
    </div>
  );
};

export default CommandWarnings;
