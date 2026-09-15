import { formatAmount, periodLabel } from "@personal-record/shared";
import { ExternalLink, Flame, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { HistoryTimeline } from "@/components/HistoryTimeline.tsx";
import { LogForm } from "@/components/LogForm.tsx";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { formatDate, formatDateTime, progressPercent } from "@/lib/format";
import { trpc } from "@/lib/trpc";

export function SubjectPage() {
  const { subjectId } = useParams();
  const navigate = useNavigate();
  const user = trpc.user.me.useQuery();
  const subject = trpc.subject.get.useQuery({ id: subjectId ?? "" }, { enabled: Boolean(subjectId) });
  const utils = trpc.useUtils();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");

  const archive = trpc.subject.archive.useMutation({
    onSuccess: async (updated) => {
      await Promise.all([
        utils.subject.get.invalidate({ id: subjectId }),
        utils.subject.listByProject.invalidate(),
        utils.project.list.invalidate(),
      ]);
      toast.success(updated.archivedAt ? "Archived" : "Restored");
    },
    onError: (error) => toast.error(error.message),
  });
  const remove = trpc.subject.delete.useMutation({
    onSuccess: async () => {
      await utils.project.list.invalidate();
      toast.success("Subject deleted");
      if (subject.data) {
        navigate(`/projects/${subject.data.projectId}`);
      }
    },
    onError: (error) => toast.error(error.message),
  });
  const updateLog = trpc.log.update.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.subject.get.invalidate({ id: subjectId }),
        utils.subject.listByProject.invalidate(),
      ]);
      setEditingLogId(null);
      toast.success("Log updated");
    },
    onError: (error) => toast.error(error.message),
  });
  const deleteLog = trpc.log.delete.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.subject.get.invalidate({ id: subjectId }),
        utils.subject.listByProject.invalidate(),
      ]);
      toast.success("Log removed");
    },
    onError: (error) => toast.error(error.message),
  });

  if (subject.isLoading || user.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  if (subject.isError) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-card p-6">
        <p className="font-medium">Could not load this subject</p>
        <p className="mt-1 text-sm text-muted-foreground">{subject.error.message}</p>
        <Button className="mt-4" variant="outline" onClick={() => subject.refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  if (!subject.data || !user.data) {
    return <p>Subject not found.</p>;
  }

  const data = subject.data;
  const percent = progressPercent(data.current, data.kpiTarget);

  return (
    <div className="mx-auto max-w-3xl">
      <Link to={`/projects/${data.projectId}`} className="text-sm text-muted-foreground hover:text-foreground">
        ← {data.project.name}
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-serif text-4xl tracking-tight">{data.name}</h1>
            {data.archivedAt ? <Badge variant="secondary">Archived</Badge> : null}
          </div>
          <p className="mt-2 text-muted-foreground">
            {formatAmount(data.kpiTarget, data.kpiType)} {periodLabel(data.periodType)}
            {data.openPeriod
              ? ` · ${formatDate(data.openPeriod.start)} – ${formatDate(data.openPeriod.end)}`
              : ` · starts ${formatDate(data.startDate)}`}
          </p>
          {data.link ? (
            <a
              href={data.link}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              Linked resource <ExternalLink className="h-3 w-3" />
            </a>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {data.streak.current > 0 ? (
            <Badge variant="finish" className="gap-1 px-3 py-1">
              <Flame className="h-3.5 w-3.5" />
              {data.streak.current} current · {data.streak.longest} best
            </Badge>
          ) : (
            <Badge variant="outline">Streak 0 · best {data.streak.longest}</Badge>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Subject actions">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditOpen(true)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => archive.mutate({ id: data.id, archived: !data.archivedAt })}
              >
                {data.archivedAt ? "Restore" : "Archive"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={() => setDeleteOpen(true)}>
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>This period</CardTitle>
        </CardHeader>
        <CardContent>
          {data.notStarted ? (
            <p className="text-sm text-muted-foreground">Logging opens on the start date.</p>
          ) : (
            <>
              <div className="mb-2 flex items-baseline justify-between">
                <p className="text-lg">
                  {formatAmount(data.current, data.kpiType)}
                  <span className="text-muted-foreground"> / {formatAmount(data.kpiTarget, data.kpiType)}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  {data.metKpi ? "KPI met" : `${formatAmount(data.remaining, data.kpiType)} remaining`}
                </p>
              </div>
              <Progress value={percent} />
              <Separator className="my-6" />
              <LogForm subjectId={data.id} kpiType={data.kpiType} />
            </>
          )}
        </CardContent>
      </Card>

      <section className="mt-8">
        <h2 className="font-serif text-2xl">Logs this period</h2>
        {data.periodLogs.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Nothing logged in the open period yet.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {data.periodLogs.map((log) => (
              <li key={log.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3">
                {editingLogId === log.id ? (
                  <form
                    className="flex w-full items-center gap-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const amount = Number(editAmount);
                      if (!Number.isInteger(amount) || amount <= 0) {
                        toast.error("Amount must be a positive integer");
                        return;
                      }
                      updateLog.mutate({ id: log.id, amount });
                    }}
                  >
                    <Input
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value)}
                      type="number"
                      min={1}
                    />
                    <Button type="submit" size="sm">
                      Save
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setEditingLogId(null)}>
                      Cancel
                    </Button>
                  </form>
                ) : (
                  <>
                    <div>
                      <p className="font-medium">{formatAmount(log.amount, data.kpiType)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(log.loggedAt, user.data.timezone)}
                        {log.note ? ` · ${log.note}` : ""}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Edit log"
                        onClick={() => {
                          setEditingLogId(log.id);
                          setEditAmount(String(log.amount));
                        }}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Delete log"
                        onClick={() => deleteLog.mutate({ id: log.id })}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="font-serif text-2xl">History</h2>
        <p className="mt-1 text-sm text-muted-foreground">Closed periods and KPI changes, newest first.</p>
        <div className="mt-4">
          <HistoryTimeline history={data.history} kpiType={data.kpiType} timezone={user.data.timezone} />
        </div>
      </section>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit subject</DialogTitle>
          </DialogHeader>
          <SubjectForm
            projectId={data.projectId}
            timezone={user.data.timezone}
            initial={{
              id: data.id,
              name: data.name,
              kpiTarget: String(data.kpiTarget),
              kpiType: data.kpiType,
              periodType: data.periodType,
              startDate: data.startDate,
              link: data.link ?? "",
            }}
            onDone={() => setEditOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {data.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes logs, events, and KPI history for this subject.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => remove.mutate({ id: data.id })}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
