import { apiService } from './api.service';
import type { CenterQueryParams, EstablishedRegionDetail, PaginationResponse, SupportCenter } from '@/src/types/api.types';

/** List center “campaigns” (same as GET /centers on mobile Discover). */
export async function listCampaignCenters(params?: CenterQueryParams) {
  const res = await apiService.get<PaginationResponse<SupportCenter[]>>('/centers', { params });
  return res.data;
}

/** GET /regions/established/{region} — children + pool stats for a region. */
export async function getEstablishedRegion(region: string, page: number, pageSize: number) {
  const res = await apiService.get<EstablishedRegionDetail>(
    `/regions/established/${encodeURIComponent(region)}`,
    { params: { page, page_size: pageSize } },
  );
  return res.data;
}
