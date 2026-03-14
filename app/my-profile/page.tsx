"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AuthGuard from "@/components/auth/auth-guard";
import {
  getProfileSummary,
  updateDisplayName,
  updatePassword,
} from "@/lib/account";
import { clearLegacyLovoraLocalData, supabase } from "@/lib/supabase";

type Summary = Awaited<ReturnType<typeof getProfileSummary>>;

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
      <div className="text-[11px] uppercase tracking-[0.24em] text-white/40">{label}</div>
      <div className="mt-3 text-2xl font-semibold text-white">{value}</div>
    </div>
  );
}

export default function MyProfilePage() {
  const router = useRouter();

  const [summary, setSummary] = useState<Summary | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingName, setSavingName] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const nextSummary = await getProfileSummary();
      setSummary(nextSummary);
      setDisplayName(nextSummary.profile.display_name ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load profile.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleNameSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingName) return;

    setSavingName(true);
    setBanner(null);
    setError(null);

    try {
      await updateDisplayName(displayName);
      setBanner("Display name updated.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update name.");
    } finally {
      setSavingName(false);
    }
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingPassword) return;

    setSavingPassword(true);
    setBanner(null);
    setError(null);

    try {
      if (password.trim().length < 8) {
        throw new Error("Password must be at least 8 characters.");
      }

      await updatePassword(password);
      setPassword("");
      setBanner("Password updated successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update password.");
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleLogout(scope: "local" | "global") {
    if (signingOut) return;

    setSigningOut(true);
    setError(null);

    try {
      await supabase.auth.signOut({ scope });
      clearLegacyLovoraLocalData();
      router.replace("/login");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign out.");
      setSigningOut(false);
    }
  }

  return (
    <AuthGuard>
      <main className="min-h-screen bg-[#07070b] px-6 py-12 text-white">
        <div className="mx-auto max-w-6xl space-y-8">
          <header className="relative overflow-hidden rounded-[36px] border border-white/10 bg-white/[0.04] p-8 backdrop-blur md:p-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.05),transparent_30%)]" />
            <div className="relative space-y-4">
              <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[11px] uppercase tracking-[0.28em] text-white/55">
                My Profile
              </div>
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
                Your account, identity, and session control
              </h1>
              <p className="max-w-2xl text-base leading-7 text-white/65">
                Manage your email-linked identity, update security settings, and control
                active sessions from one premium account surface.
              </p>
            </div>
          </header>

          {error ? (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          {banner ? (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
              {banner}
            </div>
          ) : null}

          {loading || !summary ? (
            <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 text-white/70">
              Loading profile...
            </div>
          ) : (
            <>
              <section className="grid gap-4 md:grid-cols-3">
                <StatCard label="Email" value={summary.user.email ?? "-"} />
                <StatCard label="Custom Characters" value={summary.characterCount} />
                <StatCard label="Custom Conversations" value={summary.conversationCount} />
              </section>

              <section className="grid gap-6 lg:grid-cols-2">
                <form
                  onSubmit={handleNameSubmit}
                  className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6"
                >
                  <div className="space-y-2">
                    <h2 className="text-2xl font-semibold tracking-tight">Public profile</h2>
                    <p className="text-sm leading-6 text-white/60">
                      This is the main identity layer for your account metadata and future
                      social surfaces.
                    </p>
                  </div>

                  <div className="mt-5 space-y-2">
                    <label htmlFor="displayName" className="block text-sm text-white/80">
                      Display name
                    </label>
                    <input
                      id="displayName"
                      value={displayName}
                      onChange={(event) => setDisplayName(event.target.value)}
                      className="h-12 w-full rounded-2xl border border-white/10 bg-black/30 px-4 text-white outline-none transition focus:border-white/30"
                      placeholder="Your name"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={savingName}
                    className="mt-5 h-12 rounded-2xl bg-white px-5 font-medium text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingName ? "Saving..." : "Save display name"}
                  </button>
                </form>

                <form
                  onSubmit={handlePasswordSubmit}
                  className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6"
                >
                  <div className="space-y-2">
                    <h2 className="text-2xl font-semibold tracking-tight">Security</h2>
                    <p className="text-sm leading-6 text-white/60">
                      Update your password here. Use at least 8 characters for a stronger
                      account baseline.
                    </p>
                  </div>

                  <div className="mt-5 space-y-2">
                    <label htmlFor="password" className="block text-sm text-white/80">
                      New password
                    </label>
                    <input
                      id="password"
                      type="password"
                      autoComplete="new-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="h-12 w-full rounded-2xl border border-white/10 bg-black/30 px-4 text-white outline-none transition focus:border-white/30"
                      placeholder="New password"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={savingPassword}
                    className="mt-5 h-12 rounded-2xl bg-white px-5 font-medium text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingPassword ? "Updating..." : "Update password"}
                  </button>
                </form>
              </section>

              <section className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6">
                <div className="space-y-2">
                  <h2 className="text-2xl font-semibold tracking-tight">Session control</h2>
                  <p className="text-sm leading-6 text-white/60">
                    Local logout ends the current browser session. Global logout signs out
                    the same account across other devices too.
                  </p>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => handleLogout("local")}
                    disabled={signingOut}
                    className="h-12 rounded-2xl border border-white/15 px-5 text-white transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {signingOut ? "Signing out..." : "Logout this device"}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleLogout("global")}
                    disabled={signingOut}
                    className="h-12 rounded-2xl bg-red-500/90 px-5 font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {signingOut ? "Signing out..." : "Logout all devices"}
                  </button>
                </div>
              </section>
            </>
          )}
        </div>
      </main>
    </AuthGuard>
  );
}
