export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Static assets and files with extensions pass through
  if (/\.[a-z0-9]+$/i.test(pathname)) {
    return context.next();
  }

  // For everything else (SPA routes), serve index.html
  return context.env.ASSETS.fetch(new Request(new URL("/index.html", url.origin).toString()));
}
