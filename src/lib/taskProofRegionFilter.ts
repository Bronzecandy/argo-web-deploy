import { taskProofService } from '@/src/services/task-proof.service';
import { taskService } from '@/src/services/task.service';
import type { TaskProof } from '@/src/types/api.types';

const TASK_PAGE_SIZE = 100;
const MAX_TASK_PAGES = 50;
const PROOF_PAGE_SIZE = 100;
const MAX_PROOF_PAGES = 50;

/** Load all task ids belonging to a region (task-proof list has no region field). */
export async function loadTaskIdsForRegion(region: string): Promise<Set<string>> {
  const ids = new Set<string>();
  let page = 0;
  let totalPages = 1;

  while (page < totalPages && page < MAX_TASK_PAGES) {
    const res = await taskService.list({
      region,
      page,
      page_size: TASK_PAGE_SIZE,
      sort_order: 'desc',
    });
    for (const task of res.data.data ?? []) {
      if (task.id) ids.add(task.id);
    }
    totalPages = Math.max(1, res.data.total_pages ?? 1);
    page += 1;
  }

  return ids;
}

async function loadAllTaskProofs(review_status?: string): Promise<TaskProof[]> {
  const out: TaskProof[] = [];
  let page = 0;
  let totalPages = 1;

  while (page < totalPages && page < MAX_PROOF_PAGES) {
    const res = await taskProofService.list({
      page,
      page_size: PROOF_PAGE_SIZE,
      sort_order: 'desc',
      review_status: review_status || undefined,
    });
    out.push(...(res.data.data ?? []));
    totalPages = Math.max(1, res.data.total_pages ?? 1);
    page += 1;
  }

  return out;
}

export type TaskProofRegionPage = {
  rows: TaskProof[];
  totalPages: number;
  totalCount: number;
  effectivePage: number;
};

/** Filter proofs by task ids in region, then paginate client-side. */
export async function fetchTaskProofsForRegion(opts: {
  taskIdsInRegion: Set<string>;
  page: number;
  pageSize: number;
  review_status?: string;
}): Promise<TaskProofRegionPage> {
  const all = await loadAllTaskProofs(opts.review_status);
  const filtered = all.filter((proof) => proof.task_id && opts.taskIdsInRegion.has(proof.task_id));
  const totalCount = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / opts.pageSize));
  const effectivePage = Math.min(Math.max(0, opts.page), totalPages - 1);
  const start = effectivePage * opts.pageSize;
  const rows = filtered.slice(start, start + opts.pageSize);

  return { rows, totalPages, totalCount, effectivePage };
}
