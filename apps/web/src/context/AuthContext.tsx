// apps/web/src/context/AuthContext.tsx
import { type ReactNode, createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../services/supabase";

interface AuthContextType {
  user: { id: string; email?: string } | null;
  session: { access_token: string; user: { id: string; email?: string } } | null;
  loading: boolean;
  signInWithMagicLink: (email: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 開發模式模擬用戶 (僅用於 UI 測試)
const DEV_MOCK_USER = {
  id: "dev-user-123",
  email: "dev@plks.local",
};

const DEV_MOCK_SESSION = {
  access_token: "dev-mock-token",
  user: DEV_MOCK_USER,
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthContextType["user"]>(null);
  const [session, setSession] = useState<AuthContextType["session"]>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 開發模式：自動注入模擬用戶以便 UI 測試
    const isDev = import.meta.env.DEV || import.meta.env["VITE_DEV_MOCK_AUTH"] === "true";

    if (isDev) {
      // 檢查是否已有真實 session
      supabase.auth.getSession().then(({ data: { session: realSession } }) => {
        if (realSession) {
          setSession(realSession);
          setUser(realSession.user ?? null);
        } else {
          // 使用模擬用戶
          setSession(DEV_MOCK_SESSION);
          setUser(DEV_MOCK_USER);
        }
        setLoading(false);
      });
    } else {
      // 生產模式：正常認證流程
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      });

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      });

      return () => subscription.unsubscribe();
    }
  }, []);

  const signInWithMagicLink = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });
    return { error };
  };

  return (
    <AuthContext.Provider
      value={{ user, session, loading, signInWithMagicLink, signInWithGoogle, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
