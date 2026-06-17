import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function Landing() {
  return (
    <div className="site-theme-root min-h-screen flex flex-col items-center justify-center bg-background text-foreground px-6">
      <div className="max-w-xl text-center space-y-6">
        <p className="uppercase tracking-[0.3em] text-xs text-muted-foreground">Parent CMS</p>
        <h1 className="text-4xl md:text-5xl font-semibold">CMS control plane</h1>
        <p className="text-muted-foreground">
          This project is the upstream CMS framework. Child websites install from this repo and pull updates through the admin.
        </p>
        <div className="flex gap-3 justify-center">
          <Button asChild>
            <Link to="/admin">Open Admin</Link>
          </Button>
          <Button asChild variant="outline">
            <a href="https://github.com/pearllemon/parent-cms" target="_blank" rel="noreferrer">
              View on GitHub
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
