"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function Activation() {
  const searchParams = useSearchParams();
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const initParam = searchParams.get("__init");
    const redirectParam = searchParams.get("redirect") || "/";

    if (!initParam) {
      const at = window.location.pathname + window.location.search;
      if (redirectParam !== at) window.location.href = redirectParam;
      return;
    }

    let targetUrl: string;
    try {
      targetUrl = atob(initParam);
    } catch {
      window.location.href = redirectParam;
      return;
    }

    let targetOrigin: string;
    try {
      targetOrigin = new URL(targetUrl).origin;
    } catch {
      window.location.href = redirectParam;
      return;
    }

    if (!("serviceWorker" in navigator)) {
      window.location.href = redirectParam;
      return;
    }

    const timer = setTimeout(() => setShow(true), 300);

    (async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        await navigator.serviceWorker.ready;

        if (reg.active) {
          reg.active.postMessage({ type: "SET_TARGET", targetUrl: targetOrigin });
        }

        await new Promise((r) => setTimeout(r, 100));
        clearTimeout(timer);
        window.location.href = redirectParam;
      } catch (err: unknown) {
        clearTimeout(timer);
        setShow(true);
        setError(err instanceof Error ? err.message : String(err));
      }
    })();
  }, [searchParams]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div
      className={`flex min-h-screen items-center justify-center bg-gray-50 transition-opacity duration-200 ${
        show ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-gray-200 border-t-blue-600" />
        <p className="text-sm text-gray-500">Setting up proxy...</p>
      </div>
    </div>
  );
}

export default function ProxyActivationPage() {
  return (
    <Suspense fallback={null}>
      <Activation />
    </Suspense>
  );
}
