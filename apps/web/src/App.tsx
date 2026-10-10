// apps/web/src/App.tsx
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { AuthCallback } from "./pages/AuthCallback";
import { CoursePage } from "./pages/CoursePage";
import { Dashboard } from "./pages/Dashboard.js";
import { LoginPage } from "./pages/LoginPage";
import { QuizPlayer } from "./pages/QuizPlayer.js";
import { SidekickChat } from "./pages/SidekickChat.js";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="material-symbols-outlined text-primary text-[32px]">sync</span>
          </div>
          <p className="font-body-md text-on-surface-variant">正在驗證身份...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/course/:courseId"
        element={
          <ProtectedRoute>
            <CoursePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/quiz/:courseId"
        element={
          <ProtectedRoute>
            <QuizPlayer />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sidekick/:courseId"
        element={
          <ProtectedRoute>
            <SidekickChat />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
