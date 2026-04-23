import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import Layout from "@/components/site/Layout";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <Layout>
      <section className="container py-24 md:py-32 text-center max-w-2xl">
        <div className="font-display text-[8rem] md:text-[12rem] leading-none text-primary">404</div>
        <h1 className="font-display text-3xl md:text-4xl mt-2">Page not found</h1>
        <p className="text-muted-foreground mt-4">
          That route doesn’t exist on this site. Let’s get you back to something useful.
        </p>
        <div className="flex flex-wrap gap-3 justify-center mt-8">
          <Button asChild><Link to="/">Back home</Link></Button>
          <Button asChild variant="outline"><Link to="/contact">Contact me</Link></Button>
        </div>
      </section>
    </Layout>
  );
};

export default NotFound;
