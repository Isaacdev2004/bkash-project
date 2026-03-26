import { useEffect, useState, useRef, useCallback, type RefObject } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { executePaymentDeduped, getToken, type PaymentReceipt } from "@/lib/api";

type Phase = "working" | "success" | "failed" | "auth" | "missing";

function ReceiptView({
  receipt,
  printRef,
}: {
  receipt: PaymentReceipt;
  printRef: RefObject<HTMLDivElement | null>;
}) {
  const d = new Date(receipt.date);
  return (
    <div ref={printRef}>
      <div className="receipt-box border border-border rounded-xl p-6">
        <div className="text-center mb-4">
          <p className="font-bold text-lg m-0">QuickPay</p>
          <p className="text-xs text-muted-foreground m-0 mt-0.5">Payment Receipt</p>
        </div>
        <hr className="border-dashed border-border my-4" />
        <div className="flex justify-between py-1.5 text-sm">
          <span className="text-muted-foreground">Reference</span>
          <span className="font-semibold text-right break-all max-w-[60%]">{receipt.transactionId}</span>
        </div>
        {receipt.bkashTrxId && (
          <div className="flex justify-between py-1.5 text-sm">
            <span className="text-muted-foreground">bKash trx ID</span>
            <span className="font-semibold text-right break-all max-w-[60%]">{receipt.bkashTrxId}</span>
          </div>
        )}
        <div className="flex justify-between py-1.5 text-sm">
          <span className="text-muted-foreground">Date</span>
          <span className="font-semibold">
            {d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
          </span>
        </div>
        <div className="flex justify-between py-1.5 text-sm">
          <span className="text-muted-foreground">Time</span>
          <span className="font-semibold">
            {d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}
          </span>
        </div>
        <div className="flex justify-between py-1.5 text-sm">
          <span className="text-muted-foreground">Method</span>
          <span className="font-semibold">bKash</span>
        </div>
        <div className="flex justify-between py-1.5 text-sm">
          <span className="text-muted-foreground">Status</span>
          <span className="font-semibold text-success">Successful</span>
        </div>
        <hr className="border-dashed border-border my-4" />
        <p className="text-center text-xl font-bold m-0">
          ৳{receipt.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </p>
        <hr className="border-dashed border-border my-4" />
        <p className="text-center text-[11px] text-muted-foreground m-0">Thank you for your payment</p>
        <p className="text-center text-[11px] text-muted-foreground mt-1 m-0">Secured by bKash · QuickPay</p>
      </div>
    </div>
  );
}

const PaymentCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("working");
  const [message, setMessage] = useState("");
  const [receipt, setReceipt] = useState<PaymentReceipt | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  const paymentID =
    searchParams.get("paymentID") ||
    searchParams.get("paymentId") ||
    searchParams.get("payment_id") ||
    "";

  const bkashStatus = (searchParams.get("status") || "").toLowerCase();

  useEffect(() => {
    if (!getToken()) {
      setPhase("auth");
      setMessage("Sign in again to complete this payment.");
      return;
    }

    if (!paymentID) {
      if (bkashStatus === "cancel" || bkashStatus === "failure" || bkashStatus === "failed") {
        setPhase("failed");
        setMessage("Payment was cancelled or did not complete.");
        return;
      }
      setPhase("missing");
      setMessage("Missing payment reference. Return to the payment page and try again.");
      return;
    }

    setPhase("working");
    setMessage("");
    let cancelled = false;
    executePaymentDeduped(paymentID)
      .then((data) => {
        if (!cancelled) {
          setReceipt(data.receipt);
          setPhase("success");
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : "Payment could not be confirmed.";
          setMessage(msg);
          setPhase("failed");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [paymentID, bkashStatus]);

  const printReceipt = useCallback(() => {
    if (!receiptRef.current) return;
    const content = receiptRef.current.innerHTML;
    const win = window.open("", "_blank", "width=400,height=600");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Receipt</title><style>
      body{font-family:-apple-system,system-ui,sans-serif;padding:24px;max-width:360px;margin:0 auto;color:#1a1a1a}
      .receipt-box{border:1px solid #ddd;border-radius:12px;padding:24px}
      .divider{border:none;border-top:1px dashed #ccc;margin:16px 0}
      @media print{body{padding:0}}
    </style></head><body>${content}<script>window.print();</script></body></html>`);
    win.document.close();
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-4 py-3 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">Q</span>
          </div>
          <span className="font-semibold text-foreground text-lg">QuickPay</span>
        </div>
      </header>

      <main className="flex-1 flex items-start justify-center px-4 py-8">
        <div className="w-full max-w-sm space-y-4">
          {phase === "working" && (
            <div className="bg-card rounded-xl border border-border p-8 text-center">
              <div className="spinner mx-auto mb-4" style={{ width: 28, height: 28, borderWidth: 2 }} />
              <p className="text-sm text-muted-foreground">Confirming payment with bKash…</p>
            </div>
          )}

          {phase === "auth" && (
            <div className="bg-card rounded-xl border border-border p-6 text-center space-y-4">
              <p className="text-sm text-card-foreground">{message}</p>
              <button
                type="button"
                onClick={() => navigate("/", { replace: true })}
                className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm"
              >
                Sign In
              </button>
            </div>
          )}

          {(phase === "failed" || phase === "missing") && (
            <div className="bg-card rounded-xl border border-border p-6 text-center space-y-4">
              <p className="text-sm text-destructive font-medium">{message}</p>
              <button
                type="button"
                onClick={() => navigate("/pay")}
                className="w-full py-3 rounded-lg border border-border text-sm font-medium hover:bg-muted"
              >
                Back to Payment
              </button>
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="w-full py-3 rounded-lg bg-primary text-primary-foreground text-sm font-semibold"
              >
                Dashboard
              </button>
            </div>
          )}

          {phase === "success" && receipt && (
            <>
              <div className="bg-card rounded-xl border border-border p-6">
                <p className="text-center text-success font-semibold mb-4">Payment successful</p>
                <ReceiptView receipt={receipt} printRef={receiptRef} />
                <button
                  type="button"
                  onClick={printReceipt}
                  className="w-full mt-4 py-3 rounded-lg border border-primary text-primary text-sm font-semibold hover:bg-primary/5"
                >
                  Print / Save receipt
                </button>
              </div>
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold"
              >
                Go to Dashboard
              </button>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default PaymentCallback;
