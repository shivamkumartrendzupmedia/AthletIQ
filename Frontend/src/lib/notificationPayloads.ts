export interface NotificationFilterParams {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}

export function buildNotificationQueryParams(params: NotificationFilterParams): Record<string, string> {
  const query: Record<string, string> = {};

  if (params.page !== undefined && params.page > 0) {
    query.page = String(Math.floor(params.page));
  }
  if (params.limit !== undefined && params.limit > 0) {
    query.limit = String(Math.min(100, Math.floor(params.limit)));
  }
  if (params.unreadOnly === true) {
    query.unreadOnly = 'true';
  }

  return query;
}

export function formatNotificationTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (60 * 1000));
    const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
    const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}
