import { Timestamp } from 'firebase/firestore';
import { EmailPriority } from '@/types/registratura';

/**
 * Calculate deadline based on priority
 * - urgent: 1 day
 * - normal: 30 days
 * - low: 60 days
 */
export function calculateDeadline(priority: EmailPriority, fromDate: Date = new Date()): Timestamp {
  const deadline = new Date(fromDate);

  switch (priority) {
    case 'urgent':
      deadline.setDate(deadline.getDate() + 1);
      break;
    case 'normal':
      deadline.setDate(deadline.getDate() + 30);
      break;
    case 'low':
      deadline.setDate(deadline.getDate() + 60);
      break;
  }

  return Timestamp.fromDate(deadline);
}

/**
 * Calculate days remaining until deadline
 * Returns negative number if overdue
 */
export function getDaysRemaining(deadline: Timestamp | null): number {
  if (!deadline) return 0;

  const now = new Date();
  const deadlineDate = deadline.toDate();
  const diffTime = deadlineDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Check if deadline is overdue
 */
export function isOverdue(deadline: Timestamp | null): boolean {
  return getDaysRemaining(deadline) < 0;
}

/**
 * Format days remaining for display
 */
export function formatDaysRemaining(deadline: Timestamp | null): string {
  if (!deadline) return 'Fără termen';

  const days = getDaysRemaining(deadline);

  if (days < 0) {
    return `Depășit cu ${Math.abs(days)} ${Math.abs(days) === 1 ? 'zi' : 'zile'}`;
  }

  if (days === 0) {
    return 'Astăzi';
  }

  if (days === 1) {
    return 'Mâine';
  }

  return `${days} zile`;
}
