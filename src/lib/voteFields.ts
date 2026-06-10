/** Entity rows that expose on-chain / API vote rosters. */
export type VoteRosterRecord = {
  approvers?: string[] | null;
  refusers?: string[] | null;
};

export type VoteActor = {
  address?: string | null;
  id?: string | null;
  profileId?: string | null;
};

function normalizeVoteId(value?: string | null): string {
  return (value ?? '').trim().toLowerCase();
}

function strip0x(value: string): string {
  return value.startsWith('0x') ? value.slice(2) : value;
}

function voteIdsMatch(rosterEntry: string, userId: string): boolean {
  const a = normalizeVoteId(rosterEntry);
  const b = normalizeVoteId(userId);
  if (!a || !b) return false;
  if (a === b) return true;
  return strip0x(a) === strip0x(b);
}

function isInRoster(list: string[] | null | undefined, userIds: string[]): boolean {
  if (!Array.isArray(list) || list.length === 0 || userIds.length === 0) return false;
  return list.some((entry) => userIds.some((uid) => voteIdsMatch(entry, uid)));
}

/** Collect wallet / profile identifiers for the signed-in user. */
export function getUserVoteIds(user?: VoteActor | null): string[] {
  const raw = [user?.address, user?.id, user?.profileId]
    .map(normalizeVoteId)
    .filter(Boolean);
  return [...new Set(raw)];
}

/** True when the user already appears in `approvers` or `refusers`. */
export function hasUserCastVote(record: VoteRosterRecord, user?: VoteActor | null): boolean {
  const userIds = getUserVoteIds(user);
  if (userIds.length === 0) return false;
  return isInRoster(record.approvers, userIds) || isInRoster(record.refusers, userIds);
}

/** Voting is closed for this row (approved, refused, etc.). */
export function isVoteSessionClosed(status?: string | null): boolean {
  const s = (status ?? '').trim().toLowerCase().replace(/\s+/g, '_');
  return ['approved', 'refused', 'rejected', 'closed', 'executed', 'cancelled', 'canceled'].includes(s);
}

/** Dim / disable vote controls when the session ended or the user already voted. */
export function isVoteActionsLocked(
  record: VoteRosterRecord,
  user: VoteActor | null | undefined,
  status?: string | null,
): boolean {
  return isVoteSessionClosed(status) || hasUserCastVote(record, user);
}

export function getRosterVoteCounts(record: VoteRosterRecord): { approve: number; refuse: number } {
  return {
    approve: record.approvers?.length ?? 0,
    refuse: record.refusers?.length ?? 0,
  };
}

function rosterVotePercent(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

export function getRosterApprovePercent(record: VoteRosterRecord): number {
  const { approve, refuse } = getRosterVoteCounts(record);
  return rosterVotePercent(approve, approve + refuse);
}

export function getRosterRefusePercent(record: VoteRosterRecord): number {
  const { approve, refuse } = getRosterVoteCounts(record);
  return rosterVotePercent(refuse, approve + refuse);
}
