import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, clearToken, getToken } from "@/lib/api";
import { BrandMark } from "@/components/BrandMark";

interface Transaction {
  id: string;
  amount: number;
  status: "pending" | "processing" | "success" | "failed";
  transactionId: string;
  createdAt: string;
}

function rowStatus(s: Transaction["status"]): "pending" | "success" | "failed" {
  if (s === "processing") return "pending";
  return s;
}

function formatTxDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function formatTxTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function statusDotClass(s: Transaction["status"]) {
  const r = rowStatus(s);
  if (r === "success") return "bg-success";
  if (r === "failed") return "bg-destructive";
  return "bg-muted-foreground";
}

function statusTextClass(s: Transaction["status"]) {
  const r = rowStatus(s);
  if (r === "success") return "text-success";
  if (r === "failed") return "text-destructive";
  return "text-muted-foreground";
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      navigate("/", { replace: true });
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        await apiFetch<{ user: { id: string; email: string } }>("/api/auth/me");
        const rows = await apiFetch<Transaction[]>("/api/payment/mine");
        if (!cancelled) setTransactions(rows);
      } catch {
        if (!cancelled) {
          clearToken();
          navigate("/", { replace: true });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const stats = {
    total: transactions.length,
    successful: transactions.filter((t) => t.status === "success").length,
    totalAmount: transactions.filter((t) => t.status === "success").reduce((s, t) => s + t.amount, 0),
    successRate: transactions.length
      ? Math.round((transactions.filter((t) => t.status === "success").length / transactions.length) * 100)
      : 0,
  };

  const handleLogout = () => {
    clearToken();
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-4 py-3 flex items-center justify-between border-b border-border">
        <BrandMark className="h-10 max-h-11 max-w-[min(100%,240px)]" />
        <button type="button" onClick={handleLogout} className="text-xs text-muted-foreground hover:text-foreground font-medium">
          Sign Out
        </button>
      </header>

      <main className="flex-1 px-4 py-6 sm:py-8 max-w-2xl mx-auto w-full space-y-6">
        <h1 className="text-xl font-bold text-foreground">Dashboard</h1>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-card rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground font-medium">Total Payments</p>
            <p className="text-2xl font-bold text-card-foreground mt-1">{loading ? "…" : stats.total}</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground font-medium">Successful</p>
            <p className="text-2xl font-bold text-success mt-1">{loading ? "…" : stats.successful}</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground font-medium">Amount Sent</p>
            <p className="text-2xl font-bold text-card-foreground mt-1">
              {loading ? "…" : `৳${stats.totalAmount.toLocaleString()}`}
            </p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground font-medium">Success Rate</p>
            <p className="text-2xl font-bold text-card-foreground mt-1">{loading ? "…" : `${stats.successRate}%`}</p>
          </div>
        </div>

        {/* Recent Activity */}
        {!loading && transactions.length > 0 && (
          <div className="bg-card rounded-xl border border-border p-5">
            <h3 className="text-sm font-semibold text-card-foreground mb-3">Recent Activity</h3>
            <div className="space-y-2">
              {transactions.slice(0, 10).map((tx) => (
                <div key={tx.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-2 h-2 shrink-0 rounded-full ${statusDotClass(tx.status)}`} />
                    <span className="text-sm text-card-foreground font-medium truncate">
                      ৳{tx.amount.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-xs font-medium capitalize ${statusTextClass(tx.status)}`}>
                      {rowStatus(tx.status)}
                    </span>
                    <span className="text-xs text-muted-foreground">{formatTxDate(tx.createdAt)}</span>
                    <span className="text-xs text-muted-foreground">{formatTxTime(tx.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && transactions.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">No payments yet. Make your first payment below.</p>
        )}

        {/* Pay Button */}
        <button
          type="button"
          onClick={() => navigate("/pay")}
          className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-semibold text-base active:scale-[0.98] transition-transform"
        >
          Make a Payment
        </button>

        <p className="text-center text-xs text-muted-foreground">
          Secured by bKash · Aurthayon
        </p>
      </main>
    </div>
  );
};

export default Dashboard;
