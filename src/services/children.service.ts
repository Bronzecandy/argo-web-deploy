import { unwrapEntityFromGetById } from '@/src/lib/paginationUnwrap';
import { apiService } from './api.service';
import type {
  PaginationResponse,
  Child,
  ChildrenQueryParams,
  UpdateChildNeedRequest,
  CreateNormalNeedWithdrawProposalRequest,
  CreateSpecialNeedProposalRequest,
  CreateSpecialNeedWithdrawProposalRequest,
  BuildTransactionResponse,
  MessageResponse,
  UrlResponse,
  UploadChildRequest,
  VoteRequest,
  PendingSpecialNeedProposal,
} from '@/src/types/api.types';

type TxOrMessage = BuildTransactionResponse | MessageResponse;

class ChildrenService {
  async list(params?: ChildrenQueryParams) {
    return apiService.get<PaginationResponse<Child[]>>('/children', { params });
  }

  async getById(id: string) {
    const res = await apiService.get<unknown>(`/children/${id}`);
    return { ...res, data: unwrapEntityFromGetById<Child>(res.data) };
  }

  /** GET /children/user/{wallet}/supported — children the donor has supported (My Track). */
  async listSupportedByWallet(walletAddress: string, params?: { page?: number; page_size?: number }) {
    return apiService.get<PaginationResponse<Child[]>>(`/children/user/${walletAddress}/supported`, {
      params,
    });
  }

  async upload(data: UploadChildRequest) {
    return apiService.post<BuildTransactionResponse>('/children', data);
  }

  // ─── Meal need ─────────────────────────────────────────
  async updateMealNeed(data: UpdateChildNeedRequest) {
    return apiService.put<BuildTransactionResponse>('/children/meal-need', data);
  }

  async createMealWithdrawProposal(data: CreateNormalNeedWithdrawProposalRequest) {
    return apiService.post<TxOrMessage>('/children/meal-need/withdraw-proposal', data);
  }

  async supportMealNeed(needId: string, months: number) {
    return apiService.post<UrlResponse>(`/children/meal-need/${needId}/support`, { months });
  }

  async confirmProvideMeal(childId: string, image_blob_id: string) {
    return apiService.post<BuildTransactionResponse>(`/children/${childId}/provide-meal/confirm`, { image_blob_id });
  }

  // ─── Books need ────────────────────────────────────────
  async updateBooksNeed(data: UpdateChildNeedRequest) {
    return apiService.put<BuildTransactionResponse>('/children/books-need', data);
  }

  async createBooksWithdrawProposal(data: CreateNormalNeedWithdrawProposalRequest) {
    return apiService.post<TxOrMessage>('/children/books-need/withdraw-proposal', data);
  }

  async supportBooksNeed(needId: string) {
    return apiService.post<UrlResponse>(`/children/books-need/${needId}/support`, null);
  }

  // ─── Health insurance need ─────────────────────────────
  async updateHealthInsuranceNeed(data: UpdateChildNeedRequest) {
    return apiService.put<BuildTransactionResponse>('/children/health-insurance-need', data);
  }

  async createHealthInsuranceWithdrawProposal(data: CreateNormalNeedWithdrawProposalRequest) {
    return apiService.post<TxOrMessage>('/children/health-insurance-need/withdraw-proposal', data);
  }

  async supportHealthInsuranceNeed(needId: string) {
    return apiService.post<UrlResponse>(`/children/health-insurance-need/${needId}/support`, null);
  }

  // ─── Special need ──────────────────────────────────────
  async createSpecialNeedProposal(data: CreateSpecialNeedProposalRequest) {
    return apiService.post<PendingSpecialNeedProposal | TxOrMessage>('/children/special-need/proposal', data);
  }

  async voteSpecialNeedProposal(id: string, data: VoteRequest) {
    return apiService.post<BuildTransactionResponse>(`/children/special-need/proposal/${id}/vote`, data);
  }

  async confirmSpecialNeedProposal(id: string) {
    return apiService.post<BuildTransactionResponse>(`/children/special-need/proposal/${id}/confirm`, null);
  }

  async createSpecialNeedWithdrawProposal(data: CreateSpecialNeedWithdrawProposalRequest) {
    return apiService.post<TxOrMessage>('/children/special-need/withdraw-proposal', data);
  }

  async supportSpecialNeed(campaignId: string, data: { amount: number; description: string }) {
    return apiService.post<UrlResponse>(`/children/special-need/${campaignId}/support`, data);
  }

  // ─── Metadata ──────────────────────────────────────────
  async addStringMetadata(childId: string, data: { key: string; value: string }) {
    return apiService.put<BuildTransactionResponse>(`/children/metadata/string/${childId}`, data);
  }

  async addNumberMetadata(childId: string, data: { key: string; value: string }) {
    return apiService.put<BuildTransactionResponse>(`/children/metadata/number/${childId}`, data);
  }

  /**
   * Resolve Child for leader flows using GET /children (paginated), avoiding GET /children/:id when upload id is not a child id.
   * Tie-break duplicate identity_code: match first_name, last_name, region with upload row; else newest updated_at.
   */
  async findChildByIdentityCode(
    identityCode: string,
    hints: { first_name?: string; last_name?: string; region?: string },
  ): Promise<Child | null> {
    const code = identityCode.trim();
    if (!code) return null;

    const PAGE_SIZE = 100;
    const matches: Child[] = [];
    let page = 0;
    let totalPages = 1;

    do {
      const res = await this.list({
        page,
        page_size: PAGE_SIZE,
        keyword: code,
      });
      const body = res.data;
      const rows = Array.isArray(body.data) ? body.data : [];
      totalPages = Math.max(1, body.total_pages ?? 1);
      for (const c of rows) {
        if ((c.identity_code || '').trim() === code) matches.push(c);
      }
      page += 1;
    } while (page < totalPages);

    if (matches.length === 0) return null;

    const fn = (hints.first_name || '').trim().toLowerCase();
    const ln = (hints.last_name || '').trim().toLowerCase();
    const reg = (hints.region || '').trim().toLowerCase();

    const nameMatches = matches.filter(
      (c) =>
        (c.first_name || '').trim().toLowerCase() === fn &&
        (c.last_name || '').trim().toLowerCase() === ln &&
        (c.region || '').trim().toLowerCase() === reg,
    );

    const pool = nameMatches.length > 0 ? nameMatches : matches;

    const tsec = (iso: string | undefined) => {
      const t = iso ? new Date(iso).getTime() : 0;
      return Number.isFinite(t) ? t : 0;
    };

    const newest = (c: Child) => Math.max(tsec(c.updated_at), tsec(c.uploaded_at));
    pool.sort((a, b) => newest(b) - newest(a));
    return pool[0] ?? null;
  }
}

export const childrenService = new ChildrenService();
