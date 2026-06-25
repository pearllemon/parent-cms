import { useEffect, useMemo, useState } from "react";
import {
  LayoutTemplate,
  Eye,
  Save,
  Copy,
  Upload,
  Code2,
  Settings2,
  Plus,
  Trash2,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import SiteHeader from "@/components/header/SiteHeader";
import MenuEditor from "./MenuEditor";
import { supabase } from "@/lib/parent";
import { toast } from "sonner";
import {
  HeaderConfig,
  HeaderTheme,
  ContactSet,
  NavItem,
  defaultHeaderConfig,
  defaultTheme,
  defaultContactSet,
} from "@/components/header/types";

type Tab = "editor" | "menu" | "json" | "preview";

interface DbHeaderConfig {
  id: string;
  name: string;
  logo_url: string;
  logo_alt: string;
  tagline: string;
  cta_text: string;
  cta_link: string;
  contact_set_id: string | null;
  theme_id: string | null;
  sticky_header: boolean;
  transparent_mode: boolean;
  show_progress_bar: boolean;
  content_max_width: number;
}

interface DbTheme {
  id: string;
  name: string;
  top_bar_bg: string;
  top_bar_text: string;
  nav_bg: string;
  nav_text: string;
  logo_bg: string;
  logo_text: string;
  cta_bg: string;
  cta_text: string;
  cta_border_radius: string;
  accent_color: string;
}

interface DbContactSet {
  id: string;
  name: string;
  email: string;
}

interface DbPhone {
  id: string;
  contact_set_id: string;
  label: string;
  number: string;
  dial_code: string;
  sort_order: number;
}

interface DbNavItem {
  id: string;
  header_config_id: string;
  label: string;
  href: string | null;
  has_dropdown: boolean;
  sort_order: number;
}

interface DbMegaMenuColumn {
  id: string;
  nav_item_id: string;
  heading: string;
  sort_order: number;
}

interface DbMegaMenuLink {
  id: string;
  column_id: string;
  label: string;
  href: string;
  sort_order: number;
}

interface SiteSummary {
  id: string;
  name: string;
  domain: string;
  header_config_id: string | null;
  theme_id: string | null;
  contact_set_id: string | null;
}

const themeFields: Array<{ key: keyof HeaderTheme; label: string }> = [
  { key: "topBarBg", label: "Top Bar BG" },
  { key: "topBarText", label: "Top Bar Text" },
  { key: "navBg", label: "Nav BG" },
  { key: "navText", label: "Nav Text" },
  { key: "logoBg", label: "Logo BG" },
  { key: "logoText", label: "Logo Text" },
  { key: "ctaBg", label: "CTA BG" },
  { key: "ctaText", label: "CTA Text" },
  { key: "accentColor", label: "Accent" },
  { key: "ctaBorderRadius", label: "CTA Radius" },
];

const mapDbThemeToPreview = (theme?: DbTheme | null): HeaderTheme => {
  if (!theme) return defaultTheme;

  return {
    id: theme.id,
    name: theme.name,
    topBarBg: theme.top_bar_bg,
    topBarText: theme.top_bar_text,
    navBg: theme.nav_bg,
    navText: theme.nav_text,
    logoBg: theme.logo_bg,
    logoText: theme.logo_text,
    ctaBg: theme.cta_bg,
    ctaText: theme.cta_text,
    ctaBorderRadius: theme.cta_border_radius,
    accentColor: theme.accent_color,
  };
};

const mapPreviewThemeToDb = (theme: HeaderTheme) => ({
  name: theme.name,
  top_bar_bg: theme.topBarBg,
  top_bar_text: theme.topBarText,
  nav_bg: theme.navBg,
  nav_text: theme.navText,
  logo_bg: theme.logoBg,
  logo_text: theme.logoText,
  cta_bg: theme.ctaBg,
  cta_text: theme.ctaText,
  cta_border_radius: theme.ctaBorderRadius,
  accent_color: theme.accentColor,
});

const buildContactSet = (contact?: DbContactSet | null, phoneRows: DbPhone[] = []): ContactSet => {
  if (!contact) return defaultContactSet;

  return {
    id: contact.id,
    name: contact.name,
    email: contact.email,
    phones: phoneRows
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((phone) => ({
        id: phone.id,
        label: phone.label,
        number: phone.number,
        dialCode: phone.dial_code,
      })),
  };
};

const buildNavItems = (
  navRows: DbNavItem[],
  columnRows: DbMegaMenuColumn[],
  linkRows: DbMegaMenuLink[]
): NavItem[] =>
  navRows
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((nav) => ({
      id: nav.id,
      label: nav.label,
      href: nav.href || "#",
      hasDropdown: nav.has_dropdown,
      megaMenu: columnRows
        .filter((column) => column.nav_item_id === nav.id)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((column) => ({
          id: column.id,
          heading: column.heading,
          items: linkRows
            .filter((link) => link.column_id === column.id)
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((link) => ({
              id: link.id,
              label: link.label,
              href: link.href,
            })),
        })),
    }));

const HeaderManager = () => {
  const [activeTab, setActiveTab] = useState<Tab>("editor");
  const [headers, setHeaders] = useState<DbHeaderConfig[]>([]);
  const [themes, setThemes] = useState<DbTheme[]>([]);
  const [contactSets, setContactSets] = useState<DbContactSet[]>([]);
  const [phones, setPhones] = useState<DbPhone[]>([]);
  const [sites, setSites] = useState<SiteSummary[]>([]);
  const [navItems, setNavItems] = useState<NavItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [jsonInput, setJsonInput] = useState("");
  const [jsonError, setJsonError] = useState("");
  const [showPreview, setShowPreview] = useState(true);
  const [loading, setLoading] = useState(true);
  const [assignmentSiteId, setAssignmentSiteId] = useState("");
  const [menuDirty, setMenuDirty] = useState(false);
  const [tableMissing, setTableMissing] = useState(false);

  const activeHeader = useMemo(
    () => headers.find((header) => header.id === activeId) || null,
    [headers, activeId]
  );

  const activeThemeRow = useMemo(
    () => themes.find((theme) => theme.id === activeHeader?.theme_id) || null,
    [themes, activeHeader?.theme_id]
  );

  const activeContactRow = useMemo(
    () => contactSets.find((contact) => contact.id === activeHeader?.contact_set_id) || null,
    [contactSets, activeHeader?.contact_set_id]
  );

  const activePhones = useMemo(
    () => phones.filter((phone) => phone.contact_set_id === activeHeader?.contact_set_id),
    [phones, activeHeader?.contact_set_id]
  );

  const previewConfig: HeaderConfig = useMemo(() => {
    if (!activeHeader) return defaultHeaderConfig;

    return {
      id: activeHeader.id,
      name: activeHeader.name,
      logoUrl: activeHeader.logo_url,
      logoAlt: activeHeader.logo_alt || defaultHeaderConfig.logoAlt,
      tagline: activeHeader.tagline || defaultHeaderConfig.tagline,
      navItems,
      ctaText: activeHeader.cta_text || defaultHeaderConfig.ctaText,
      ctaLink: activeHeader.cta_link || defaultHeaderConfig.ctaLink,
      contactSet: buildContactSet(activeContactRow, activePhones),
      theme: mapDbThemeToPreview(activeThemeRow),
      contentMaxWidth: activeHeader.content_max_width || defaultHeaderConfig.contentMaxWidth,
      showProgressBar: activeHeader.show_progress_bar,
      transparentMode: activeHeader.transparent_mode,
      stickyHeader: activeHeader.sticky_header,
    };
  }, [activeHeader, activeContactRow, activePhones, activeThemeRow, navItems]);

  const loadHeaderTree = async (headerId: string) => {
    const { data: navRows, error: navError } = await supabase
      .from("nav_items")
      .select("*")
      .eq("header_config_id", headerId)
      .order("sort_order");

    if (navError) {
      toast.error("Failed to load header menu");
      setNavItems([]);
      return;
    }

    const navIds = (navRows || []).map((row) => row.id);
    if (navIds.length === 0) {
      setNavItems([]);
      setMenuDirty(false);
      return;
    }

    const { data: columnRows } = await supabase
      .from("mega_menu_columns")
      .select("*")
      .in("nav_item_id", navIds)
      .order("sort_order");

    const columnIds = (columnRows || []).map((row) => row.id);
    const { data: linkRows } = columnIds.length
      ? await supabase
          .from("mega_menu_links")
          .select("*")
          .in("column_id", columnIds)
          .order("sort_order")
      : { data: [] as DbMegaMenuLink[] };

    setNavItems(buildNavItems((navRows || []) as DbNavItem[], (columnRows || []) as DbMegaMenuColumn[], (linkRows || []) as DbMegaMenuLink[]));
    setMenuDirty(false);
  };

  const loadAll = async (preferredHeaderId?: string) => {
    setLoading(true);

    try {
      const [headersRes, themesRes, contactSetsRes, phonesRes, sitesRes] = await Promise.all([
        supabase.from("header_configs").select("*").order("created_at"),
        supabase.from("themes").select("*").order("created_at"),
        supabase.from("contact_sets").select("*").order("created_at"),
        supabase.from("phone_numbers").select("*").order("sort_order"),
        supabase
          .from("sites")
          .select("id, name, domain, header_config_id, theme_id, contact_set_id")
          .order("created_at"),
      ]);

      if (headersRes.error || themesRes.error || contactSetsRes.error || phonesRes.error || sitesRes.error) {
        const error = headersRes.error || themesRes.error || contactSetsRes.error || phonesRes.error || sitesRes.error;
        console.error("Loader error:", error);
        if (error.message?.includes("relation") || error.message?.includes("cache") || error.message?.includes("schema") || error.code === "PGRST116" || error.code === "42P01") {
          setTableMissing(true);
        } else {
          toast.error("Failed to load header builder data");
        }
        setLoading(false);
        return;
      }

      const nextHeaders = (headersRes.data || []) as DbHeaderConfig[];
      const nextSites = (sitesRes.data || []) as SiteSummary[];
      const nextActiveId = preferredHeaderId || activeId || nextHeaders[0]?.id || null;

      setHeaders(nextHeaders);
      setThemes((themesRes.data || []) as DbTheme[]);
      setContactSets((contactSetsRes.data || []) as DbContactSet[]);
      setPhones((phonesRes.data || []) as DbPhone[]);
      setSites(nextSites);
      setActiveId(nextActiveId);
      setTableMissing(false);

      if (!assignmentSiteId && nextSites[0]?.id) {
        setAssignmentSiteId(nextSites[0].id);
      }

      if (nextActiveId) {
        await loadHeaderTree(nextActiveId);
      } else {
        setNavItems([]);
        setMenuDirty(false);
      }
    } catch (err) {
      console.error(err);
      setTableMissing(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const updateActiveHeaderLocal = (partial: Partial<DbHeaderConfig>) => {
    if (!activeId) return;
    setHeaders((current) =>
      current.map((header) => (header.id === activeId ? { ...header, ...partial } : header))
    );
  };

  const updateActiveThemeLocal = (partial: Partial<HeaderTheme>) => {
    if (!activeThemeRow) return;
    const previewTheme = mapDbThemeToPreview(activeThemeRow);
    const nextTheme = { ...previewTheme, ...partial };

    setThemes((current) =>
      current.map((theme) =>
        theme.id === activeThemeRow.id
          ? { id: theme.id, ...mapPreviewThemeToDb(nextTheme) }
          : theme
      )
    );
  };

  const updateActiveContactLocal = (partial: Partial<DbContactSet>) => {
    if (!activeContactRow) return;
    setContactSets((current) =>
      current.map((contact) =>
        contact.id === activeContactRow.id ? { ...contact, ...partial } : contact
      )
    );
  };

  const addPhone = () => {
    if (!activeContactRow) return;
    setPhones((current) => [
      ...current,
      {
        id: `temp-${Date.now()}`,
        contact_set_id: activeContactRow.id,
        label: "NEW",
        number: "",
        dial_code: "",
        sort_order: current.filter((phone) => phone.contact_set_id === activeContactRow.id).length,
      },
    ]);
  };

  const updatePhoneLocal = (phoneId: string, partial: Partial<DbPhone>) => {
    setPhones((current) =>
      current.map((phone) => (phone.id === phoneId ? { ...phone, ...partial } : phone))
    );
  };

  const removePhoneLocal = (phoneId: string) => {
    setPhones((current) => current.filter((phone) => phone.id !== phoneId));
  };

  const createTheme = async () => {
    const { data, error } = await supabase
      .from("themes")
      .insert({
        name: `Theme ${themes.length + 1}`,
        ...mapPreviewThemeToDb({ ...defaultTheme, id: "new", name: `Theme ${themes.length + 1}` }),
      })
      .select()
      .single();

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Theme created");
    await loadAll(activeId || undefined);
    if (activeId && !activeHeader?.theme_id) {
      updateActiveHeaderLocal({ theme_id: data.id });
    }
  };

  const saveTheme = async () => {
    if (!activeThemeRow) {
      toast.error("Select or create a theme first");
      return;
    }

    const { error } = await supabase
      .from("themes")
      .update(mapPreviewThemeToDb(mapDbThemeToPreview(activeThemeRow)))
      .eq("id", activeThemeRow.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Theme saved");
    await loadAll(activeId || undefined);
  };

  const deleteTheme = async (themeId: string) => {
    const inUse = headers.some((header) => header.theme_id === themeId) || sites.some((site) => site.theme_id === themeId);
    if (inUse) {
      toast.error("This theme is assigned to a header or site");
      return;
    }

    const { error } = await supabase.from("themes").delete().eq("id", themeId);
    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Theme deleted");
    await loadAll(activeId || undefined);
  };

  const createContactSet = async () => {
    const { data, error } = await supabase
      .from("contact_sets")
      .insert({
        name: `Contact Set ${contactSets.length + 1}`,
        email: defaultContactSet.email,
      })
      .select()
      .single();

    if (error) {
      toast.error(error.message);
      return;
    }

    const defaultPhones = defaultContactSet.phones.map((phone, index) => ({
      contact_set_id: data.id,
      label: phone.label,
      number: phone.number,
      dial_code: phone.dialCode,
      sort_order: index,
    }));

    if (defaultPhones.length) {
      await supabase.from("phone_numbers").insert(defaultPhones);
    }

    toast.success("Contact set created");
    await loadAll(activeId || undefined);
    if (activeId && !activeHeader?.contact_set_id) {
      updateActiveHeaderLocal({ contact_set_id: data.id });
    }
  };

  const saveContactSet = async () => {
    if (!activeContactRow) {
      toast.error("Select or create a contact set first");
      return;
    }

    const { error } = await supabase
      .from("contact_sets")
      .update({ name: activeContactRow.name, email: activeContactRow.email })
      .eq("id", activeContactRow.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    const scopedPhones = phones
      .filter((phone) => phone.contact_set_id === activeContactRow.id)
      .map((phone, index) => ({
        contact_set_id: activeContactRow.id,
        label: phone.label,
        number: phone.number,
        dial_code: phone.dial_code,
        sort_order: index,
      }));

    await supabase.from("phone_numbers").delete().eq("contact_set_id", activeContactRow.id);
    if (scopedPhones.length) {
      const { error: phoneError } = await supabase.from("phone_numbers").insert(scopedPhones);
      if (phoneError) {
        toast.error(phoneError.message);
        return;
      }
    }

    toast.success("Contact set saved");
    await loadAll(activeId || undefined);
  };

  const deleteContactSet = async (contactSetId: string) => {
    const inUse = headers.some((header) => header.contact_set_id === contactSetId) || sites.some((site) => site.contact_set_id === contactSetId);
    if (inUse) {
      toast.error("This contact set is assigned to a header or site");
      return;
    }

    await supabase.from("phone_numbers").delete().eq("contact_set_id", contactSetId);
    const { error } = await supabase.from("contact_sets").delete().eq("id", contactSetId);
    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Contact set deleted");
    await loadAll(activeId || undefined);
  };

  const createHeader = async () => {
    const { data, error } = await supabase
      .from("header_configs")
      .insert({
        name: `Header ${headers.length + 1}`,
        logo_url: "",
        logo_alt: defaultHeaderConfig.logoAlt,
        tagline: defaultHeaderConfig.tagline,
        cta_text: defaultHeaderConfig.ctaText,
        cta_link: defaultHeaderConfig.ctaLink,
        contact_set_id: contactSets[0]?.id || null,
        theme_id: themes[0]?.id || null,
        sticky_header: defaultHeaderConfig.stickyHeader,
        transparent_mode: defaultHeaderConfig.transparentMode,
        show_progress_bar: defaultHeaderConfig.showProgressBar,
        content_max_width: defaultHeaderConfig.contentMaxWidth,
      })
      .select()
      .single();

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Header created");
    await loadAll(data.id);
  };

  const saveHeaderSettings = async () => {
    if (!activeHeader) return;

    const { error } = await supabase
      .from("header_configs")
      .update({
        name: activeHeader.name,
        logo_url: activeHeader.logo_url,
        logo_alt: activeHeader.logo_alt,
        tagline: activeHeader.tagline,
        cta_text: activeHeader.cta_text,
        cta_link: activeHeader.cta_link,
        contact_set_id: activeHeader.contact_set_id,
        theme_id: activeHeader.theme_id,
        sticky_header: activeHeader.sticky_header,
        transparent_mode: activeHeader.transparent_mode,
        show_progress_bar: activeHeader.show_progress_bar,
        content_max_width: activeHeader.content_max_width,
      })
      .eq("id", activeHeader.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Header settings saved");
    await loadAll(activeHeader.id);
  };

  const deleteHeader = async (headerId: string) => {
    const inUse = sites.some((site) => site.header_config_id === headerId);
    if (inUse) {
      toast.error("This header is assigned to a site");
      return;
    }

    const { error } = await supabase.from("header_configs").delete().eq("id", headerId);
    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Header deleted");
    await loadAll();
  };

  const syncMenuToDatabase = async (items: NavItem[]) => {
    if (!activeId) return;

    const { data: existingNav } = await supabase
      .from("nav_items")
      .select("id")
      .eq("header_config_id", activeId);

    const existingNavIds = (existingNav || []).map((item) => item.id);
    if (existingNavIds.length) {
      const { data: existingColumns } = await supabase
        .from("mega_menu_columns")
        .select("id")
        .in("nav_item_id", existingNavIds);

      const existingColumnIds = (existingColumns || []).map((column) => column.id);
      if (existingColumnIds.length) {
        await supabase.from("mega_menu_links").delete().in("column_id", existingColumnIds);
      }

      await supabase.from("mega_menu_columns").delete().in("nav_item_id", existingNavIds);
      await supabase.from("nav_items").delete().eq("header_config_id", activeId);
    }

    for (const [itemIndex, item] of items.entries()) {
      const { data: insertedNav, error: navError } = await supabase
        .from("nav_items")
        .insert({
          header_config_id: activeId,
          label: item.label,
          href: item.href || "#",
          has_dropdown: Boolean(item.hasDropdown && item.megaMenu && item.megaMenu.length > 0),
          sort_order: itemIndex,
        })
        .select()
        .single();

      if (navError) {
        throw navError;
      }

      for (const [columnIndex, column] of (item.megaMenu || []).entries()) {
        const { data: insertedColumn, error: columnError } = await supabase
          .from("mega_menu_columns")
          .insert({
            nav_item_id: insertedNav.id,
            heading: column.heading,
            sort_order: columnIndex,
          })
          .select()
          .single();

        if (columnError) {
          throw columnError;
        }

        if (column.items.length) {
          const { error: linkError } = await supabase.from("mega_menu_links").insert(
            column.items.map((link, linkIndex) => ({
              column_id: insertedColumn.id,
              label: link.label,
              href: link.href,
              sort_order: linkIndex,
            }))
          );

          if (linkError) {
            throw linkError;
          }
        }
      }
    }
  };

  const saveMenu = async () => {
    try {
      await syncMenuToDatabase(navItems);
      setMenuDirty(false);
      toast.success("Menu saved");
      await loadHeaderTree(activeId || "");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save menu");
    }
  };

  const applyToSite = async (mode: "all" | "header" | "theme" | "contact") => {
    if (!assignmentSiteId || !activeHeader) {
      toast.error("Select a site first");
      return;
    }

    const payload: Record<string, string | null> = {};
    if (mode === "all" || mode === "header") payload.header_config_id = activeHeader.id;
    if (mode === "all" || mode === "theme") payload.theme_id = activeHeader.theme_id;
    if (mode === "all" || mode === "contact") payload.contact_set_id = activeHeader.contact_set_id;

    const { error } = await supabase.from("sites").update(payload as never).eq("id", assignmentSiteId);
    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Applied to site");
    await loadAll(activeId || undefined);
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "editor", label: "Settings", icon: <Settings2 className="w-3.5 h-3.5" /> },
    { id: "menu", label: "Menu Builder", icon: <LayoutTemplate className="w-3.5 h-3.5" /> },
    { id: "json", label: "JSON Import", icon: <Code2 className="w-3.5 h-3.5" /> },
    { id: "preview", label: "Live Preview", icon: <Eye className="w-3.5 h-3.5" /> },
  ];

  if (tableMissing) {
    return (
      <div className="pearl-card p-6 border-amber-500/30 bg-amber-500/5 text-amber-955 rounded-xl space-y-3">
        <h3 className="font-semibold text-lg flex items-center gap-2 text-amber-700">
          ⚠️ Database Schema Configuration Needed
        </h3>
        <p className="text-sm leading-relaxed">
          The <code>header_configs</code> or other required Theme Builder tables were not found in your database schema cache.
        </p>
        <p className="text-xs opacity-80">
          <strong>Resolution:</strong> Please execute the migration script located at <code>supabase/migrations/20260625123500_theme_builder_tables.sql</code> in your Supabase SQL Editor to provision the required database tables, then refresh the page.
        </p>
      </div>
    );
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading header builder…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {headers.map((header) => (
            <button
              key={header.id}
              onClick={() => {
                setActiveId(header.id);
                void loadHeaderTree(header.id);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                activeId === header.id
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {header.name}
            </button>
          ))}
          <Button variant="outline" size="sm" onClick={createHeader}>
            <Plus className="w-3 h-3 mr-1" /> New Header
          </Button>
        </div>

        {activeHeader && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowPreview((current) => !current)}>
              <Eye className="w-3 h-3 mr-1" /> {showPreview ? "Hide" : "Show"} Preview
            </Button>
            <Button variant="pearl" size="sm" onClick={saveHeaderSettings}>
              <Save className="w-3 h-3 mr-1" /> Save Header
            </Button>
            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteHeader(activeHeader.id)}>
              <Trash2 className="w-3 h-3 mr-1" /> Delete
            </Button>
          </div>
        )}
      </div>

      {!activeHeader ? (
        <div className="pearl-card p-6 space-y-3">
          <p className="text-sm text-muted-foreground">
            No saved header yet — create your first shared header, then assign it to child sites.
          </p>
          <div className="flex gap-2 flex-wrap">
            <Button variant="pearl" size="sm" onClick={createTheme}>
              <Wand2 className="w-3 h-3 mr-1" /> Create Starter Theme
            </Button>
            <Button variant="outline" size="sm" onClick={createContactSet}>
              <Plus className="w-3 h-3 mr-1" /> Create Contact Set
            </Button>
            <Button variant="outline" size="sm" onClick={createHeader}>
              <Plus className="w-3 h-3 mr-1" /> Create Header
            </Button>
          </div>
        </div>
      ) : (
        <>
          {showPreview && (
            <div className="border border-border rounded-lg overflow-hidden bg-muted">
              <div className="relative" style={{ minHeight: 180 }}>
                <div className="transform scale-[0.65] origin-top-left" style={{ width: "154%" }}>
                  <SiteHeader config={previewConfig} />
                  <div className="h-24" />
                </div>
              </div>
            </div>
          )}

          <div className="pearl-card p-6">
            <div className="flex gap-1 border-b border-border mb-5 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            {activeTab === "editor" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Header Name</label>
                    <input
                      value={activeHeader.name}
                      onChange={(e) => updateActiveHeaderLocal({ name: e.target.value })}
                      className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Logo Alt / Brand Name</label>
                    <input
                      value={activeHeader.logo_alt}
                      onChange={(e) => updateActiveHeaderLocal({ logo_alt: e.target.value })}
                      className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Logo URL</label>
                    <input
                      value={activeHeader.logo_url}
                      onChange={(e) => updateActiveHeaderLocal({ logo_url: e.target.value })}
                      className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                      placeholder="https://..."
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Tagline</label>
                    <input
                      value={activeHeader.tagline}
                      onChange={(e) => updateActiveHeaderLocal({ tagline: e.target.value })}
                      className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">CTA Text</label>
                    <input
                      value={activeHeader.cta_text}
                      onChange={(e) => updateActiveHeaderLocal({ cta_text: e.target.value })}
                      className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">CTA Link</label>
                    <input
                      value={activeHeader.cta_link}
                      onChange={(e) => updateActiveHeaderLocal({ cta_link: e.target.value })}
                      className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Content Max Width (px)</label>
                    <input
                      type="number"
                      value={activeHeader.content_max_width}
                      onChange={(e) => updateActiveHeaderLocal({ content_max_width: Number(e.target.value) })}
                      className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground block">Apply dependencies</label>
                    <div className="grid grid-cols-1 gap-2">
                      <select
                        value={activeHeader.theme_id || ""}
                        onChange={(e) => updateActiveHeaderLocal({ theme_id: e.target.value || null })}
                        className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                      >
                        <option value="">No theme selected</option>
                        {themes.map((theme) => (
                          <option key={theme.id} value={theme.id}>
                            {theme.name}
                          </option>
                        ))}
                      </select>
                      <select
                        value={activeHeader.contact_set_id || ""}
                        onChange={(e) => updateActiveHeaderLocal({ contact_set_id: e.target.value || null })}
                        className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                      >
                        <option value="">No contact set selected</option>
                        {contactSets.map((contact) => (
                          <option key={contact.id} value={contact.id}>
                            {contact.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex items-end gap-4 flex-wrap md:col-span-2">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={activeHeader.show_progress_bar}
                        onChange={(e) => updateActiveHeaderLocal({ show_progress_bar: e.target.checked })}
                        className="rounded"
                      />
                      Progress Bar
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={activeHeader.transparent_mode}
                        onChange={(e) => updateActiveHeaderLocal({ transparent_mode: e.target.checked })}
                        className="rounded"
                      />
                      Transparent Mode
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={activeHeader.sticky_header}
                        onChange={(e) => updateActiveHeaderLocal({ sticky_header: e.target.checked })}
                        className="rounded"
                      />
                      Sticky Header
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <div className="space-y-4 rounded-lg border border-border p-4">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <h4 className="text-sm font-semibold text-foreground">Theme</h4>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={createTheme}>
                          <Plus className="w-3 h-3 mr-1" /> New Theme
                        </Button>
                        {activeThemeRow && (
                          <>
                            <Button variant="pearl" size="sm" onClick={saveTheme}>
                              <Save className="w-3 h-3 mr-1" /> Save Theme
                            </Button>
                            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteTheme(activeThemeRow.id)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    {activeThemeRow ? (
                      <div className="space-y-3">
                        <input
                          value={activeThemeRow.name}
                          onChange={(e) => updateActiveThemeLocal({ name: e.target.value })}
                          className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm font-medium"
                        />
                        <div className="grid grid-cols-2 gap-3">
                          {themeFields.map(({ key, label }) => {
                            const value = mapDbThemeToPreview(activeThemeRow)[key];
                            return (
                              <div key={key}>
                                <label className="text-[10px] text-muted-foreground mb-0.5 block">{label}</label>
                                <div className="flex items-center gap-1.5">
                                  {key !== "ctaBorderRadius" && (
                                    <div
                                      className="w-5 h-5 rounded border border-border flex-shrink-0"
                                      style={{ backgroundColor: `hsl(${value})` }}
                                    />
                                  )}
                                  <input
                                    value={value}
                                    onChange={(e) => updateActiveThemeLocal({ [key]: e.target.value } as Partial<HeaderTheme>)}
                                    className="h-7 w-full rounded border border-input bg-background px-1.5 text-[10px] font-mono"
                                    placeholder={key === "ctaBorderRadius" ? "4px" : "H S% L%"}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">Create a theme and attach it to this header.</p>
                    )}
                  </div>

                  <div className="space-y-4 rounded-lg border border-border p-4">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <h4 className="text-sm font-semibold text-foreground">Contact Set</h4>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={createContactSet}>
                          <Plus className="w-3 h-3 mr-1" /> New Contact Set
                        </Button>
                        {activeContactRow && (
                          <>
                            <Button variant="pearl" size="sm" onClick={saveContactSet}>
                              <Save className="w-3 h-3 mr-1" /> Save Contact Set
                            </Button>
                            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteContactSet(activeContactRow.id)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    {activeContactRow ? (
                      <div className="space-y-3">
                        <input
                          value={activeContactRow.name}
                          onChange={(e) => updateActiveContactLocal({ name: e.target.value })}
                          className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm font-medium"
                          placeholder="Contact set name"
                        />
                        <input
                          value={activeContactRow.email}
                          onChange={(e) => updateActiveContactLocal({ email: e.target.value })}
                          className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                          placeholder="info@example.com"
                        />
                        <div className="space-y-2">
                          {activePhones.map((phone) => (
                            <div key={phone.id} className="grid grid-cols-[72px,88px,1fr,32px] gap-2 items-center">
                              <input
                                value={phone.label}
                                onChange={(e) => updatePhoneLocal(phone.id, { label: e.target.value })}
                                className="h-8 rounded border border-input bg-background px-2 text-xs"
                                placeholder="UK"
                              />
                              <input
                                value={phone.dial_code}
                                onChange={(e) => updatePhoneLocal(phone.id, { dial_code: e.target.value })}
                                className="h-8 rounded border border-input bg-background px-2 text-xs"
                                placeholder="+44"
                              />
                              <input
                                value={phone.number}
                                onChange={(e) => updatePhoneLocal(phone.id, { number: e.target.value })}
                                className="h-8 rounded border border-input bg-background px-2 text-xs"
                                placeholder="020 7183 3436"
                              />
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive" onClick={() => removePhoneLocal(phone.id)}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                          <Button variant="ghost" size="sm" onClick={addPhone}>
                            <Plus className="w-3 h-3 mr-1" /> Add Phone
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">Create a contact set and attach it to this header.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "menu" && (
              <div className="space-y-4">
                <MenuEditor
                  navItems={navItems}
                  onChange={(items) => {
                    setNavItems(items);
                    setMenuDirty(true);
                  }}
                />
                <div className="flex justify-end">
                  <Button variant="pearl" size="sm" onClick={saveMenu} disabled={!menuDirty}>
                    <Save className="w-3 h-3 mr-1" /> Save Menu Structure
                  </Button>
                </div>
              </div>
            )}

            {activeTab === "json" && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Export or paste JSON for quick header setup. Imported values stay local until you click save.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setJsonInput(
                        JSON.stringify(
                          {
                            name: activeHeader.name,
                            logo_alt: activeHeader.logo_alt,
                            logo_url: activeHeader.logo_url,
                            tagline: activeHeader.tagline,
                            cta_text: activeHeader.cta_text,
                            cta_link: activeHeader.cta_link,
                            content_max_width: activeHeader.content_max_width,
                            show_progress_bar: activeHeader.show_progress_bar,
                            transparent_mode: activeHeader.transparent_mode,
                            sticky_header: activeHeader.sticky_header,
                            navItems,
                          },
                          null,
                          2
                        )
                      );
                      setJsonError("");
                    }}
                  >
                    <Copy className="w-3 h-3 mr-1" /> Export
                  </Button>
                  <Button
                    variant="pearl"
                    size="sm"
                    onClick={() => {
                      try {
                        const parsed = JSON.parse(jsonInput);
                        setJsonError("");
                        updateActiveHeaderLocal({
                          name: parsed.name ?? activeHeader.name,
                          logo_alt: parsed.logo_alt ?? activeHeader.logo_alt,
                          logo_url: parsed.logo_url ?? activeHeader.logo_url,
                          tagline: parsed.tagline ?? activeHeader.tagline,
                          cta_text: parsed.cta_text ?? activeHeader.cta_text,
                          cta_link: parsed.cta_link ?? activeHeader.cta_link,
                          content_max_width: parsed.content_max_width ?? activeHeader.content_max_width,
                          show_progress_bar: parsed.show_progress_bar ?? activeHeader.show_progress_bar,
                          transparent_mode: parsed.transparent_mode ?? activeHeader.transparent_mode,
                          sticky_header: parsed.sticky_header ?? activeHeader.sticky_header,
                        });
                        if (Array.isArray(parsed.navItems)) {
                          setNavItems(parsed.navItems);
                          setMenuDirty(true);
                        }
                      } catch {
                        setJsonError("Invalid JSON.");
                      }
                    }}
                  >
                    <Upload className="w-3 h-3 mr-1" /> Import
                  </Button>
                </div>
                <textarea
                  value={jsonInput}
                  onChange={(e) => {
                    setJsonInput(e.target.value);
                    setJsonError("");
                  }}
                  rows={14}
                  className="w-full rounded-lg border border-input bg-background p-3 text-xs font-mono text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                />
                {jsonError && <p className="text-xs text-destructive">{jsonError}</p>}
              </div>
            )}

            {activeTab === "preview" && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Live preview of the current shared header.</p>
                <div className="border border-border rounded-lg overflow-hidden bg-muted">
                  <SiteHeader config={previewConfig} />
                  <div className="p-8" style={{ minHeight: 350 }}>
                    <div className="h-16" />
                    <h1 className="text-2xl font-bold text-foreground">Child Site Preview</h1>
                    <p className="text-muted-foreground mt-2">Assign this header to a site from the panel below.</p>
                    <div className="grid grid-cols-3 gap-4 mt-6">
                      {[1, 2, 3].map((index) => (
                        <div key={index} className="h-32 bg-card rounded-lg border border-border" />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="pearl-card p-6 space-y-4">
            <div className="flex items-center gap-2">
              <LayoutTemplate className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Apply to Child Site</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Select a child site and push this shared header, theme, and contact set into it.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
              <select
                value={assignmentSiteId}
                onChange={(e) => setAssignmentSiteId(e.target.value)}
                className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="">Choose a site</option>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name} {site.domain ? `(${site.domain})` : ""}
                  </option>
                ))}
              </select>
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={() => applyToSite("header")}>Assign Header</Button>
                <Button variant="outline" size="sm" onClick={() => applyToSite("theme")}>Assign Theme</Button>
                <Button variant="outline" size="sm" onClick={() => applyToSite("contact")}>Assign Contacts</Button>
                <Button variant="pearl" size="sm" onClick={() => applyToSite("all")}>Assign All</Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default HeaderManager;

