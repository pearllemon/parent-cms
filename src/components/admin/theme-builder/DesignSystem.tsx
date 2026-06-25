import { Paintbrush, Type, Palette, Box, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

const colorTokens = [
  { name: "Pearl Black", value: "#0A0A0A", token: "--pearl-black" },
  { name: "Pearl Gold", value: "#FFCC39", token: "--pearl-gold" },
  { name: "Pearl Light", value: "#F8F8F8", token: "--pearl-light" },
  { name: "Pearl Gold Muted", value: "#FFCB002E", token: "--pearl-gold-muted" },
  { name: "Pearl White", value: "#FFFFFF", token: "--pearl-white" },
  { name: "Success", value: "#22C55E", token: "--pearl-success" },
  { name: "Warning", value: "#F59E0B", token: "--pearl-warning" },
  { name: "Info", value: "#3B82F6", token: "--pearl-info" },
];

const fontWeights = [
  { weight: 300, label: "Light" },
  { weight: 400, label: "Regular" },
  { weight: 500, label: "Medium" },
  { weight: 600, label: "SemiBold" },
  { weight: 700, label: "Bold" },
  { weight: 800, label: "ExtraBold" },
];

const DesignSystem = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Color Tokens */}
      <div className="pearl-card p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Global Color Tokens</h3>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm"><RotateCcw className="w-3 h-3 mr-1" /> History</Button>
            <Button variant="pearl" size="sm">Push to All Sites</Button>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {colorTokens.map((color) => (
            <div key={color.token} className="group">
              <div
                className="w-full h-16 rounded-lg border border-border mb-2 cursor-pointer group-hover:ring-2 group-hover:ring-ring transition-all"
                style={{ backgroundColor: color.value }}
              />
              <p className="text-xs font-medium text-foreground">{color.name}</p>
              <p className="text-[10px] text-muted-foreground font-mono">{color.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Typography */}
      <div className="pearl-card p-6">
        <div className="flex items-center gap-2 mb-5">
          <Type className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Typography — Poppins</h3>
        </div>
        <div className="space-y-4">
          {fontWeights.map((f) => (
            <div key={f.weight} className="flex items-baseline justify-between border-b border-border pb-3 last:border-0">
              <p style={{ fontWeight: f.weight }} className="text-lg text-foreground">
                The quick brown fox jumps over the lazy dog
              </p>
              <span className="text-[10px] text-muted-foreground ml-4 flex-shrink-0">
                {f.label} ({f.weight})
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Components Preview */}
      <div className="pearl-card p-6">
        <div className="flex items-center gap-2 mb-5">
          <Box className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Component Variants</h3>
        </div>
        <div className="space-y-4">
          <div>
            <p className="text-xs text-muted-foreground mb-2">Buttons</p>
            <div className="flex flex-wrap gap-3">
              <Button variant="pearl">Primary CTA</Button>
              <Button variant="pearl-outline">Secondary CTA</Button>
              <Button variant="pearl-dark">Dark Button</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-2">Status Badges</p>
            <div className="flex flex-wrap gap-2">
              {["Live", "Staging", "Maintenance", "Draft"].map((s) => (
                <span key={s} className="text-[10px] font-semibold uppercase px-3 py-1 rounded-full bg-muted text-muted-foreground">
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Per-Site Overrides */}
      <div className="pearl-card p-6">
        <div className="flex items-center gap-2 mb-5">
          <Paintbrush className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Per-Site Overrides</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Individual sites can override global tokens. Overridden values are flagged and can be reverted at any time.
        </p>
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full">
            <thead>
              <tr className="bg-muted">
                <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-4 py-2">Site</th>
                <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-4 py-2">Overrides</th>
                <th className="text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-4 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {[
                { site: "Pearl Lemon PR", overrides: "Primary color → #FF6B35" },
                { site: "Pearl Lemon Academy", overrides: "Font → Inter, Accent → #8B5CF6" },
                { site: "Pearl Lemon Health", overrides: "Primary color → #10B981" },
              ].map((item) => (
                <tr key={item.site} className="border-t border-border">
                  <td className="px-4 py-3 text-sm font-medium text-foreground">{item.site}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{item.overrides}</td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm" className="text-xs">Revert</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DesignSystem;

