import * as matchers from "@testing-library/jest-dom/matchers";
import { cleanup } from "@testing-library/react";
import { afterEach, expect, vi } from "vitest";

expect.extend(matchers);

afterEach(() => {
  cleanup();
});

// Mock React Router
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: "/", state: undefined }),
    useParams: () => ({}),
  };
});

// Mock Supabase
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi
        .fn()
        .mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
      signInWithOAuth: vi.fn().mockResolvedValue({ error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  }),
}));

// Mock Dashboard Store
vi.mock("../stores/dashboardStore", () => ({
  useDashboardStore: () => ({
    semesterFilter: "104-1",
    viewMode: "grid",
    createModal: { open: false, mode: "create" as const },
    setSemesterFilter: vi.fn(),
    setViewMode: vi.fn(),
    openCreateModal: vi.fn(),
    closeCreateModal: vi.fn(),
  }),
}));
