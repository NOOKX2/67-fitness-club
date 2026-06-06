"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api-client";
import { homePathForRole } from "@/lib/routes";
import { LoginFormPanel } from "./LoginFormPanel";
import { LoginHeroPanel } from "./LoginHeroPanel";

export function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await api<{ role: string }>("auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      router.push(homePathForRole(user.role));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen overflow-hidden bg-[#f7fafc] max-[860px]:flex-col max-[860px]:overflow-auto">
      <LoginHeroPanel />
      <LoginFormPanel
        email={email}
        password={password}
        showPassword={showPassword}
        remember={remember}
        error={error}
        loading={loading}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        onShowPasswordToggle={() => setShowPassword((value) => !value)}
        onRememberChange={setRemember}
        onSubmit={onSubmit}
      />
    </div>
  );
}
