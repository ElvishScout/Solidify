import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const hostname = request.headers.get("host") || "";
  const host = hostname.split(":")[0];
  const parts = host.split(".");

  if (parts.length >= 3 && parts[1] === "proxy") {
    const proxyId = parts[0];

    // SW is served from public/ directly
    if (request.nextUrl.pathname === "/sw.js") {
      return NextResponse.next();
    }

    const targetOrigin = request.headers.get("x-solidify-target");

    if (targetOrigin) {
      // Proxied by SW — fetch from target
      const target = `${targetOrigin}${request.nextUrl.pathname}${request.nextUrl.search}`;

      try {
        const proxyHeaders = new Headers(request.headers);
        proxyHeaders.delete("x-solidify-target");
        proxyHeaders.delete("host");
        proxyHeaders.delete("connection");
        proxyHeaders.delete("keep-alive");
        proxyHeaders.delete("transfer-encoding");

        const proxyResponse = await fetch(target, {
          method: request.method,
          headers: proxyHeaders,
          body:
            request.method !== "GET" && request.method !== "HEAD"
              ? await request.text()
              : undefined,
          redirect: "follow",
        });

        const responseHeaders = new Headers(proxyResponse.headers);
        responseHeaders.set("access-control-allow-origin", "*");
        responseHeaders.delete("keep-alive");
        responseHeaders.delete("transfer-encoding");
        responseHeaders.delete("content-encoding");
        responseHeaders.delete("content-length");

        return new Response(proxyResponse.body, {
          status: proxyResponse.status,
          statusText: proxyResponse.statusText,
          headers: responseHeaders,
        });
      } catch (error) {
        return new Response(
          JSON.stringify({
            error: "Proxy error: " + (error instanceof Error ? error.message : String(error)),
          }),
          { status: 502, headers: { "content-type": "application/json" } }
        );
      }
    }

    // First visit with init data — rewrite to activation page (no redirect)
    const initParam = request.nextUrl.searchParams.get("__init");
    if (initParam) {
      const originalPath = request.nextUrl.pathname;
      const params = new URLSearchParams(request.nextUrl.search);
      params.delete("__init");
      const cleanQuery = params.toString();
      const redirectPath = originalPath + (cleanQuery ? "?" + cleanQuery : "");

      const url = request.nextUrl.clone();
      url.pathname = `/proxy/${proxyId}/`;
      url.search = `?__init=${encodeURIComponent(initParam)}&redirect=${encodeURIComponent(redirectPath)}`;
      return NextResponse.rewrite(url);
    }

    // No SW, no init — rewrite to route handler (will 404)
    const url = request.nextUrl.clone();
    url.pathname = `/proxy/${proxyId}${url.pathname}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!proxy/|_next/|favicon.ico).*)",
  ],
};
