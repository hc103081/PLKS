// apps/web/src/pages/LoginPage.tsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [rememberMe, setRememberMe] = React.useState(false);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      // In a real app, we might redirect based on rememberMe
      // For now, we'll go to the dashboard
      navigate("/");
    } catch (err: any) {
      setError(err.message || "登入失敗，請檢查您的電子郵件和密碼");
    } finally {
      setLoading(false);
    }
  };

  const _handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || "Google 登入失敗");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background font-body-md text-on-surface antialiased selection:bg-primary-container selection:text-on-primary-container">
      {/* Cybernetic Academic Ambient Background Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10 flex items-center justify-center">
        <div className="absolute w-[800px] h-[800px] rounded-full bg-gradient-to-tr from-primary-container/10 via-tertiary-container/5 to-transparent blur-3xl opacity-40" />
        <div className="absolute -top-48 -right-32 w-96 h-96 rounded-full bg-secondary-container/10 blur-3xl opacity-30" />
        <div className="absolute -bottom-48 -left-32 w-96 h-96 rounded-full bg-primary/10 blur-3xl opacity-35" />
        {/* Architectural Monospaced Blueprint Watermark Lines */}
        <svg
          className="w-full h-full opacity-15 text-outline-variant"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern height="48" id="plks-cockpit-grid" patternUnits="userSpaceOnUse" width="48">
              <circle cx="2" cy="2" fill="currentColor" opacity="0.3" r="1" />
              <path
                d="M 48 0 L 0 0 0 48"
                fill="none"
                opacity="0.4"
                stroke="currentColor"
                stroke-dasharray="1 7"
                stroke-width="0.5"
              />
            </pattern>
          </defs>
          <rect fill="url(#plks-cockpit-grid)" height="100%" width="100%" />
          {/* Subtle Knowledge Constellation Vector lines */}
          <g fill="none" opacity="0.35" stroke="currentColor" stroke-width="0.75">
            <path d="M 120 280 L 260 210 L 390 310 L 520 180" />
            <circle className="animate-pulse" cx="120" cy="280" fill="#8083ff" r="3" />
            <circle cx="260" cy="210" fill="#7bd0ff" r="2.5" />
            <circle cx="390" cy="310" fill="#ddb7ff" r="3" />
            <circle cx="520" cy="180" fill="#8083ff" r="3.5" />
            <path d="M 880 720 L 980 610 L 1140 680 L 1280 540" />
            <circle cx="880" cy="720" fill="#7bd0ff" r="2.5" />
            <circle cx="980" cy="610" fill="#ddb7ff" r="3.5" />
            <circle cx="1140" cy="680" fill="#8083ff" r="2.5" />
            <circle cx="1280" cy="540" fill="#7bd0ff" r="3" />
          </g>
        </svg>
      </div>
      {/* Top Metadata Bar */}
      <aside
        aria-label="系統連線狀態資訊"
        className="w-full max-w-xl mb-6 flex items-center justify-between px-3 py-1.5 rounded-lg bg-surface-container-lowest/80 backdrop-blur-md shadow-sm"
      >
        <div className="flex items-center space-x-2">
          <span className="inline-block w-2 h-2 rounded-full bg-secondary-container shadow-sm animate-ping" />
          <span className="inline-block w-2 h-2 rounded-full bg-secondary-container -ml-3" />
          <span className="font-label-code-sm text-label-code-sm text-on-surface-variant uppercase tracking-wider">
            GATEWAY NODE: TW-NORTH-TANET#4
          </span>
        </div>
        <div className="flex items-center space-x-3 text-on-surface-variant font-label-code-sm text-label-code-sm">
          <span className="">LATENCY: 14ms</span>
          <span className="opacity-30">/</span>
          <span className="text-secondary font-label-code-sm">TLS 1.3 SECURE</span>
        </div>
      </aside>
      {/* Central Authentication Card (Level 2 Elevation) */}
      <main className="w-full max-w-xl bg-surface-container-low rounded-xl shadow-2xl p-6 sm:p-10 relative overflow-hidden backdrop-blur-xl">
        {/* Subtle Top Edge Ambient Accent Glow */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-secondary-container via-primary-container to-tertiary-container" />
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="relative mb-3 flex items-center justify-center">
            {/* Glowing Knowledge Emblem */}
            <div className="w-14 h-14 rounded-xl bg-surface-container-high flex items-center justify-center shadow-lg relative group">
              <div className="absolute inset-0 rounded-xl bg-primary-container/20 blur-md group-hover:blur-lg transition-all duration-300" />
              <span
                className="material-symbols-outlined text-primary text-3xl relative z-10"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                hub
              </span>
            </div>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-container-highest font-label-code-sm text-label-code-sm text-primary mb-2 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
            v2.5 • 學術研究與教材 AI 萃取工作臺
          </div>
          <h1 className="font-headline-md text-headline-md font-bold tracking-tight text-on-surface">
            PLKS 知識管理系統
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            個人學習與學術知識萃取平臺 (Personal Learning & Knowledge System)
          </p>
        </div>
        {/* Quick Academic SSO Login Action (Primary SSO) */}
        <div className="space-y-3 mb-6">
          <a
            className="group relative w-full flex items-center justify-between px-5 py-3.5 rounded-lg bg-surface-container-high hover:bg-surface-variant transition-all duration-200 shadow-md"
            href="/auth/oauth/google"
          >
            <div className="flex items-center space-x-3.5 text-left">
              <div className="w-9 h-9 rounded-lg bg-surface-container-highest flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.25 21.36 7.33 24 12 24z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.94 0 12s.46 3.84 1.26 5.42l4.02-3.15z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.25 2.64 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    fill="#EA4335"
                  />
                </svg>
              </div>
              <div>
                <div className="font-title-md text-title-md font-semibold text-on-surface flex items-center gap-2">
                  Google 帳號登入
                  <span className="font-label-caps text-label-caps uppercase px-1.5 py-0.5 rounded bg-secondary-container/20 text-secondary">
                    推薦
                  </span>
                </div>
                <div className="font-body-sm text-body-sm text-on-surface-variant">
                  支援學校 G Suite / Google Workspace 教育版帳號 (@edu.tw)
                </div>
              </div>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors text-xl">
              arrow_forward
            </span>
          </a>
        </div>
        {/* Visual Semantic Divider */}
        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full bg-surface-variant h-px" />
          </div>
          <div className="relative inline-block px-3 bg-surface-container-low font-label-caps text-label-caps uppercase text-on-surface-variant tracking-wider">
            或使用研究員學術信箱登入
          </div>
        </div>
        {/* Institutional Email & Password Credentials Form */}
        <form className="space-y-4" onSubmit={handleEmailLogin}>
          {/* Input: Institutional Email */}
          <div className="space-y-1.5">
            <label
              className="block font-title-md text-body-md font-medium text-on-surface"
              htmlFor="academic-email"
            >
              學術信箱{" "}
              <span className="text-on-surface-variant font-label-code-sm text-label-code-sm font-normal">
                (Institutional Email)
              </span>
            </label>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-3.5 text-on-surface-variant text-lg pointer-events-none">
                alternate_email
              </span>
              <input
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-surface-container-lowest text-on-surface placeholder:text-outline font-label-code-md text-label-code-md focus:bg-surface-container-lowest focus:outline-none shadow-sm transition-all"
                id="academic-email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </div>
          {/* Input: Password */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                className="block font-title-md text-body-md font-medium text-on-surface"
                htmlFor="password-input"
              >
                帳號密碼{" "}
                <span className="text-on-surface-variant font-label-code-sm text-label-code-sm font-normal">
                  (Password)
                </span>
              </label>
              <a
                className="font-body-sm text-body-sm text-secondary hover:text-primary transition-colors focus:outline-none"
                href="#reset"
              >
                忘記密碼？
              </a>
            </div>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-3.5 text-on-surface-variant text-lg pointer-events-none">
                lock
              </span>
              <input
                className="w-full pl-10 pr-11 py-2.5 rounded-lg bg-surface-container-lowest text-on-surface placeholder:text-outline font-label-code-md text-label-code-md focus:bg-surface-container-lowest focus:outline-none shadow-sm transition-all"
                id="password-input"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
              <button
                aria-label="切換密碼顯示狀態"
                className="absolute right-3.5 text-on-surface-variant hover:text-on-surface focus:outline-none"
                onClick={() => {
                  const passwordInput = document.getElementById(
                    "password-input",
                  ) as HTMLInputElement;
                  const icon = document.querySelector(
                    'button[aria-label="切換密碼顯示狀態"] span',
                  ) as HTMLSpanElement;
                  if (passwordInput.type === "password") {
                    passwordInput.type = "text";
                    icon.textContent = "visibility_off";
                  } else {
                    passwordInput.type = "password";
                    icon.textContent = "visibility";
                  }
                }}
                type="button"
              >
                <span className="material-symbols-outlined text-lg">visibility</span>
              </button>
            </div>
          </div>
          {/* Persist Login & Security Meta */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center space-x-2.5 cursor-pointer">
              <input
                checked={rememberMe}
                className="w-4 h-4 rounded bg-surface-container-high text-primary-container focus:ring-0 focus:ring-offset-0 cursor-pointer"
                type="checkbox"
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span className="font-body-sm text-body-sm text-on-surface-variant select-none">
                在此裝置保持登入 (30 天)
              </span>
            </label>
            <div className="flex items-center text-on-surface-variant font-label-code-sm text-label-code-sm">
              <span className="material-symbols-outlined text-sm text-secondary mr-1">
                verified_user
              </span>
              <span>端對端加密</span>
            </div>
          </div>
          {/* Submit Action Button */}
          <div className="pt-3">
            <button
              type="submit"
              className="w-full py-3.5 px-4 rounded-lg bg-inverse-primary hover:bg-primary-container text-on-surface font-title-md text-title-md font-semibold tracking-wide shadow-lg hover:shadow-primary/20 transition-all duration-200 flex items-center justify-center space-x-2 group"
              disabled={loading}
            >
              <span>進入學習工作臺 (Sign In to Workbench)</span>
              <span className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">
                arrow_forward
              </span>
            </button>
          </div>
          {/* Academic Federation Affiliation Note */}
          <div className="mt-8 pt-5 bg-surface-container/50 -mx-6 -mb-6 sm:-mx-10 sm:-mb-10 px-6 sm:px-10 py-4 flex flex-col space-y-2">
            <div className="flex items-start space-x-2.5">
              <span className="material-symbols-outlined text-secondary text-base mt-0.5">
                school
              </span>
              <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                教育機構帳號支援：支援各大專院校與研究機構之 Google Workspace for Education
                (@edu.tw) 教育版帳號無縫登入與學術研究教材同步認證。
              </p>
            </div>
          </div>
          {/* Error Message */}
          {error && (
            <div className="mt-4 p-3 bg-error/10 border border-error/30 rounded-lg text-error font-body-sm">
              {error}
            </div>
          )}
        </form>
        {/* Global Footer Links & System Integrity Diagnostics */}
        <footer className="w-full max-w-xl mt-6 flex flex-col sm:flex-row items-center justify-between text-on-surface-variant font-body-sm text-body-sm px-2 gap-3">
          <div className="flex items-center space-x-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-secondary-container" />
            <span className="font-label-code-sm text-label-code-sm">
              平臺運作正常 • PLKS v2.5.4-prod
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <a className="hover:text-on-surface transition-colors" href="#privacy">
              教材智財保護規範
            </a>
            <span className="opacity-25">•</span>
            <a className="hover:text-on-surface transition-colors" href="#guide">
              使用指引
            </a>
            <span className="opacity-25">•</span>
            <a className="hover:text-on-surface transition-colors" href="#support">
              計中技術支援
            </a>
          </div>
        </footer>
      </main>
    </div>
  );
}
