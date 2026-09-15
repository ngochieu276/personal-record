import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/AppLayout.tsx";
import { ProjectPage } from "./pages/ProjectPage.tsx";
import { SettingsPage } from "./pages/SettingsPage.tsx";
import { SubjectPage } from "./pages/SubjectPage.tsx";

export function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/projects" replace />} />
        <Route path="/projects" element={<ProjectPage />} />
        <Route path="/projects/:projectId" element={<ProjectPage />} />
        <Route path="/subjects/:subjectId" element={<SubjectPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}
