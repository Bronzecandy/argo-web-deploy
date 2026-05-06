import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { poolService } from '@/src/services/pool.service';

export type LeaderPoolLoadStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

export interface LeaderPoolState {
  poolId: string | null;
  poolName: string;
  totalDonation: number;
  status: LeaderPoolLoadStatus;
  error: string | null;
}

const initialState: LeaderPoolState = {
  poolId: null,
  poolName: '',
  totalDonation: 0,
  status: 'idle',
  error: null,
};

export const fetchLeaderPool = createAsyncThunk(
  'leaderPool/fetchLeaderPool',
  async (walletAddress: string, { rejectWithValue }) => {
    try {
      const res = await poolService.getLeaderPool(walletAddress);
      return res.data;
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? String((err as { response?: { data?: { message?: string } } }).response?.data?.message ?? '')
          : '';
      return rejectWithValue(msg || (err instanceof Error ? err.message : 'Failed to load leader pool'));
    }
  },
);

const leaderPoolSlice = createSlice({
  name: 'leaderPool',
  initialState,
  reducers: {
    resetLeaderPool: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchLeaderPool.pending, (state) => {
        state.status = 'loading';
        state.error = null;
        state.poolId = null;
        state.poolName = '';
        state.totalDonation = 0;
      })
      .addCase(fetchLeaderPool.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.poolId = action.payload.id;
        state.poolName = action.payload.pool_name ?? '';
        state.totalDonation = typeof action.payload.total_donation === 'number' ? action.payload.total_donation : 0;
        state.error = null;
      })
      .addCase(fetchLeaderPool.rejected, (state, action) => {
        state.status = 'failed';
        state.error = (action.payload as string) || 'Failed to load leader pool';
        state.poolId = null;
        state.poolName = '';
        state.totalDonation = 0;
      });
  },
});

export const { resetLeaderPool } = leaderPoolSlice.actions;
export default leaderPoolSlice.reducer;
