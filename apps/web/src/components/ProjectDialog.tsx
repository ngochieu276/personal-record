import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: { id: string; name: string };
};

export function ProjectDialog({ open, onOpenChange, project }: Props) {
  const [name, setName] = useState(project?.name ?? "");
  const utils = trpc.useUtils();
  const navigate = useNavigate();
  const create = trpc.project.create.useMutation({
    onSuccess: async (created) => {
      await utils.project.list.invalidate();
      toast.success("Project created");
      onOpenChange(false);
      setName("");
      navigate(`/projects/${created.id}`);
    },
    onError: (error) => toast.error(error.message),
  });
  const update = trpc.project.update.useMutation({
    onSuccess: async () => {
      await utils.project.list.invalidate();
      toast.success("Project renamed");
      onOpenChange(false);
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (next) {
          setName(project?.name ?? "");
        }
      }}
    >
      <DialogContent>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (project) {
              update.mutate({ id: project.id, name });
            } else {
              create.mutate({ name });
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>{project ? "Rename project" : "New project"}</DialogTitle>
            <DialogDescription>A project groups related subjects, like Fitness or Study.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="project-name">Name</Label>
            <Input
              id="project-name"
              className="mt-2"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Fitness"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={!name.trim() || create.isPending || update.isPending}>
              {project ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
