import { MegaMenuColumn } from "./types";

interface MegaMenuProps {
  columns: MegaMenuColumn[];
  maxWidth: number;
}

const MegaMenu = ({ columns, maxWidth }: MegaMenuProps) => {
  if (!columns || columns.length === 0) return null;

  return (
    <div className="absolute top-full left-0 w-full bg-card border-b border-border shadow-lg z-50 animate-fade-in">
      <div className="mx-auto px-6 py-6" style={{ maxWidth }}>
        <div
          className="grid gap-8"
          style={{ gridTemplateColumns: `repeat(${Math.min(columns.length, 4)}, 1fr)` }}
        >
          {columns.map((col) => (
            <div key={col.id}>
              <h4 className="text-sm font-semibold text-foreground mb-3 pb-2 border-b border-border">
                {col.heading}
              </h4>
              <ul className="space-y-1.5">
                {col.items.map((item) => (
                  <li key={item.id}>
                    <a
                      href={item.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors block py-1"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MegaMenu;
