import { Archive, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ProjectDialog } from "@/components/ProjectDialog.tsx";
import { SubjectCard } from "@/components/SubjectCard.tsx";
import { SubjectForm } from "@/components/SubjectForm.tsx";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUiStore } from "@/lib/store";
import { trpc } from "@/lib/trpc";

export function ProjectPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const showArchived = useUiStore((state) => state.showArchived);
  const setShowArchived = useUiStore((state) => state.setShowArchived);
  const projects = trpc.project.list.useQuery();
  const user = trpc.user.me.useQuery();
  const [renameOpen, setRenameOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const selected = projectId
    ? projects.data?.find((project) => project.id === projectId)
    : projects.data?.[0];

  useEffect(() => {
    if (!projectId && projects.data?.[0]) {
      navigate(`/projects/${projects.data[0].id}`, { replace: true });
    }
  }, [projectId, projects.data, navigate]);

  const subjects = trpc.subject.listByProject.useQuery(
    { projectId: selected?.id ?? "", includeArchived: showArchived },
    { enabled: Boolean(selected?.id) },
  );

  const utils = trpc.useUtils();
  const remove = trpc.project.delete.useMutation({
    onSuccess: async () => {
      await utils.project.list.invalidate();
      toast.success("Project deleted");
      setDeleteOpen(false);
      navigate("/projects");
    },
    onError: (error) => toast.error(error.message),
  });

  if (projects.isLoading || user.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  if (projects.isError) {
    return (
      <ErrorState
        message={projects.error.message}
        onRetry={() => projects.refetch()}
      />
    );
  }

  if (!projects.data?.length) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-dashed border-border bg-card/70 p-10 text-center">
        <h1 className="font-serif text-3xl">Start a ledger</h1>
        <p className="mt-2 text-muted-foreground">
          Create a project, add subjects, then log time or reps until each period closes.
        </p>
        <Button className="mt-6" onClick={() => setCreateOpen(true)}>
          New project
        </Button>
        <ProjectDialog open={createOpen} onOpenChange={setCreateOpen} />
      </div>
    );
  }

  if (!selected) {
    return <p className="text-sm text-muted-foreground">Project not found.</p>;
  }

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Project</p>
          <h1 className="font-serif text-4xl tracking-tight">{selected.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowArchived(!showArchived)}>
            <Archive />
            {showArchived ? "Hide archived" : "Show archived"}
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus />
            Subject
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Project actions">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setRenameOpen(true)}>Rename</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={() => setDeleteOpen(true)}>
                Delete project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {subjects.isError ? (
        <ErrorState message={subjects.error.message} onRetry={() => subjects.refetch()} />
      ) : subjects.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading subjects…</p>
      ) : subjects.data?.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/70 p-8">
          <h2 className="font-serif text-2xl">No subjects yet</h2>
          <p className="mt-2 max-w-md text-muted-foreground">
            A subject is one measurable habit — minutes of running, pages read, sessions completed.
          </p>
          <Button className="mt-4" onClick={() => setCreateOpen(true)}>
            Add a subject
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {subjects.data?.map((subject) => (
            <SubjectCard
              key={subject.id}
              id={subject.id}
              name={subject.name}
              kpiTarget={subject.kpiTarget}
              kpiType={subject.kpiType}
              periodType={subject.periodType}
              current={subject.current}
              streak={subject.streak}
              archivedAt={subject.archivedAt}
              notStarted={subject.notStarted}
              openPeriod={subject.openPeriod}
            />
          ))}
        </div>
      )}

      <div className="mt-6 md:hidden">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Projects</p>
        <div className="flex flex-wrap gap-2">
          {projects.data.map((project) => (
            <Button key={project.id} variant={project.id === selected.id ? "default" : "outline"} size="sm" asChild>
              <Link to={`/projects/${project.id}`}>{project.name}</Link>
            </Button>
          ))}
        </div>
      </div>

      <ProjectDialog open={renameOpen} onOpenChange={setRenameOpen} project={selected} />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New subject</DialogTitle>
          </DialogHeader>
          {user.data ? (
            <SubjectForm
              projectId={selected.id}
              timezone={user.data.timezone}
              onDone={() => setCreateOpen(false)}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selected.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Projects with subjects cannot be deleted. Remove those subjects first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => remove.mutate({ id: selected.id })}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-destructive/30 bg-card p-6">
      <p className="font-medium">Could not load this page</p>
      <p className="mt-1 text-sm text-muted-foreground">{message}</p>
      <Button className="mt-4" variant="outline" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}
