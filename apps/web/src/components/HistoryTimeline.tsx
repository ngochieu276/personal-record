import { formatAmount, type KpiType } from "@personal-record/shared";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatDateTime } from "@/lib/format";

type HistoryItem =
  | {
      kind: "event";
      id: string;
      at: Date;
      periodStart: string;
      periodEnd: string;
      status: "finish" | "miss";
      achieved: number;
      kpiSnapshot: number;
    }
  | {
      kind: "kpi-change";
      id: string;
      at: Date;
      oldValue: number;
      newValue: number;
    };

type Props = {
  history: HistoryItem[];
  kpiType: KpiType;
  timezone: string;
};

export function HistoryTimeline({ history, kpiType, timezone }: Props) {
  if (history.length === 0) {
    return <p className="text-sm text-muted-foreground">No closed periods or KPI changes yet.</p>;
  }

  return (
    <ol className="space-y-4">
      {history.map((item) => (
        <li key={`${item.kind}-${item.id}`} className="rounded-lg border border-border bg-card p-4">
          {item.kind === "event" ? (
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium">
                  {formatDate(item.periodStart)} – {formatDate(item.periodEnd)}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatAmount(item.achieved, kpiType)} of {formatAmount(item.kpiSnapshot, kpiType)}
                </p>
              </div>
              <Badge variant={item.status === "finish" ? "finish" : "miss"}>
                {item.status === "finish" ? "Finish" : "Miss"}
              </Badge>
            </div>
          ) : (
            <div>
              <p className="font-medium">KPI changed</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatAmount(item.oldValue, kpiType)} → {formatAmount(item.newValue, kpiType)} ·{" "}
                {formatDateTime(item.at, timezone)}
              </p>
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}
