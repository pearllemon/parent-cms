import { ClientOnly } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BrowserRouter } from "react-router-dom";

type AdminBundle = typeof import("../admin-bundle/entry");

export function AdminPage() {
  return (
    <ClientOnly fallback={<div className="min-h-screen bg-background" />}>
      <BrowserRouter>
        <AdminClientApp />
      </BrowserRouter>
    </ClientOnly>
  );
}

function AdminClientApp() {
  const [bundle, setBundle] = useState<AdminBundle | null>(null);

  useEffect(() => {
    let cancelled = false;
    void import("../admin-bundle/entry").then((loaded) => {
      if (!cancelled) setBundle(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!bundle) return <div className="min-h-screen bg-background" />;
  const { AdminApp } = bundle;
  return <AdminApp />;
}
