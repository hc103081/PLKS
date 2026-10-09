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

// Mock Supabase only for unit tests, not for E2E tests
// @ts-ignore - VITEST env var access pattern
const isVitest = !!process.env.VITEST;
if (isVitest) {
  console.log("Mocking Supabase for unit tests");
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
} else {
  console.log("NOT mocking Supabase - VITEST env var not set");
}

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
