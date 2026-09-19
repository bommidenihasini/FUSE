import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { LandingPage } from "@/pages/LandingPage";
import { OverviewPage } from "@/pages/OverviewPage";
import { RunPage } from "@/pages/RunPage";
import { RunsIndexPage } from "@/pages/RunsIndexPage";
import { PoliciesPage } from "@/pages/PoliciesPage";
import { ArchitecturePage } from "@/pages/ArchitecturePage";
import { DocsPage } from "@/pages/DocsPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route element={<AppShell />}>
            <Route path="/overview" element={<OverviewPage />} />
            <Route path="/runs" element={<RunsIndexPage />} />
            <Route path="/runs/:runId" element={<RunPage />} />
            <Route path="/policies" element={<PoliciesPage />} />
            <Route path="/architecture" element={<ArchitecturePage />} />
            <Route path="/docs" element={<DocsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
