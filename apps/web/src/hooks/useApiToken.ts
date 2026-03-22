"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useCallback } from "react";

export function useApiToken(): string | null {
  const { data: session, status } = useSession();
  const [token, setToken] = useState<string | null>(null);

  const fetchToken = useCallback(async () => {
    if (status !== "authenticated" || !session) {
      setToken(null);
      return;
    }
    try {
      const res = await fetch("/api/auth/token", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        if (data?.token) setToken(data.token);
        else setToken(null);
      } else {
        const err = await res.json().catch(() => ({}));
        console.warn("[useApiToken] Token alinamadi:", res.status, err);
        setToken(null);
      }
    } catch (e) {
      console.warn("[useApiToken] Hata:", e);
      setToken(null);
    }
  }, [session, status]);

  useEffect(() => {
    void fetchToken();
  }, [fetchToken]);

  return token;
}
