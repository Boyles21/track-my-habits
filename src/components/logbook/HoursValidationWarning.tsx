import { AlertCircle, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { HoursViolation, MAX_DAILY_HOURS } from "@/lib/hours-validation";

interface HoursValidationWarningProps {
  violation: HoursViolation | null;
  hours?: number;
}

export default function HoursValidationWarning({ violation, hours }: HoursValidationWarningProps) {
  if (!violation) return null;

  const isError = violation.severity === 'error';
  
  return (
    <Alert variant={isError ? "destructive" : "default"} className={!isError ? "border-warning bg-warning/10" : ""}>
      {isError ? (
        <AlertCircle className="h-4 w-4" />
      ) : (
        <AlertTriangle className="h-4 w-4 text-warning" />
      )}
      <AlertTitle className={!isError ? "text-warning" : ""}>
        {isError ? "Hours Violation" : "Warning"}
      </AlertTitle>
      <AlertDescription className={!isError ? "text-warning/90" : ""}>
        {violation.message}
        {isError && hours !== undefined && hours > MAX_DAILY_HOURS && (
          <span className="block mt-1 text-sm">
            Please adjust your times. Maximum allowed: {MAX_DAILY_HOURS} hours per day.
          </span>
        )}
      </AlertDescription>
    </Alert>
  );
}
