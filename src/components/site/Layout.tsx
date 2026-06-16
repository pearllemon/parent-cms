import { Link } from "react-router-dom";

const Layout = ({ children }: { children: React.ReactNode }) => (
  <div className="flex min-h-screen flex-col bg-background text-foreground">
    <header className="border-b">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="font-semibold">Parent CMS</Link>
        <Link to="/admin" className="text-sm text-muted-foreground hover:text-foreground">Admin</Link>
      </div>
    </header>
    <main className="flex-1">{children}</main>
  </div>
);

export default Layout;
