import { formatAmount, periodLabel, type KpiType, type PeriodType } from "@personal-record/shared";
import { Flame } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { progressPercent } from "@/lib/format";

type Props = {
  id: string;
  name: string;
  kpiTarget: number;
  kpiType: KpiType;
  periodType: PeriodType;
  current: number;
  streak: { current: number };
  archivedAt: Date | null;
  notStarted: boolean;
  openPeriod: { start: string; end: string } | null;
};

export function SubjectCard({
  id,
  name,
  kpiTarget,
  kpiType,
  periodType,
  current,
  streak,
  archivedAt,
  notStarted,
  openPeriod,
}: Props) {
  const percent = progressPercent(current, kpiTarget);

  return (
    <Link to={`/subjects/${id}`} className="block">
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>{name}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatAmount(kpiTarget, kpiType)} {periodLabel(periodType)}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            {archivedAt ? <Badge variant="secondary">Archived</Badge> : null}
            {streak.current > 0 ? (
              <Badge variant="finish" className="gap-1">
                <Flame className="h-3 w-3" />
                {streak.current}
              </Badge>
            ) : (
              <Badge variant="outline">No streak</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {notStarted || !openPeriod ? (
            <p className="text-sm text-muted-foreground">Tracking has not started yet.</p>
          ) : (
            <>
              <div className="mb-2 flex items-baseline justify-between text-sm">
                <span>
                  {formatAmount(current, kpiType)} / {formatAmount(kpiTarget, kpiType)}
                </span>
                <span className="text-muted-foreground">{percent}%</span>
              </div>
              <Progress value={percent} />
            </>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
