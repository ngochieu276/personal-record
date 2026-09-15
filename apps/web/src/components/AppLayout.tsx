import { BookMarked, Plus, Settings } from "lucide-react";
import { NavLink, Outlet, useNavigate, useParams } from "react-router-dom";
import { ProjectDialog } from "@/components/ProjectDialog.tsx";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { useState } from "react";

export function AppLayout() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const projects = trpc.project.list.useQuery();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl">
      <aside className="hidden w-64 shrink-0 border-r border-border/80 bg-card/60 p-5 md:flex md:flex-col">
        <NavLink to="/projects" end className="mb-8">
          <p className="font-serif text-2xl font-semibold tracking-tight">Personal Record</p>
          <p className="mt-1 text-xs text-muted-foreground">Local KPI ledger</p>
        </NavLink>

        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Projects</p>
          <Button size="icon" variant="ghost" onClick={() => setCreateOpen(true)} aria-label="New project">
            <Plus />
          </Button>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {projects.data?.length === 0 ? (
            <p className="px-2 text-sm text-muted-foreground">No projects yet.</p>
          ) : (
            projects.data?.map((project) => (
              <NavLink
                key={project.id}
                to={`/projects/${project.id}`}
                className={({ isActive }) =>
                  cn(
                    "rounded-md px-3 py-2 text-sm transition-colors",
                    isActive || projectId === project.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted",
                  )
                }
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate">{project.name}</span>
                  <span className="text-xs opacity-70">{project._count.subjects}</span>
                </span>
              </NavLink>
            ))
          )}
        </nav>

        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              "mt-6 inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm",
              isActive ? "bg-muted" : "hover:bg-muted",
            )
          }
        >
          <Settings className="h-4 w-4" />
          Settings
        </NavLink>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-border/80 bg-card/70 px-4 py-3 md:hidden">
          <NavLink to="/projects" className="flex items-center gap-2 font-serif text-lg font-semibold">
            <BookMarked className="h-4 w-4" />
            Record
          </NavLink>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)}>
              <Plus />
              Project
            </Button>
            <Button size="icon" variant="ghost" onClick={() => navigate("/settings")}>
              <Settings />
            </Button>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 md:px-8">
          <Outlet />
        </main>
      </div>

      <ProjectDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
