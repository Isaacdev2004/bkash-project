const TOKEN_KEY = "qp_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

function apiBase(): string {
  const raw = import.meta.env.VITE_API_URL;
  const base = typeof raw === "string" ? raw.trim() : "";
  return base.replace(/\/$/, "");
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const base = apiBase();
  if (path.startsWith("/api") && import.meta.env.PROD && !base) {
    throw new Error(
      "Backend URL is not set. In Vercel: Project → Settings → Environment Variables → add VITE_API_URL = https://your-api-host (no trailing slash), then Redeploy. Example: https://your-app.onrender.com"
    );
  }

  const token = getToken();
  const headers = new Headers(init?.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init?.body != null && typeof init.body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const url = `${base}${path}`;
  const res = await fetch(url, { ...init, headers });
  const contentType = res.headers.get("content-type") || "";
  if (path.startsWith("/api") && contentType.includes("text/html")) {
    throw new Error(
      "The server returned a web page instead of API data. Usually VITE_API_URL is missing on Vercel or points to the wrong host — set it to your Express API base URL and redeploy."
    );
  }

  const json = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    message?: string;
    data?: T;
  };

  if (!res.ok || json.success === false) {
    throw new Error(typeof json.message === "string" ? json.message : res.statusText);
  }

  if (json.data === undefined && path.startsWith("/api")) {
    throw new Error("Invalid API response. Check VITE_API_URL and that your backend is running.");
  }

  return json.data as T;
}

/** Coalesce duplicate execute calls (e.g. React Strict Mode double mount). */
const executeInFlight = new Map<string, Promise<{ receipt: PaymentReceipt }>>();

export type PaymentReceipt = {
  transactionId: string;
  bkashTrxId: string | null;
  amount: number;
  status: string;
  date: string;
};

export function executePaymentDeduped(paymentID: string) {
  const existing = executeInFlight.get(paymentID);
  if (existing) return existing;

  const p = apiFetch<{ receipt: PaymentReceipt }>("/api/payment/execute", {
    method: "POST",
    body: JSON.stringify({ paymentID }),
  }).finally(() => {
    executeInFlight.delete(paymentID);
  });

  executeInFlight.set(paymentID, p);
  return p;
}
