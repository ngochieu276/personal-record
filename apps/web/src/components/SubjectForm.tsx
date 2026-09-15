import { KPI_TYPES, PERIOD_TYPES, periodLabel, toDateYmd, type KpiType, type PeriodType } from "@personal-record/shared";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";

type Values = {
  name: string;
  kpiTarget: string;
  kpiType: KpiType;
  periodType: PeriodType;
  startDate: string;
  link: string;
};

type Props = {
  projectId: string;
  timezone: string;
  initial?: Partial<Values> & { id?: string };
  onDone?: () => void;
};

export function SubjectForm({ projectId, timezone, initial, onDone }: Props) {
  const utils = trpc.useUtils();
  const [values, setValues] = useState<Values>({
    name: initial?.name ?? "",
    kpiTarget: initial?.kpiTarget ?? "",
    kpiType: initial?.kpiType ?? "totalTime",
    periodType: initial?.periodType ?? "week",
    startDate: initial?.startDate ?? toDateYmd(new Date(), timezone),
    link: initial?.link ?? "",
  });

  const create = trpc.subject.create.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.subject.listByProject.invalidate({ projectId }),
        utils.project.list.invalidate(),
      ]);
      toast.success("Subject created");
      onDone?.();
    },
    onError: (error) => toast.error(error.message),
  });
  const update = trpc.subject.update.useMutation({
    onSuccess: async () => {
      if (initial?.id) {
        await utils.subject.get.invalidate({ id: initial.id });
      }
      await Promise.all([
        utils.subject.listByProject.invalidate({ projectId }),
        utils.project.list.invalidate(),
      ]);
      toast.success("Subject updated");
      onDone?.();
    },
    onError: (error) => toast.error(error.message),
  });

  function set<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const kpiTarget = Number(values.kpiTarget);
        const payload = {
          name: values.name,
          kpiTarget,
          kpiType: values.kpiType,
          periodType: values.periodType,
          startDate: values.startDate,
          link: values.link || undefined,
        };
        if (initial?.id) {
          update.mutate({ id: initial.id, ...payload });
        } else {
          create.mutate({ projectId, ...payload });
        }
      }}
    >
      <div>
        <Label htmlFor="subject-name">Name</Label>
        <Input id="subject-name" className="mt-2" value={values.name} onChange={(e) => set("name", e.target.value)} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Measure</Label>
          <Select value={values.kpiType} onValueChange={(value) => set("kpiType", value as KpiType)}>
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {KPI_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type === "totalTime" ? "Total time (minutes)" : "Total repeats"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Period</Label>
          <Select value={values.periodType} onValueChange={(value) => set("periodType", value as PeriodType)}>
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {periodLabel(type)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="kpi-target">{values.kpiType === "totalTime" ? "Target minutes" : "Target reps"}</Label>
          <Input
            id="kpi-target"
            className="mt-2"
            type="number"
            min={1}
            value={values.kpiTarget}
            onChange={(e) => set("kpiTarget", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="start-date">Start date</Label>
          <Input
            id="start-date"
            className="mt-2"
            type="date"
            value={values.startDate}
            onChange={(e) => set("startDate", e.target.value)}
          />
        </div>
      </div>
      <div>
        <Label htmlFor="link">Link (optional)</Label>
        <Input
          id="link"
          className="mt-2"
          placeholder="https://"
          value={values.link}
          onChange={(e) => set("link", e.target.value)}
        />
      </div>
      <Button type="submit" disabled={!values.name.trim() || !values.kpiTarget || create.isPending || update.isPending}>
        {initial?.id ? "Save subject" : "Create subject"}
      </Button>
    </form>
  );
}
