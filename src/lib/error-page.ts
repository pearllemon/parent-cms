// Minimal standalone HTML shown when SSR fails catastrophically.
export function renderErrorPage(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Something went wrong</title>
    <style>
      body { margin:0; min-height:100vh; display:grid; place-items:center; background:#0b0b0c; color:#f5f5f5;
             font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; }
      .card { max-width: 32rem; padding: 2rem; text-align: center; }
      h1 { font-size: 1.25rem; margin: 0 0 .5rem; }
      p { margin: 0 0 1.5rem; color: #a1a1aa; font-size: .875rem; }
      a { display:inline-block; padding:.5rem 1rem; border-radius:.5rem; background:#f5f5f5; color:#0b0b0c;
          text-decoration:none; font-size:.875rem; font-weight:500; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>This page didn't load</h1>
      <p>Something went wrong on our end. Try refreshing the page.</p>
      <a href="/">Go home</a>
    </div>
  </body>
</html>`;
}
