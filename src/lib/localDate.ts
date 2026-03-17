const LOCAL_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function parseAndValidateLocalDate(dateStr: string): Date {
  if (!LOCAL_DATE_REGEX.test(dateStr)) {
    throw new Error('INVALID_LOCAL_DATE');
  }

  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  const parsedDate = new Date(year, month - 1, day);
  parsedDate.setHours(0, 0, 0, 0);

  if (
    parsedDate.getFullYear() !== year ||
    parsedDate.getMonth() !== month - 1 ||
    parsedDate.getDate() !== day
  ) {
    throw new Error('INVALID_LOCAL_DATE');
  }

  return parsedDate;
}

export function getTodayInLocalTime(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
