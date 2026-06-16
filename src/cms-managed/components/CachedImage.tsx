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

  useEffect(() => {
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

  return <img src={resolved} loading="lazy" decoding="async" {...rest} />;
};

export default CachedImage;
