import React from "react";
import type { HeaderConfig } from "./types";
import { defaultHeaderConfig } from "./types";

interface SiteHeaderProps {
  config?: HeaderConfig;
  preview?: boolean;
}

/**
 * Presentational header used by the admin Header Manager preview and by
 * sites that render a configurable header.
 */
export default function SiteHeader({ config = defaultHeaderConfig }: SiteHeaderProps) {
  const { theme, contactSet, navItems } = config;

  return (
    <header
      className="w-full overflow-hidden"
      style={{ position: config.stickyHeader ? "sticky" : "relative", top: 0, zIndex: 30 }}
    >
      {config.showProgressBar && (
        <div style={{ height: 3, background: theme.accentColor, width: "35%" }} />
      )}

      <div style={{ background: theme.topBarBg, color: theme.topBarText }} className="text-xs">
        <div
          className="mx-auto flex flex-wrap items-center justify-between gap-2 px-4 py-2"
          style={{ maxWidth: config.contentMaxWidth }}
        >
          <span>{config.tagline}</span>
          <span className="flex flex-wrap items-center gap-3">
            {contactSet?.email && <a href={`mailto:${contactSet.email}`}>{contactSet.email}</a>}
            {(contactSet?.phones || []).map((phone) => (
              <a key={phone.id} href={`tel:${phone.dialCode}${phone.number}`}>
                {phone.label}: {phone.dialCode} {phone.number}
              </a>
            ))}
          </span>
        </div>
      </div>

      <div
        style={{
          background: config.transparentMode ? "transparent" : theme.navBg,
          color: theme.navText,
        }}
      >
        <div
          className="mx-auto flex items-center justify-between gap-6 px-4 py-3"
          style={{ maxWidth: config.contentMaxWidth }}
        >
          <div
            className="flex items-center gap-2 rounded px-2 py-1"
            style={{ background: theme.logoBg, color: theme.logoText }}
          >
            {config.logoUrl ? (
              <img src={config.logoUrl} alt={config.logoAlt} className="h-8 w-auto object-contain" />
            ) : (
              <span className="font-semibold">{config.logoAlt || config.name}</span>
            )}
          </div>

          <nav className="hidden items-center gap-5 text-sm md:flex">
            {navItems.map((item) => (
              <div key={item.id} className="group relative">
                <a href={item.href} className="hover:opacity-70">
                  {item.label}
                </a>
                {item.hasDropdown && (item.megaMenu?.length ?? 0) > 0 && (
                  <div className="pointer-events-none absolute left-0 top-full z-40 hidden min-w-[420px] gap-6 rounded-md border bg-white p-4 text-slate-900 shadow-lg group-hover:grid group-hover:grid-cols-2">
                    {item.megaMenu!.map((column) => (
                      <div key={column.id}>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide opacity-60">
                          {column.heading}
                        </p>
                        <ul className="space-y-1">
                          {column.items.map((link) => (
                            <li key={link.id}>
                              <a href={link.href} className="text-sm hover:underline">
                                {link.label}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>

          <a
            href={config.ctaLink}
            className="px-4 py-2 text-sm font-medium"
            style={{
              background: theme.ctaBg,
              color: theme.ctaText,
              borderRadius: theme.ctaBorderRadius,
            }}
          >
            {config.ctaText}
          </a>
        </div>
      </div>
    </header>
  );
}
