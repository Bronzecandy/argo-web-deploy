// ─── Pagination ──────────────────────────────────────────
export interface PaginationResponse<T = any> {
  data: T;
  amount: number;
  page: number;
  total_pages: number;
}

export interface MessageResponse {
  message: string;
}

export interface UrlResponse {
  url: string;
}

/** PayOS / donate-style redirect responses (may include payment id for polling). */
export interface PaymentRedirectResponse extends UrlResponse {
  payment_id?: string | number;
  order_code?: string | number;
  id?: string | number;
}

export interface BuildTransactionResponse {
  tx_bytes: string;
  center_req?: string;
  registration_req?: string;
  upload_child_req?: string;
  proposal_id?: string;
}

// ─── Auth ────────────────────────────────────────────────
export interface LoginRequest {
  address: string;
  sub: string;
}

export interface ExecuteTransactionRequest {
  tx_bytes: string;
  signature: string;
  center_req?: string;
  registration_req?: string;
  upload_child_req?: string;
  proposal_id?: string;
}

// ─── Profile ─────────────────────────────────────────────
export interface PersonalProfile {
  id: string;
  first_name: string;
  last_name: string;
  gender: string;
  date_of_birth: string;
  phone_number: string;
  email: string;
  identity_code: string;
}

export interface PersonalWalletProfile {
  first_name: string;
  last_name: string;
  wallet_address: string;
  total_donation: number;
  record_amount: number;
  page: number;
  total_pages: number;
  transaction_records: TransactionRecord[];
}

export interface UploadProfileRequest {
  first_name: string;
  last_name: string;
  gender: string;
  date_of_birth: string;
  phone_number: string;
  email: string;
  identity_code: string;
}

// ─── Registration ────────────────────────────────────────
export interface RegistrationRequest {
  id: string;
  profile_id: string;
  register_role: string;
  identity_code: string;
  identity_card_blob_id: string;
  avatar_blob_id: string;
  region: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  phone_number: string;
  email: string;
  gender: string;
  approvers: string[];
  refusers: string[];
  refuse_reasons: string[];
  status: string;
  isAvailableToConfirm: boolean;
  is_confirm_register: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  closed_at: string;
  ai_evaluation?: string;
}

export interface CreateRegistrationRequest {
  avatar_blob_id: string;
  identity_card_blob_id: string;
  region: string;
  register_role: string;
}

// ─── Center ──────────────────────────────────────────────
/** On-chain support center (GET /centers, GET /centers/:id, GET /centers/user/:wallet). */
export interface SupportCenter {
  id: string;
  region: string;
  center_address: string;
  center_phone_number: string;
  uploaded_at: string;
  updated_at: string;
}

export interface CenterRequest {
  id: string;
  profile_id: string;
  region: string;
  address: string;
  phone_number: string;
  image_blob_id: string;
  approvers: string[];
  refusers: string[];
  refuse_reasons: string[];
  status: string;
  isAvailableToConfirm: boolean;
  is_confirm_register: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  closed_at: string;
}

export interface CreateCenterRequest {
  address: string;
  image_blob_id: string;
  phone_number: string;
  region: string;
}

// ─── Child Upload ────────────────────────────────────────
export interface ChildGuardianProfile {
  full_name: string;
  phone_number: string;
  relation: string;
  identity_card_blob_id: string;
}

export interface UploadChildRequestEntity {
  id: string;
  profile_id: string;
  identity_code: string;
  avatar_blob_id: string;
  birth_certificate_blob_id?: string;
  region: string;
  first_name: string;
  last_name: string;
  gender: string;
  date_of_birth: string;
  home_address?: string;
  home_blob_id?: string;
  first_guardian_profile?: ChildGuardianProfile;
  second_guardian_profile?: ChildGuardianProfile;
  ai_evaluation?: string;
  review_status?: string;
  reviewed_by?: string;
  approvers: string[];
  refusers: string[];
  refuse_reasons: string[];
  status: string;
  is_confirm_upload: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  closed_at: string;
}

export interface UploadChildRequest {
  avatar_blob_id: string;
  first_name: string;
  last_name: string;
  gender: string;
  date_of_birth: string;
  region: string;
  home_address: string;
  home_blob_id: string;
  identity_code: string;
  first_guardian: GuardianInput;
  second_guardian?: GuardianInput;
}

export interface GuardianInput {
  guardian_full_name: string;
  guardian_phone_number: string;
  guardian_relation: string;
  identity_card_blob_id: string;
}

// ─── Children (on-chain) ────────────────────────────────
export interface Child {
  id: string;
  first_name: string;
  last_name: string;
  gender: string;
  date_of_birth: string;
  region: string;
  home_address: string;
  identity_code: string;
  avatar_blob_id: string;
  home_blob_id: string;
  birth_certificate_blob_id?: string;
  first_guardian?: GuardianInput;
  second_guardian?: GuardianInput;
  meal_need: string;
  health_insurance_need: string;
  books_needs: string[];
  special_need_campaigns: string[];
  special_need_proposals: string[];
  gifts: string[];
  dynamic_fields: string[];
  dynamic_values: Record<string, any>;
  image_blob_ids: string[];
  upload_image_periods: string[];
  uploaded_by: string;
  uploaded_at: string;
  updated_at: string;
}

/** PUT /children/meal-need | books-need | health-insurance-need — include need_id from the child record (meal_need, books_needs[], health_insurance_need); use empty string when creating a need before ids exist. */
export interface UpdateChildNeedRequest {
  child_id: string;
  need_id: string;
  value?: number;
}

export interface CreateNormalNeedWithdrawProposalRequest {
  need_id: string;
  proof_blob_id?: string;
}

export interface CreateSpecialNeedProposalRequest {
  child_id: string;
  description: string;
  target: number;
  proof_blob_id?: string;
}

export interface CreateSpecialNeedWithdrawProposalRequest {
  campaign_id: string;
  description: string;
  amount: number;
  proof_blob_id?: string;
}

// ─── Withdraw Proposals ──────────────────────────────────
export interface WithdrawProposal {
  id: string;
  creator: string;
  description: string;
  pool_name: string;
  withdraw_amount: number;
  approve_weight: number;
  refuse_weight: number;
  approvers: string[];
  refusers: string[];
  refuse_reasons: string[];
  approved_periods: string[];
  refused_periods: string[];
  is_executed: boolean;
  is_from_local_pool: boolean;
  /** Proof attachment when leader submits pool withdrawal (Walrus blob id). */
  proof_blob_id?: string;
  created_at: string;
  updated_at: string;
  closed_at: string;
}

/**
 * POST /withdraw-proposals/{id}/confirm — when PayOS is not used (manual bank transfer).
 * Client must POST proof `blob_id` to `payment_callback` after this response.
 */
export interface ManualBankTransferConfirmResponse {
  amount: string;
  bank_code: string;
  bank_org: string;
  description: string;
  owner: string;
  payment_callback: string;
  payment_id: string;
}

/** POST /withdraw-proposals/{id}/confirm — PayOS URL, manual bank callback, on-chain tx bytes, or plain message. */
export type WithdrawProposalConfirmResponse =
  | BuildTransactionResponse
  | MessageResponse
  | PaymentRedirectResponse
  | ManualBankTransferConfirmResponse;

/** GET /pools/leader/{walletAddress} — pool for the leader's assigned region */
export interface LeaderPoolDetail {
  id: string;
  pool_name: string;
  total_donation: number;
}

export interface CreateWithdrawProposalRequest {
  pool_id: string;
  description: string;
  withdraw_amount: number;
  proof_blob_id?: string;
}

// ─── Pending Withdraw Proposals ──────────────────────────
export interface PendingWithdrawProposal {
  id: string;
  poolID: string;
  poolName: string;
  profileID: string;
  creator: string;
  description: string;
  purpose: string;
  target: string;
  withdrawAmount: number;
  proofBlobID: string;
  aievaluation: string;
  status: string;
  reviewedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePendingWithdrawProposalRequest {
  pool_id: string;
  description: string;
  withdraw_amount: number;
  proof_blob_id?: string;
}

// ─── Pending Special Need Proposals ──────────────────────
export interface PendingSpecialNeedProposal {
  id: string;
  child_id: string;
  actor_address: string;
  actor_profile_id: string;
  description: string;
  target: number;
  proof_blob_id: string;
  region: string;
  ai_evaluation: string;
  review_status: string;
  reviewed_by: string;
  created_at: string;
  updated_at: string;
}

// ─── Staff ───────────────────────────────────────────────
export interface Staff {
  id: string;
  user: string;
  first_name: string;
  last_name: string;
  gender: string;
  identity_code: string;
  phone_number: string;
  email: string;
  region: string;
  avatar_blob_id?: string;
  date_of_birth?: string;
  nfts: StaffNft[];
  uploaded_at: string;
}

export interface StaffNft {
  id: string;
  name: string;
  owner: string;
  role: string;
  region: string;
  first_name: string;
  last_name: string;
  gender: string;
  identity_code: string;
  phone_number: string;
  email: string;
  avatar_blob_id: string;
  identity_card_blob_id: string;
  date_of_birth: string;
  uploaded_at: string;
  url: string;
}

// ─── Donor ───────────────────────────────────────────────
export interface Donor {
  id: string;
  /** Wallet / on-chain owner. */
  owner?: string;
  name: string;
  first_name: string;
  last_name: string;
  gender: string;
  phone_number: string;
  email: string;
  total_donation: number;
  url: string;
  supported_childs?: string[];
  contributions: TransactionRecord[];
}

// ─── Transactions ────────────────────────────────────────
export interface TransactionRecord {
  id: string;
  actor_address: string;
  action_type: string;
  amount: number;
  coin_type: string;
  pool_name: string;
  message: string;
  created_at: string;
}

// ─── Bank Profile ────────────────────────────────────────
export interface BankProfile {
  id: string;
  profile_id: string;
  owner: string;
  bank_org: string;
  bank_code: string;
  owner_name: string;
  payos_client_id?: string;
  payos_api_key?: string;
  payos_check_sum_key?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateBankProfileRequest {
  bank_code: string;
  bank_org: string;
  owner_name: string;
  payos_client_id?: string;
  payos_api_key?: string;
  payos_check_sum_key?: string;
}

export interface UpdateBankProfileRequest {
  bank_code?: string;
  bank_org?: string;
  owner_name?: string;
  payos_client_id?: string;
  payos_api_key?: string;
  payos_check_sum_key?: string;
}

// ─── Region ──────────────────────────────────────────────
export interface RegionsResponse {
  regions: string[];
}

export interface SupportedRegionSuggestion {
  id: string;
  profile_id: string;
  region: string;
  content: string;
  status?: string;
  created_by: string;
  reviewed_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSupportedRegionSuggestionRequest {
  region: string;
  content: string;
}

/** Child row under GET /regions/established/{region}. */
export interface EstablishedRegionChild {
  id: string;
  first_name?: string;
  last_name?: string;
  gender?: string;
  identity_code?: string;
}

/** GET /regions/established/{region} — pool + children (mobile CampaignDetail). */
export interface EstablishedRegionDetail {
  region: string;
  pool_id: string;
  center_phone_number: string;
  center_address: string;
  center_image_blob_id: string;
  total_donated: number;
  children: PaginationResponse<EstablishedRegionChild[]>;
}

// ─── Notification ────────────────────────────────────────
export interface Notification {
  id: string;
  content: string;
  region: string;
  created_at: string;
  updated_at: string;
}

// ─── Gift ────────────────────────────────────────────────
export interface Gift {
  id: string;
  sender: string;
  recipient: string;
  category: string;
  description: string;
  message: string;
  gift_image_blob_id: string;
  delivered_image_blob_id?: string;
  carrier: string;
  tracking_code: string;
  status: string;
  is_for_child: boolean;
  confirm_recieved_by?: string;
  cancel_reason?: string;
  uploaded_at: string;
  delivered_at?: string;
  updated_at: string;
}

// ─── Task ────────────────────────────────────────────────
export interface Task {
  id: string;
  description: string;
  region: string;
  start_period: string;
  end_period: string;
  status: string;
  assigned_staff?: string;
  reviewed_by?: string;
  created_at: string;
  updated_at: string;
}

/** Leader-led task creation request payload. */
export interface CreateTaskRequest {
  description: string;
  end_period: string;
  is_child_task: boolean;
  region: string;
  start_period: string;
  child_id?: string;
  need_id?: string;
}

export interface TaskProof {
  id: string;
  task_id?: string;
  actor_address: string;
  image_blob_id: string;
  /** Legacy field; list API may expose only `review_status`. */
  status?: string;
  review_status?: string;
  description?: string;
  actor_profile_id?: string;
  ai_evaluation?: string;
  raw_submit_date?: string;
  reviewed_by?: string;
  created_at: string;
  updated_at: string;
}

// ─── Vote ────────────────────────────────────────────────
export interface VoteRequest {
  is_vote_yes: boolean;
  refuse_reason?: string;
}

// ─── Payment ─────────────────────────────────────────────
export interface DonateRequest {
  pool_id: string;
  amount: number;
  message?: string;
}

/** entities.Payment — GET /payments */
export interface Payment {
  id: string;
  actor?: string;
  amount?: number;
  cancel_reason?: string;
  created_at?: string;
  currency?: string;
  donation_id?: string;
  expired_at?: string;
  is_donate_tx?: boolean;
  is_transferred?: boolean;
  message?: string;
  method?: string;
  profile_id?: string;
  proof_blob_id?: string;
  proposal_id?: string;
  review_status?: string;
  reviewed_by?: string;
  status?: string;
  transaction_id?: string;
  transferred_at?: string;
  updated_at?: string;
}

// ─── Admin ───────────────────────────────────────────────
export interface UpdatePublisherInfoRequest {
  first_name: string;
  last_name: string;
  gender: string;
  date_of_birth: string;
  phone_number: string;
  email: string;
  identity_code: string;
  avatar_blob_id: string;
  identity_card_blob_id: string;
}

// ─── Config ──────────────────────────────────────────────
export interface UpdateChildEditNeedDatesRequest {
  start_date?: string;
  end_date?: string;
}

// ─── Query Params ────────────────────────────────────────
export interface PaginationParams {
  page?: number;
  page_size?: number;
  keyword?: string;
  sort_order?: 'asc' | 'desc';
  sort_criteria?: string;
}

export interface RegistrationQueryParams extends PaginationParams {
  status?: string;
  region?: string;
  register_role?: string;
  gender?: string;
  is_closed?: boolean;
  is_available_to_confirm?: boolean;
}

export interface CenterQueryParams extends PaginationParams {
  status?: string;
  region?: string;
  is_closed?: boolean;
  is_available_to_confirm?: boolean;
}

/** GET /center-reqs */
export interface CenterReqQueryParams extends PaginationParams {
  status?: string;
  region?: string;
  keyword?: string;
  is_closed?: boolean;
  is_available_to_confirm?: boolean;
}

export interface ChildUploadQueryParams extends PaginationParams {
  status?: string;
  review_status?: string;
  region?: string;
  gender?: string;
  is_closed?: boolean;
}

export interface ChildrenQueryParams extends PaginationParams {
  region?: string;
  gender?: string;
  year_of_birth?: number;
  /** If supported by BE, narrows GET /children (e.g. identity fragment). */
  keyword?: string;
}

export interface WithdrawQueryParams extends PaginationParams {
  creator?: string;
  is_closed?: boolean;
  is_executed?: boolean;
  min_amount?: number;
  max_amount?: number;
  /** If supported by BE, filter proposals from local leader pools. */
  is_from_local_pool?: boolean;
}

export interface PaymentQueryParams extends PaginationParams {
  actor?: string;
  filter_prop?: string;
  is_donate_payment?: boolean;
  is_payment_expired?: boolean;
  keyword?: string;
  max_amount?: number;
  method?: string;
  min_amount?: number;
  status?: string;
}

export interface PendingWithdrawQueryParams extends PaginationParams {
  creator?: string;
  status?: string;
  reviewer?: string;
  min_amount?: number;
  max_amount?: number;
}

export interface PendingSpecialNeedQueryParams extends PaginationParams {
  creator?: string;
  status?: string;
  region?: string;
  reviewer?: string;
  min_amount?: number;
  max_amount?: number;
}

export interface TaskQueryParams extends PaginationParams {
  region?: string;
  status?: string;
  assigned_staff?: string;
  reviewed_by?: string;
}

export interface TaskProofQueryParams extends PaginationParams {
  actor_address?: string;
  status?: string;
  review_status?: string;
  reviewed_by?: string;
}

export interface StaffQueryParams extends PaginationParams {
  region?: string;
  role?: string;
  gender?: string;
  year_of_birth?: number;
}

export interface DonorQueryParams extends PaginationParams {
  gender?: string;
}

export interface TxRecordQueryParams extends PaginationParams {
  action_type?: string;
  actor?: string;
  pool_id?: string;
  min_amount?: number;
  max_amount?: number;
}

export interface GiftQueryParams extends PaginationParams {
  category?: string;
  status?: string;
}
