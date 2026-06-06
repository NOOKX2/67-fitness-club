"use client";

import Link from "next/link";
import { LoginBrandLogo } from "./LoginBrandLogo";

const INPUT_CLASS =
  "w-full rounded-xl border-[1.5px] border-[#dce9f2] bg-[#eef6fb] py-3.5 pl-4 pr-11 text-sm text-[#1a2634] outline-none transition placeholder:text-[#7a95aa] focus:border-[#6b93b8] focus:bg-white focus:shadow-[0_0_0_4px_rgba(107,147,184,0.14)]";

function MailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function EyeIcon({ hidden }: { hidden: boolean }) {
  if (hidden) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-6.4 0-10-8-10-8a18.45 18.45 0 0 1 5.06-5.94" />
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c6.4 0 10 8 10 8a18.5 18.5 0 0 1-2.16 3.19" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

type LoginFormPanelProps = {
  email: string;
  password: string;
  showPassword: boolean;
  remember: boolean;
  error: string;
  loading: boolean;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onShowPasswordToggle: () => void;
  onRememberChange: (value: boolean) => void;
  onSubmit: (event: React.FormEvent) => void;
};

export function LoginFormPanel({
  email,
  password,
  showPassword,
  remember,
  error,
  loading,
  onEmailChange,
  onPasswordChange,
  onShowPasswordToggle,
  onRememberChange,
  onSubmit,
}: LoginFormPanelProps) {
  return (
    <div className="relative z-[2] flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-[#ebebeb] px-7 py-10 shadow-none max-[860px]:min-w-0 max-[860px]:max-w-none md:w-[clamp(560px,30vw,720px)] md:min-w-[560px] md:max-w-[720px] md:flex-none md:rounded-l-[48px] md:px-[clamp(48px,5vw,80px)] md:py-14 md:shadow-[-12px_0_48px_rgba(0,0,0,0.12)]">
      <div className="pointer-events-none absolute -top-[120px] -right-[120px] h-[340px] w-[340px] rounded-full bg-[radial-gradient(circle,#d8d8d8_0%,transparent_70%)]" />

      <div className="relative z-[1] w-full max-w-[420px]">
        <div className="mb-9 flex justify-center md:hidden">
          <LoginBrandLogo mobile />
        </div>

        <div className="mb-9">
          <h2 className="font-[family-name:var(--font-inter)] text-[30px] font-extrabold tracking-tight text-[#1a2634]">
            Welcome back!
          </h2>
          <p className="mt-1.5 text-sm text-[#7a95aa]">Please enter your details</p>
        </div>

        <form onSubmit={onSubmit}>
          <div className="mb-[18px] flex flex-col gap-1.5">
            <label htmlFor="email" className="text-[13px] font-semibold text-[#1a2634]">
              Email
            </label>
            <div className="relative">
              <input
                id="email"
                type="email"
                placeholder="anna@gmail.com"
                autoComplete="email"
                value={email}
                onChange={(e) => onEmailChange(e.target.value)}
                required
                className={INPUT_CLASS}
              />
              <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-[#7a95aa]">
                <MailIcon />
              </span>
            </div>
          </div>

          <div className="mb-[18px] flex flex-col gap-1.5">
            <label htmlFor="password" className="text-[13px] font-semibold text-[#1a2634]">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                autoComplete="current-password"
                value={password}
                onChange={(e) => onPasswordChange(e.target.value)}
                required
                className={INPUT_CLASS}
              />
              <button
                type="button"
                className="absolute top-1/2 right-3.5 -translate-y-1/2 text-[#7a95aa] transition hover:text-[#6b93b8]"
                onClick={onShowPasswordToggle}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                <EyeIcon hidden={showPassword} />
              </button>
            </div>
          </div>

          {error && (
            <p className="mb-[18px] rounded-xl border border-red-500/35 bg-red-500/10 px-3.5 py-3 text-[13px] text-red-700">
              {error}
            </p>
          )}

          <div className="mb-7 flex items-center justify-between gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-[13px] text-[#4a6278] select-none">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => onRememberChange(e.target.checked)}
                className="h-[18px] w-[18px] rounded border-[#c4d8e6] accent-[#6b93b8]"
              />
              Remember for 30 days
            </label>
            <span className="text-[13px] font-semibold whitespace-nowrap text-[#6b93b8]">
              Forgot password?
            </span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="group relative mb-5 w-full overflow-hidden rounded-[14px] bg-[#1c2e40] py-[15px] text-[15px] font-bold tracking-wide text-white transition hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(28,46,64,0.35)] disabled:cursor-not-allowed disabled:opacity-75"
          >
            <span className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(107,147,184,0.18)_100%)] opacity-0 transition group-hover:opacity-100" />
            <span className="relative">{loading ? "Logging in…" : "Log in"}</span>
          </button>
        </form>

        <p className="text-center text-[13px] text-[#7a95aa]">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-semibold text-[#6b93b8] hover:text-[#1c2e40]">
            Sign up free
          </Link>
        </p>
      </div>
    </div>
  );
}
