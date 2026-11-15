import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.detail || data.message || "Invalid credentials");

      // Middleware handles the redirect based on role if we just go to /student
      // But we can be smart and read the role from the response if provided.
      const role = data.role || data.user?.role;
      if (role === "admin") router.push("/admin/dashboard");
      else if (role === "staff" || role === "instructor") router.push("/staff/dashboard");
      else router.push("/student/dashboard");
      
    } catch (err: any) {
      setError(err.message || "Failed to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white font-sans">
      
      {/* Left Side: Form */}
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:flex-none lg:px-20 xl:px-24 w-full lg:w-1/2">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          
          <div>
            <Link href="/" className="text-2xl font-bold text-brand-800 tracking-tight">
              Learn<span className="text-brand-600">.</span>
            </Link>
            <h2 className="mt-8 text-3xl font-extrabold text-fg tracking-tight">Sign in to your account</h2>
            <p className="mt-2 text-sm text-fg-muted">
              Don't have an account?{" "}
              <Link href="/register" className="font-medium text-brand-600 hover:text-brand-500 transition-colors">
                Create one now
              </Link>
            </p>
          </div>

          <div className="mt-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {error && (
                <div className="bg-error/10 border border-error/20 text-error text-sm p-3 rounded-lg">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-fg">Email address</label>
                <div className="mt-1">
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="appearance-none block w-full px-4 py-3 border border-border rounded-lg shadow-sm placeholder-fg-subtle focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-fg"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-fg">Password</label>
                <div className="mt-1">
                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="appearance-none block w-full px-4 py-3 border border-border rounded-lg shadow-sm placeholder-fg-subtle focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-fg"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input id="remember-me" name="remember-me" type="checkbox" className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-border rounded" />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-fg">Remember me</label>
                </div>
                <div className="text-sm">
                  <Link href="/forgot-password" className="font-medium text-brand-600 hover:text-brand-500">
                    Forgot your password?
                  </Link>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 transition-colors"
                >
                  {loading ? "Signing in..." : "Sign in"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Right Side: Image (Hidden on Mobile) */}
      <div className="hidden lg:block relative w-0 flex-1">
        <img
          className="absolute inset-0 h-full w-full object-cover"
          src="/images/education/library-study-support.jpg"
          alt="Students studying in library"
        />
        <div className="absolute inset-0 bg-brand-800 mix-blend-multiply opacity-40" />
        <div className="absolute bottom-12 left-12 right-12 text-white">
          <blockquote className="text-2xl font-serif italic leading-relaxed">
            "Education is the most powerful weapon which you can use to change the world."
          </blockquote>
          <p className="mt-4 font-medium">— Nelson Mandela</p>
        </div>
      </div>
    </div>
  );
}
