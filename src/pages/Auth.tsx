import { useState, FormEvent, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, getToken, setToken } from "@/lib/api";
import { BrandMark } from "@/components/BrandMark";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    apiFetch<{ user: { id: string; email: string } }>("/api/auth/me")
      .then(() => navigate("/dashboard", { replace: true }))
      .catch(() => {
        /* invalid token */
      });
  }, [navigate]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isLogin) {
        const data = await apiFetch<{ token: string; user: { id: string; email: string } }>(
          "/api/auth/login",
          { method: "POST", body: JSON.stringify({ email, password }) }
        );
        setToken(data.token);
        navigate("/dashboard");
      } else {
        const data = await apiFetch<{ token: string; user: { id: string; email: string } }>(
          "/api/auth/signup",
          { method: "POST", body: JSON.stringify({ email, password }) }
        );
        setToken(data.token);
        navigate("/dashboard");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-4 py-3 flex items-center border-b border-border">
        <BrandMark className="h-10 max-h-12 max-w-[min(100%,280px)]" />
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="bg-card rounded-xl shadow-lg border border-border p-6 sm:p-8 w-full max-w-sm">
          <h1 className="text-xl font-bold text-card-foreground mb-1">
            {isLogin ? "Welcome back" : "Create account"}
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            {isLogin ? "Sign in to your Aurthayon account" : "Sign up to start making payments"}
          </p>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-muted-foreground mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-muted-foreground mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={8}
                maxLength={128}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">At least 8 characters</p>
            </div>

            {error && (
              <p className="text-xs font-medium text-destructive">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-50 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                  <span>Please wait…</span>
                </>
              ) : isLogin ? "Sign In" : "Sign Up"}
            </button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-5">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError("");
              }}
              className="text-primary font-medium hover:underline"
            >
              {isLogin ? "Sign Up" : "Sign In"}
            </button>
          </p>
        </div>
      </main>
    </div>
  );
};

export default Auth;
