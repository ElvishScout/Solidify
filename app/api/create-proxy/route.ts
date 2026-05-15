import { NextResponse } from "next/server";

const DOMAIN = "localhost:3000";

export async function POST(request: Request) {
  try {
    const { targetUrl } = await request.json();

    if (!targetUrl) {
      return NextResponse.json({ error: "targetUrl is required" }, { status: 400 });
    }

    // Validate URL
    let parsed: URL;
    try {
      parsed = new URL(targetUrl);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    if (!["http:", "https:"].includes(parsed.protocol)) {
      return NextResponse.json({ error: "Only http and https URLs are supported" }, { status: 400 });
    }

    // Generate short proxy ID
    const bytes = new Uint8Array(6);
    crypto.getRandomValues(bytes);
    const proxyId = Array.from(bytes)
      .map((b) => b.toString(36).padStart(2, "0"))
      .join("")
      .slice(0, 8);

    // Encode the full target URL for the init step
    const encoded = Buffer.from(targetUrl).toString("base64url");

    // Preserve original path and query, append __init
    const pathAndQuery = parsed.pathname + parsed.search;
    const separator = parsed.search ? "&" : "?";
    const proxyUrl = `http://${proxyId}.proxy.${DOMAIN}${pathAndQuery}${separator}__init=${encoded}`;

    return NextResponse.json({
      success: true,
      proxyId,
      proxyUrl,
      message: "Proxy created",
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create proxy: " + (error instanceof Error ? error.message : String(error)) },
      { status: 500 },
    );
  }
}
