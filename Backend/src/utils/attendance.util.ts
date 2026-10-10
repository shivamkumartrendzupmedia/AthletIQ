/**
 * Shared Attendance Rate Calculation Utility
 *
 * Formula:
 * Rate = ((present + late) / (present + late + absent)) * 100
 * Rounded to 1 decimal place.
 * Excused absences are excluded from both numerator and denominator.
 * Returns null when the denominator (present + late + absent) is 0.
 */
export function calculateAttendanceRate(
  present: number,
  late: number,
  absent: number
): number | null {
  const denominator = present + late + absent;
  if (denominator <= 0) {
    return null;
  }
  return Math.round(((present + late) / denominator) * 1000) / 10;
}
