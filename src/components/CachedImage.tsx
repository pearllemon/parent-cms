import { useEffect, useState } from "react";
import { getCachedImageUrl } from "@/lib/cache";

type Props = React.ImgHTMLAttributes<HTMLImageElement> & { src: string };

/**
 * Image component that caches the underlying bytes via the Cache Storage API
 * so subsequent loads (across pages and reloads) are instant.
 * Falls back to direct src if Cache Storage is unavailable.
 */
const CachedImage = ({ src, ...rest }: Props) => {
  const [resolved, setResolved] = useState<string>(src);

  const [error, setError] = useState(false);

  useEffect(() => {
    setError(false);
    let cancelled = false;
    let blobUrl: string | null = null;
    getCachedImageUrl(src).then((url) => {
      if (cancelled) {
        if (url.startsWith("blob:")) URL.revokeObjectURL(url);
        return;
      }
      if (url.startsWith("blob:")) blobUrl = url;
      setResolved(url);
    });
    return () => {
      cancelled = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [src]);

  if (error || !resolved) {
    return (
      <div 
        className={`w-full h-full min-h-[150px] bg-gradient-to-br from-mint/40 to-primary/10 flex items-center justify-center rounded-2xl border border-border ${rest.className || ""}`}
        style={rest.style}
      >
        <span className="text-xs text-muted-foreground font-medium">Image not available</span>
      </div>
    );
  }

  return (
    <img 
      src={resolved} 
      loading="lazy" 
      decoding="async" 
      onError={() => setError(true)}
      {...rest} 
    />
  );
};

export default CachedImage;
