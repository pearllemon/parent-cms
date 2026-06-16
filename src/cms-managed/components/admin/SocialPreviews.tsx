// Social preview cards (Google SERP, Facebook/OG, Twitter/X, LinkedIn).
// Pure presentational — takes title/description/url/image and renders
// pixel-approximate cards. Used by AdminSeoAudit.

import { truncate } from "@/lib/seoScoring";

type Props = {
  title: string;
  description: string;
  url: string;
  image?: string | null;
  siteName?: string;
};

const hostFromUrl = (u: string) => {
  try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; }
};

const breadcrumb = (u: string) => {
  try {
    const url = new URL(u);
    return `${hostFromUrl(u)} › ${url.pathname.split("/").filter(Boolean).join(" › ")}`.replace(/\s+›\s*$/, "");
  } catch {
    return u;
  }
};

export function GooglePreview({ title, description, url }: Props) {
  return (
    <div className="rounded-lg border p-4 bg-background max-w-xl font-sans">
      <div className="text-xs text-muted-foreground">{breadcrumb(url)}</div>
      <div className="text-[#1a0dab] text-lg leading-snug hover:underline cursor-pointer mt-0.5">
        {truncate(title || "Untitled page", 60)}
      </div>
      <div className="text-sm text-muted-foreground mt-1">
        {truncate(description || "No meta description set.", 160)}
      </div>
    </div>
  );
}

export function FacebookPreview({ title, description, url, image, siteName }: Props) {
  return (
    <div className="rounded-lg border overflow-hidden max-w-md bg-background">
      {image ? (
        <img src={image} alt="" className="w-full aspect-[1.91/1] object-cover bg-muted" />
      ) : (
        <div className="w-full aspect-[1.91/1] bg-muted flex items-center justify-center text-xs text-muted-foreground">
          No OG image
        </div>
      )}
      <div className="p-3 bg-muted/40">
        <div className="text-[11px] uppercase text-muted-foreground tracking-wide">{hostFromUrl(url)}</div>
        <div className="font-semibold text-sm leading-snug mt-0.5">{truncate(title, 80)}</div>
        <div className="text-xs text-muted-foreground mt-1">{truncate(description, 200)}</div>
        {siteName && <div className="text-[11px] text-muted-foreground mt-1">{siteName}</div>}
      </div>
    </div>
  );
}

export function TwitterPreview({ title, description, url, image }: Props) {
  return (
    <div className="rounded-2xl border overflow-hidden max-w-md bg-background">
      {image ? (
        <img src={image} alt="" className="w-full aspect-[2/1] object-cover bg-muted" />
      ) : (
        <div className="w-full aspect-[2/1] bg-muted flex items-center justify-center text-xs text-muted-foreground">
          No Twitter image
        </div>
      )}
      <div className="p-3">
        <div className="text-xs text-muted-foreground">{hostFromUrl(url)}</div>
        <div className="text-sm font-medium mt-0.5">{truncate(title, 70)}</div>
        <div className="text-xs text-muted-foreground mt-1">{truncate(description, 140)}</div>
      </div>
    </div>
  );
}

export function LinkedInPreview({ title, description, url, image }: Props) {
  return (
    <div className="rounded-lg border overflow-hidden max-w-md bg-background">
      {image ? (
        <img src={image} alt="" className="w-full aspect-[1.91/1] object-cover bg-muted" />
      ) : (
        <div className="w-full aspect-[1.91/1] bg-muted flex items-center justify-center text-xs text-muted-foreground">
          No image
        </div>
      )}
      <div className="p-3">
        <div className="font-semibold text-sm leading-snug">{truncate(title, 100)}</div>
        <div className="text-xs text-muted-foreground mt-1">{hostFromUrl(url)} · {truncate(description, 100)}</div>
      </div>
    </div>
  );
}
