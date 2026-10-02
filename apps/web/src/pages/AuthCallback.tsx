import React from "react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";

export function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuth = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error("Auth callback error:", error);
        navigate("/login?error=auth_failed");
        return;
      }

      if (session) {
        navigate("/");
      } else {
        navigate("/login?error=no_session");
      }
    };

    handleAuth();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4 animate-pulse">
          <span className="material-symbols-outlined text-primary text-[32px]">sync</span>
        </div>
        <h2 className="font-headline-md font-bold text-on-surface mb-2">正在驗證登入...</h2>
        <p className="font-body-md text-on-surface-variant">請稍候，即將跳轉至儀表板</p>
      </div>
    </div>
  );
}
