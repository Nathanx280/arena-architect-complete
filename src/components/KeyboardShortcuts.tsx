import { useEffect, useState } from "react";
import { Keyboard } from "lucide-react";

const SHORTCUTS = [
  { keys: "Ctrl+C", action: "Copy all commands" },
  { keys: "Ctrl+D", action: "Download .txt file" },
  { keys: "Ctrl+S", action: "Save preset" },
  { keys: "Ctrl+R", action: "Randomize event" },
  { keys: "1", action: "Switch to Grid mode" },
  { keys: "2", action: "Switch to Shape mode" },
  { keys: "?", action: "Toggle shortcuts panel" },
];

interface KeyboardShortcutsProps {
  onCopyAll: () => void;
  onDownload: () => void;
  onSavePreset: () => void;
  onRandomize: () => void;
  onSetMode: (mode: "grid" | "shape") => void;
}

export default function KeyboardShortcuts({ onCopyAll, onDownload, onSavePreset, onRandomize, onSetMode }: KeyboardShortcutsProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

      if (e.key === "?") { setShow(s => !s); return; }
      if (e.key === "1") { onSetMode("grid"); return; }
      if (e.key === "2") { onSetMode("shape"); return; }
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "c") { e.preventDefault(); onCopyAll(); }
        if (e.key === "d") { e.preventDefault(); onDownload(); }
        if (e.key === "s") { e.preventDefault(); onSavePreset(); }
        if (e.key === "r") { e.preventDefault(); onRandomize(); }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onCopyAll, onDownload, onSavePreset, onRandomize, onSetMode]);

  return (
    <>
      <button
        onClick={() => setShow(s => !s)}
        className="fixed bottom-4 right-4 z-50 bg-card border border-border rounded-lg p-2 hover:bg-secondary/50 transition-colors shadow-lg"
        title="Keyboard shortcuts (?)"
      >
        <Keyboard className="w-4 h-4 text-primary" />
      </button>
      {show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm" onClick={() => setShow(false)}>
          <div className="bg-card border border-border rounded-xl p-6 max-w-sm w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-sm tracking-widest text-primary mb-4">KEYBOARD SHORTCUTS</h3>
            <div className="space-y-2">
              {SHORTCUTS.map(s => (
                <div key={s.keys} className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{s.action}</span>
                  <kbd className="bg-secondary text-foreground text-[10px] font-mono px-2 py-0.5 rounded border border-border">{s.keys}</kbd>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-4 text-center">Press ? to toggle this panel</p>
          </div>
        </div>
      )}
    </>
  );
}
