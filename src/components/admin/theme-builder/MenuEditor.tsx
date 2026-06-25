import { useState } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2, GripVertical, Link as LinkIcon, Columns, ToggleLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NavItem, MegaMenuColumn, MegaMenuItem } from "@/components/header/types";

interface MenuEditorProps {
  navItems: NavItem[];
  onChange: (items: NavItem[]) => void;
}

const MenuEditor = ({ navItems, onChange }: MenuEditorProps) => {
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [expandedColId, setExpandedColId] = useState<string | null>(null);

  const updateItem = (idx: number, partial: Partial<NavItem>) => {
    const updated = [...navItems];
    updated[idx] = { ...updated[idx], ...partial };
    onChange(updated);
  };

  const removeItem = (idx: number) => {
    onChange(navItems.filter((_, i) => i !== idx));
  };

  const addItem = () => {
    onChange([
      ...navItems,
      { id: `nav-${Date.now()}`, label: "New Item", href: "#", hasDropdown: false, megaMenu: [] },
    ]);
  };

  const addColumn = (itemIdx: number) => {
    const item = navItems[itemIdx];
    const cols = item.megaMenu || [];
    const newCol: MegaMenuColumn = {
      id: `col-${Date.now()}`,
      heading: "New Section",
      items: [],
    };
    updateItem(itemIdx, { megaMenu: [...cols, newCol], hasDropdown: true });
  };

  const updateColumn = (itemIdx: number, colIdx: number, partial: Partial<MegaMenuColumn>) => {
    const item = navItems[itemIdx];
    const cols = [...(item.megaMenu || [])];
    cols[colIdx] = { ...cols[colIdx], ...partial };
    updateItem(itemIdx, { megaMenu: cols });
  };

  const removeColumn = (itemIdx: number, colIdx: number) => {
    const item = navItems[itemIdx];
    const cols = (item.megaMenu || []).filter((_, i) => i !== colIdx);
    updateItem(itemIdx, { megaMenu: cols, hasDropdown: cols.length > 0 });
  };

  const addLink = (itemIdx: number, colIdx: number) => {
    const item = navItems[itemIdx];
    const cols = [...(item.megaMenu || [])];
    const newLink: MegaMenuItem = { id: `link-${Date.now()}`, label: "New Link", href: "#" };
    cols[colIdx] = { ...cols[colIdx], items: [...cols[colIdx].items, newLink] };
    updateItem(itemIdx, { megaMenu: cols });
  };

  const updateLink = (itemIdx: number, colIdx: number, linkIdx: number, partial: Partial<MegaMenuItem>) => {
    const item = navItems[itemIdx];
    const cols = [...(item.megaMenu || [])];
    const links = [...cols[colIdx].items];
    links[linkIdx] = { ...links[linkIdx], ...partial };
    cols[colIdx] = { ...cols[colIdx], items: links };
    updateItem(itemIdx, { megaMenu: cols });
  };

  const removeLink = (itemIdx: number, colIdx: number, linkIdx: number) => {
    const item = navItems[itemIdx];
    const cols = [...(item.megaMenu || [])];
    cols[colIdx] = { ...cols[colIdx], items: cols[colIdx].items.filter((_, i) => i !== linkIdx) };
    updateItem(itemIdx, { megaMenu: cols });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-foreground">Menu Items</p>
        <Button variant="outline" size="sm" onClick={addItem}>
          <Plus className="w-3 h-3 mr-1" /> Add Menu Item
        </Button>
      </div>

      {navItems.map((item, itemIdx) => {
        const isExpanded = expandedItemId === item.id;
        const colCount = item.megaMenu?.length || 0;

        return (
          <div key={item.id} className="border border-border rounded-lg overflow-hidden">
            {/* Menu Item Row */}
            <div className="flex items-center gap-2 bg-muted/50 px-3 py-2">
              <GripVertical className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 cursor-grab" />
              <input
                value={item.label}
                onChange={(e) => updateItem(itemIdx, { label: e.target.value })}
                className="h-8 flex-1 rounded border border-input bg-background px-3 text-sm font-medium"
                placeholder="Menu label"
              />
              <input
                value={item.href || ""}
                onChange={(e) => updateItem(itemIdx, { href: e.target.value })}
                placeholder="URL (if no dropdown)"
                className="h-8 w-36 rounded border border-input bg-background px-2 text-xs"
              />

              {/* Dropdown toggle */}
              <button
                onClick={() => updateItem(itemIdx, { hasDropdown: !item.hasDropdown })}
                className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                  item.hasDropdown ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                }`}
                title="Toggle dropdown"
              >
                <ToggleLeft className="w-3 h-3" />
                {item.hasDropdown ? "Dropdown ON" : "No Dropdown"}
              </button>

              <span className="text-[10px] text-muted-foreground w-14 text-center flex-shrink-0">
                {colCount} col{colCount !== 1 ? "s" : ""}
              </span>

              <button
                onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                className="p-1 text-muted-foreground hover:text-foreground"
              >
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              <button onClick={() => removeItem(itemIdx)} className="p-1 text-muted-foreground hover:text-destructive">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Expanded: Dropdown Containers (Columns) */}
            {isExpanded && item.hasDropdown && (
              <div className="p-3 bg-background space-y-3 border-t border-border">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Columns className="w-3 h-3" /> Dropdown Containers
                  </p>
                  <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => addColumn(itemIdx)}>
                    <Plus className="w-3 h-3 mr-1" /> Add Container
                  </Button>
                </div>

                {(!item.megaMenu || item.megaMenu.length === 0) && (
                  <p className="text-xs text-muted-foreground italic py-2">
                    No containers yet. Add a container to create dropdown sections with sub-headings and links.
                  </p>
                )}

                {item.megaMenu?.map((col, colIdx) => {
                  const isColExpanded = expandedColId === col.id;

                  return (
                    <div key={col.id} className="border border-border rounded-lg overflow-hidden">
                      {/* Column Header */}
                      <div className="flex items-center gap-2 bg-muted/30 px-3 py-2">
                        <Columns className="w-3 h-3 text-primary flex-shrink-0" />
                        <input
                          value={col.heading}
                          onChange={(e) => updateColumn(itemIdx, colIdx, { heading: e.target.value })}
                          className="h-7 flex-1 rounded border border-input bg-background px-2 text-xs font-semibold"
                          placeholder="Container sub-heading"
                        />
                        <span className="text-[10px] text-muted-foreground">
                          {col.items.length} link{col.items.length !== 1 ? "s" : ""}
                        </span>
                        <button
                          onClick={() => setExpandedColId(isColExpanded ? null : col.id)}
                          className="p-1 text-muted-foreground hover:text-foreground"
                        >
                          {isColExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={() => removeColumn(itemIdx, colIdx)} className="p-1 text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Links inside column */}
                      {isColExpanded && (
                        <div className="p-2 space-y-1.5 bg-background">
                          {col.items.map((link, linkIdx) => (
                            <div key={link.id} className="flex items-center gap-2">
                              <LinkIcon className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                              <input
                                value={link.label}
                                onChange={(e) => updateLink(itemIdx, colIdx, linkIdx, { label: e.target.value })}
                                className="h-7 flex-1 rounded border border-input bg-background px-2 text-xs"
                                placeholder="Anchor text"
                              />
                              <input
                                value={link.href}
                                onChange={(e) => updateLink(itemIdx, colIdx, linkIdx, { href: e.target.value })}
                                className="h-7 w-40 rounded border border-input bg-background px-2 text-xs font-mono"
                                placeholder="https://..."
                              />
                              <button onClick={() => removeLink(itemIdx, colIdx, linkIdx)} className="p-0.5 text-muted-foreground hover:text-destructive">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                          <Button variant="ghost" size="sm" className="text-xs h-7 w-full" onClick={() => addLink(itemIdx, colIdx)}>
                            <Plus className="w-3 h-3 mr-1" /> Add Link
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Expanded but no dropdown */}
            {isExpanded && !item.hasDropdown && (
              <div className="p-3 bg-background border-t border-border">
                <p className="text-xs text-muted-foreground">
                  This is a direct link item (no dropdown). Toggle "Dropdown ON" to add containers with sub-headings and links.
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default MenuEditor;

