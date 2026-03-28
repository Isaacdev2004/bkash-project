import { useState, useCallback, FormEvent, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, getToken } from "@/lib/api";
import { BrandMark } from "@/components/BrandMark";

type UiStatus = "idle" | "creating" | "error";

const Payment = () => {
  const navigate = useNavigate();
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<UiStatus>("idle");
  const [error, setError] = useState("");
  const isBusy = status === "creating";

  useEffect(() => {
    if (!getToken()) {
      navigate("/", { replace: true });
      return;
    }

    let cancelled = false;
    apiFetch<{ user: { id: string; email: string } }>("/api/auth/me").catch(() => {
      if (!cancelled) navigate("/", { replace: true });
    });

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const onAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (/^\d*\.?\d{0,2}$/.test(val)) setAmount(val);
  }, []);

  const onSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      const num = parseFloat(amount);
      if (!num || num <= 0) return;

      setError("");
      setStatus("creating");
      try {
        const callbackURL = `${window.location.origin}/pay/callback`;
        const data = await apiFetch<{
          bkashURL: string;
          transactionId: string;
        }>("/api/payment/create", {
          method: "POST",
          body: JSON.stringify({ amount: num, callbackURL }),
        });
        window.location.assign(data.bkashURL);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Could not start payment";
        setError(message);
        setStatus("error");
      }
    },
    [amount]
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-4 py-3 flex items-center justify-between border-b border-border">
        <BrandMark className="h-10 max-h-11 max-w-[min(100%,240px)]" />
        <button type="button" onClick={() => navigate("/dashboard")} className="text-xs text-primary font-medium hover:underline">
          ← Dashboard
        </button>
      </header>

      <main className="flex-1 flex items-start justify-center px-4 py-6 overflow-y-auto">
        <div className="w-full max-w-sm space-y-5">
          <div className="bg-card rounded-xl shadow-lg border border-border p-6 sm:p-8">
            <h1 className="text-xl font-bold text-card-foreground mb-2">Make a Payment</h1>
            <p className="text-sm text-muted-foreground mb-6">
              You will be redirected to bKash to complete payment. After paying, you will return here to confirm.
            </p>

            <form onSubmit={onSubmit} className="space-y-5">
              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-muted-foreground mb-2">
                  Amount (BDT)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-lg">৳</span>
                  <input
                    id="amount"
                    type="text"
                    inputMode="decimal"
                    placeholder="Enter amount"
                    value={amount}
                    onChange={onAmountChange}
                    disabled={isBusy}
                    autoComplete="off"
                    className="w-full pl-10 pr-4 py-4 text-lg rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 transition-colors"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">Minimum amount: ৳1.00</p>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <button
                type="submit"
                disabled={isBusy || !amount || parseFloat(amount) <= 0}
                className="w-full py-4 rounded-lg bg-primary text-primary-foreground font-semibold text-base disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
              >
                {isBusy ? (
                  <>
                    <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
                    <span>Starting…</span>
                  </>
                ) : (
                  "Pay with bKash"
                )}
              </button>
            </form>

            {status === "error" && (
              <button
                type="button"
                onClick={() => {
                  setStatus("idle");
                  setError("");
                }}
                className="w-full mt-4 py-3 rounded-lg border border-border text-muted-foreground text-sm font-medium active:scale-[0.98] transition-transform hover:bg-muted"
              >
                Try Again
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Payment;
