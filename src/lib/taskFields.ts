import type { Task } from '@/src/types/api.types';

/** Resolves staff wallet from API (Swagger uses `assgined_staff`). */
export function getTaskAssignedStaff(task: Task): string | undefined {
  const id = task.assigned_staff?.trim() || task.assgined_staff?.trim();
  return id || undefined;
}
