// SIWES Hours Validation Utilities

// Constants
export const MAX_DAILY_HOURS = 8;
export const MIN_WEEKLY_HOURS = 35;
export const REQUIRED_WEEKS = 24;
export const HOURS_PER_DAY = 8;
export const DAYS_PER_WEEK = 5;
export const TOTAL_REQUIRED_HOURS = REQUIRED_WEEKS * DAYS_PER_WEEK * HOURS_PER_DAY; // 960 hours
export const TOTAL_REQUIRED_DAYS = REQUIRED_WEEKS * DAYS_PER_WEEK; // 120 days

export interface TimeRange {
  start_time: string;
  end_time: string;
}

export interface HoursViolation {
  type: 'max_hours_exceeded' | 'below_weekly_minimum';
  message: string;
  severity: 'warning' | 'error';
}

export interface WeeklyHoursSummary {
  weekStart: Date;
  weekEnd: Date;
  totalHours: number;
  entries: number;
  hasViolation: boolean;
  violation?: HoursViolation;
}

/**
 * Calculate hours worked from start and end times
 */
export function calculateHoursFromTime(startTime: string, endTime: string): number {
  if (!startTime || !endTime) return 0;
  
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  
  // Handle overnight shifts (end time is earlier than start)
  let totalMinutes = endMinutes - startMinutes;
  if (totalMinutes < 0) {
    totalMinutes += 24 * 60; // Add 24 hours
  }
  
  return Math.round((totalMinutes / 60) * 100) / 100; // Round to 2 decimal places
}

/**
 * Validate daily hours against maximum allowed
 */
export function validateDailyHours(hours: number): HoursViolation | null {
  if (hours > MAX_DAILY_HOURS) {
    return {
      type: 'max_hours_exceeded',
      message: `Entry exceeds maximum ${MAX_DAILY_HOURS} hours per day (${hours}h logged)`,
      severity: 'error',
    };
  }
  return null;
}

/**
 * Validate weekly hours against minimum requirement
 */
export function validateWeeklyHours(totalHours: number): HoursViolation | null {
  if (totalHours < MIN_WEEKLY_HOURS) {
    return {
      type: 'below_weekly_minimum',
      message: `Week has only ${totalHours}h logged (minimum: ${MIN_WEEKLY_HOURS}h required)`,
      severity: 'warning',
    };
  }
  return null;
}

/**
 * Get the start of the week (Monday) for a given date
 */
export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when Sunday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get the end of the week (Sunday) for a given date
 */
export function getWeekEnd(date: Date): Date {
  const start = getWeekStart(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

/**
 * Group entries by week and calculate weekly totals
 */
export function calculateWeeklyHours(
  entries: { entry_date: string; hours_worked: number | null; status: string }[]
): WeeklyHoursSummary[] {
  const weeklyMap = new Map<string, WeeklyHoursSummary>();
  
  entries.forEach((entry) => {
    const entryDate = new Date(entry.entry_date);
    const weekStart = getWeekStart(entryDate);
    const weekKey = weekStart.toISOString();
    
    if (!weeklyMap.has(weekKey)) {
      weeklyMap.set(weekKey, {
        weekStart,
        weekEnd: getWeekEnd(entryDate),
        totalHours: 0,
        entries: 0,
        hasViolation: false,
      });
    }
    
    const week = weeklyMap.get(weekKey)!;
    // Only count approved entries for weekly totals
    if (entry.status === 'approved') {
      week.totalHours += entry.hours_worked || 0;
    }
    week.entries++;
  });
  
  // Check for weekly violations
  weeklyMap.forEach((week) => {
    const violation = validateWeeklyHours(week.totalHours);
    if (violation) {
      week.hasViolation = true;
      week.violation = violation;
    }
  });
  
  return Array.from(weeklyMap.values()).sort(
    (a, b) => b.weekStart.getTime() - a.weekStart.getTime()
  );
}

/**
 * Calculate completion percentage
 */
export function calculateCompletionPercentage(completedHours: number): number {
  return Math.min(Math.round((completedHours / TOTAL_REQUIRED_HOURS) * 100), 100);
}

/**
 * Format time for display
 */
export function formatTime(time: string | null): string {
  if (!time) return '--:--';
  return time.slice(0, 5); // HH:MM format
}

/**
 * Format hours for display
 */
export function formatHours(hours: number): string {
  if (hours === Math.floor(hours)) {
    return `${hours}h`;
  }
  return `${hours.toFixed(1)}h`;
}

/**
 * Check if an entry has hard constraint violations that prevent approval
 */
export function hasHardConstraintViolation(hours: number): boolean {
  return hours > MAX_DAILY_HOURS;
}
