import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";

export default function Register() {
  const router = useRouter();
  const [formData, setFormData] = useState({ name: "", email: "", password: "", role: "student" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.message || "Registration failed");

      // Automatically log them in and route to their dashboard
      if (formData.role === "instructor") router.push("/staff/dashboard");
      else router.push("/student/dashboard");
      
    } catch (err: any) {
      setError(err.message || "Failed to create account.");
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
            <h2 className="mt-8 text-3xl font-extrabold text-fg tracking-tight">Create your account</h2>
            <p className="mt-2 text-sm text-fg-muted">
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-brand-600 hover:text-brand-500 transition-colors">
                Sign in
              </Link>
            </p>
          </div>

          <div className="mt-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {error && (
                <div className="bg-error/10 border border-error/20 text-error text-sm p-3 rounded-lg">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="name" className="block text-sm font-medium text-fg">Full Name</label>
                <div className="mt-1">
                  <input
                    id="name" type="text" required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="appearance-none block w-full px-4 py-3 border border-border rounded-lg shadow-sm placeholder-fg-subtle focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-fg"
                    placeholder="Jane Doe"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-fg">Email address</label>
                <div className="mt-1">
                  <input
                    id="email" type="email" required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="appearance-none block w-full px-4 py-3 border border-border rounded-lg shadow-sm placeholder-fg-subtle focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-fg"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-fg">Password</label>
                <div className="mt-1">
                  <input
                    id="password" type="password" required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="appearance-none block w-full px-4 py-3 border border-border rounded-lg shadow-sm placeholder-fg-subtle focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-fg"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="role" className="block text-sm font-medium text-fg">I am joining as a...</label>
                <div className="mt-1">
                  <select
                    id="role"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="block w-full px-4 py-3 border border-border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-fg bg-white"
                  >
                    <option value="student">Student</option>
                    <option value="instructor">Instructor</option>
                  </select>
                </div>
              </div>

              <div>
                <button
                  type="submit" disabled={loading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 transition-colors mt-2"
                >
                  {loading ? "Creating account..." : "Create account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Right Side: Image */}
      <div className="hidden lg:block relative w-0 flex-1">
        <img
          className="absolute inset-0 h-full w-full object-cover"
          src="/images/education/collaborative-learning.jpg"
          alt="Collaborative learning"
        />
        <div className="absolute inset-0 bg-brand-800 mix-blend-multiply opacity-40" />
        <div className="absolute bottom-12 left-12 right-12 text-white">
          <blockquote className="text-2xl font-serif italic leading-relaxed">
            "The beautiful thing about learning is that no one can take it away from you."
          </blockquote>
          <p className="mt-4 font-medium">— B.B. King</p>
        </div>
      </div>
    </div>
  );
}
