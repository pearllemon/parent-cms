import { useEffect, useState } from "react";

interface ScrollProgressBarProps {
  color?: string;
  height?: number;
}

const ScrollProgressBar = ({ color, height = 3 }: ScrollProgressBarProps) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(docHeight > 0 ? (scrollTop / docHeight) * 100 : 0);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="w-full bg-transparent" style={{ height }}>
      <div
        className="h-full transition-all duration-150 ease-out"
        style={{
          width: `${progress}%`,
          backgroundColor: color || `hsl(var(--primary))`,
        }}
      />
    </div>
  );
};

export default ScrollProgressBar;
