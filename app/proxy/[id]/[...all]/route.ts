import { NextRequest } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; all: string[] }> }
) {
  const { all } = await params;
  // All valid paths are handled by middleware proxy.ts; fallback = 404
  return new Response(
    JSON.stringify({ error: "Proxy not found or expired", path: all.join("/") }),
    { status: 404, headers: { "content-type": "application/json" } }
  );
}
