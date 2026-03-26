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
  const base = import.meta.env.VITE_API_URL ?? "";
  return base.replace(/\/$/, "");
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const headers = new Headers(init?.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init?.body != null && typeof init.body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${apiBase()}${path}`, { ...init, headers });
  const json = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    message?: string;
    data?: T;
  };

  if (!res.ok || json.success === false) {
    throw new Error(typeof json.message === "string" ? json.message : res.statusText);
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
