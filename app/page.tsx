"use client";

import { useState } from "react";

export default function Home() {
  const [targetUrl, setTargetUrl] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [proxyUrl, setProxyUrl] = useState("");

  async function handleSubmit(e: { preventDefault: () => void }) {
    e.preventDefault();

    if (!targetUrl) return;

    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/create-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUrl }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus("success");
        setProxyUrl(data.proxyUrl);
        setMessage(data.message || "Proxy created successfully");
      } else {
        setStatus("error");
        setMessage(data.error || "Failed to create proxy");
      }
    } catch (error: any) {
      setStatus("error");
      setMessage("Failed to create proxy: " + error.message);
    }
  }

  function openProxy() {
    if (proxyUrl) {
      window.open(proxyUrl, "_blank");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 sm:p-8">
      <div className="w-full max-w-lg rounded-xl bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-2xl font-semibold text-gray-900">
          Solidify
        </h1>
        <p className="mb-8 text-sm text-gray-500">
          Web page caching proxy with Service Worker
        </p>

        {message && (
          <div
            className={`mb-6 rounded-lg px-4 py-3 text-sm ${
              status === "success"
                ? "bg-green-50 text-green-700"
                : status === "error"
                  ? "bg-red-50 text-red-700"
                  : "hidden"
            }`}
          >
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="targetUrl"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              Target URL
            </label>
            <input
              type="url"
              id="targetUrl"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="https://example.com"
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={status === "loading" || !targetUrl}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "loading" ? "Creating..." : "Create Proxy"}
          </button>
        </form>

        {proxyUrl && (
          <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
              Proxy URL
            </p>
            <p className="mb-3 break-all text-sm text-gray-900">{proxyUrl}</p>
            <button
              onClick={openProxy}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
            >
              Open Proxy
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
