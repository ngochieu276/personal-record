import { formatAmount, parseAmountInput, type KpiType } from "@personal-record/shared";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";

type Props = {
  subjectId: string;
  kpiType: KpiType;
  onLogged?: () => void;
};

export function LogForm({ subjectId, kpiType, onLogged }: Props) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const utils = trpc.useUtils();
  const create = trpc.log.create.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.subject.get.invalidate({ id: subjectId }),
        utils.subject.listByProject.invalidate(),
      ]);
      setAmount("");
      setNote("");
      toast.success("Logged");
      onLogged?.();
    },
    onError: (error) => toast.error(error.message),
  });

  const parsed = parseAmountInput(amount, kpiType);

  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (parsed === null) {
          toast.error(kpiType === "totalTime" ? "Enter minutes or 1h 20m" : "Enter a whole number of reps");
          return;
        }
        create.mutate({
          subjectId,
          amount: parsed,
          note: note.trim() || undefined,
        });
      }}
    >
      <div>
        <Label htmlFor="log-amount">{kpiType === "totalTime" ? "Time finished" : "Reps finished"}</Label>
        <Input
          id="log-amount"
          className="mt-2"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder={kpiType === "totalTime" ? "40 or 1h 20m" : "12"}
        />
        {parsed !== null ? (
          <p className="mt-1 text-xs text-muted-foreground">Will add {formatAmount(parsed, kpiType)}</p>
        ) : null}
      </div>
      <div>
        <Label htmlFor="log-note">Note (optional)</Label>
        <Textarea id="log-note" className="mt-2" value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
      </div>
      <Button type="submit" disabled={create.isPending}>
        Add to this period
      </Button>
    </form>
  );
}
