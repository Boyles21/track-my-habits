import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar, Target, AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  TOTAL_REQUIRED_HOURS,
  TOTAL_REQUIRED_DAYS,
  calculateCompletionPercentage,
  formatHours,
} from "@/lib/hours-validation";

interface HoursProgressCardProps {
  totalHours: number;
  totalEntries: number;
  approvedEntries: number;
  pendingEntries: number;
  revisionEntries: number;
  weeklyViolations?: number;
  dailyViolations?: number;
}

export default function HoursProgressCard({
  totalHours,
  totalEntries,
  approvedEntries,
  pendingEntries,
  revisionEntries,
  weeklyViolations = 0,
  dailyViolations = 0,
}: HoursProgressCardProps) {
  const hoursProgress = calculateCompletionPercentage(totalHours);
  const daysProgress = Math.min(Math.round((totalEntries / TOTAL_REQUIRED_DAYS) * 100), 100);
  const approvalProgress = totalEntries > 0
    ? Math.round((approvedEntries / totalEntries) * 100)
    : 0;

  const remainingHours = Math.max(TOTAL_REQUIRED_HOURS - totalHours, 0);
  const remainingDays = Math.max(TOTAL_REQUIRED_DAYS - totalEntries, 0);
  const hasViolations = weeklyViolations > 0 || dailyViolations > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            SIWES Hours Progress
          </div>
          {hasViolations && (
            <Badge variant="outline" className="border-warning text-warning">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {weeklyViolations + dailyViolations} violations
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Total Hours Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Total Hours Completed
            </span>
            <span className="font-medium">
              {formatHours(totalHours)} / {formatHours(TOTAL_REQUIRED_HOURS)}
            </span>
          </div>
          <Progress value={hoursProgress} className="h-3" />
          <p className="text-sm text-muted-foreground">
            {hoursProgress}% complete • {formatHours(remainingHours)} remaining
          </p>
        </div>

        {/* Days Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Days Completed
            </span>
            <span className="font-medium">
              {totalEntries} / {TOTAL_REQUIRED_DAYS} days
            </span>
          </div>
          <Progress value={daysProgress} className="h-3" />
          <p className="text-sm text-muted-foreground">
            {daysProgress}% complete • {remainingDays} days remaining
          </p>
        </div>

        {/* Approval Rate */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" />
              Entries Approved
            </span>
            <span className="font-medium">
              {approvedEntries} / {totalEntries}
            </span>
          </div>
          <Progress value={approvalProgress} className="h-3" />
          <p className="text-sm text-muted-foreground">
            {approvalProgress}% approval rate
          </p>
        </div>

        {/* Violations Summary */}
        {hasViolations && (
          <div className="pt-2 border-t space-y-2">
            <p className="text-sm font-medium text-foreground">Outstanding Violations</p>
            <div className="flex flex-wrap gap-2">
              {dailyViolations > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {dailyViolations} entries exceed max hours
                </Badge>
              )}
              {weeklyViolations > 0 && (
                <Badge variant="outline" className="border-warning text-warning text-xs">
                  {weeklyViolations} weeks below minimum
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Status Summary */}
        <div className="pt-2 border-t grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-success">{approvedEntries}</p>
            <p className="text-xs text-muted-foreground">Approved</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-warning">{pendingEntries}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-destructive">{revisionEntries}</p>
            <p className="text-xs text-muted-foreground">Revision</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
