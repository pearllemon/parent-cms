import { ReactNode } from "react";
import { useReveal } from "@/hooks/use-reveal";

type Props = {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "section" | "article" | "header";
};

const Reveal = ({ children, delay = 0, className = "", as: As = "div" }: Props) => {
  const { ref, shown } = useReveal();
  return (
    <As
      ref={ref as never}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform ${
        shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
      } ${className}`}
    >
      {children}
    </As>
  );
};

export default Reveal;
