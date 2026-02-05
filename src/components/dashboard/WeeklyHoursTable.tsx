import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, CheckCircle2, BarChart3 } from "lucide-react";
import { WeeklyHoursSummary, MIN_WEEKLY_HOURS, formatHours } from "@/lib/hours-validation";

interface WeeklyHoursTableProps {
  weeklyData: WeeklyHoursSummary[];
  maxRows?: number;
}

export default function WeeklyHoursTable({ weeklyData, maxRows = 5 }: WeeklyHoursTableProps) {
  const displayData = maxRows > 0 ? weeklyData.slice(0, maxRows) : weeklyData;

  const formatWeekRange = (start: Date, end: Date) => {
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
  };

  if (weeklyData.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <BarChart3 className="h-5 w-5" />
          Weekly Hours Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Week</TableHead>
              <TableHead className="text-right">Hours</TableHead>
              <TableHead className="text-right">Entries</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayData.map((week, index) => (
              <TableRow key={index} className={week.hasViolation ? "bg-warning/5" : ""}>
                <TableCell className="font-medium">
                  {formatWeekRange(week.weekStart, week.weekEnd)}
                </TableCell>
                <TableCell className="text-right">
                  <span className={week.hasViolation ? "text-warning font-medium" : ""}>
                    {formatHours(week.totalHours)}
                  </span>
                  <span className="text-muted-foreground text-xs ml-1">
                    / {MIN_WEEKLY_HOURS}h
                  </span>
                </TableCell>
                <TableCell className="text-right">{week.entries}</TableCell>
                <TableCell className="text-right">
                  {week.hasViolation ? (
                    <Badge variant="outline" className="border-warning text-warning">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Low Hours
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-success text-success">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      On Track
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {maxRows > 0 && weeklyData.length > maxRows && (
          <p className="text-sm text-muted-foreground text-center mt-4">
            Showing {maxRows} of {weeklyData.length} weeks
          </p>
        )}
      </CardContent>
    </Card>
  );
}
