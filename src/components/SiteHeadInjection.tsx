// Injects site-wide head/body code and search-engine verification meta tags
// based on values stored in `site_settings.extras`.
//
// extras shape used here:
//   { verification?: { google?, bing?, yandex?, pinterest?, facebook? },
//     code_injection?: { head?, body_open?, body_close? } }

import { useEffect } from "react";
import { useSiteConfig } from "@/providers/SiteProvider";

const MARK = "data-cms-injection";

function clearMarked() {
  document.querySelectorAll(`[${MARK}]`).forEach((n) => n.remove());
}

function appendHTML(target: ParentNode, position: "prepend" | "append", html: string, tag: string) {
  const tpl = document.createElement("template");
  tpl.innerHTML = html;
  const wrap = document.createElement("div");
  wrap.setAttribute(MARK, tag);
  wrap.style.display = "contents";
  wrap.appendChild(tpl.content);
  if (position === "prepend") target.prepend(wrap); else target.appendChild(wrap);
}

function setMeta(name: string, content: string) {
  if (!content) return;
  const m = document.createElement("meta");
  m.name = name;
  m.content = content;
  m.setAttribute(MARK, `meta-${name}`);
  document.head.appendChild(m);
}

export default function SiteHeadInjection() {
  const { config } = useSiteConfig();
  const extras = ((config?.settings as Record<string, unknown> | undefined)?.extras ?? {}) as {
    verification?: Record<string, string>;
    code_injection?: { head?: string; body_open?: string; body_close?: string };
  };

  useEffect(() => {
    clearMarked();
    const v = extras.verification || {};
    if (v.google) setMeta("google-site-verification", v.google);
    if (v.bing) setMeta("msvalidate.01", v.bing);
    if (v.yandex) setMeta("yandex-verification", v.yandex);
    if (v.pinterest) setMeta("p:domain_verify", v.pinterest);
    if (v.facebook) setMeta("facebook-domain-verification", v.facebook);
    const c = extras.code_injection || {};
    if (c.head) appendHTML(document.head, "append", c.head, "head");
    if (c.body_open) appendHTML(document.body, "prepend", c.body_open, "body-open");
    if (c.body_close) appendHTML(document.body, "append", c.body_close, "body-close");
    return clearMarked;
  }, [JSON.stringify(extras)]);

  return null;
}
