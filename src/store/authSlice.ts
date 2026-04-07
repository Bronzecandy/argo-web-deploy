import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { authService, AuthUser } from '@/src/services/auth.service';
import { jwtToAddress } from '@/src/lib/zklogin';
import { getSubFromJWT } from '@/src/lib/jwt';
import type { LoginRequest } from '@/src/types/api.types';

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

export const loginWithZKLogin = createAsyncThunk(
  'auth/loginWithZKLogin',
  async (googleIdToken: string, { rejectWithValue }) => {
    try {
      const sub = getSubFromJWT(googleIdToken);
      const saltResponse = await authService.getSalt(sub);
      const salt = saltResponse;
      const address = jwtToAddress(googleIdToken, salt, false);
      const credentials: LoginRequest = { address, sub };
      const { token, user } = await authService.login(credentials);
      return { token, user };
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.message || err?.message || 'Login failed');
    }
  },
);

export const restoreSession = createAsyncThunk(
  'auth/restoreSession',
  async (_, { rejectWithValue }) => {
    try {
      const user = authService.getStoredUser();
      if (!user) throw new Error('No stored session');
      return user;
    } catch {
      return rejectWithValue('No session');
    }
  },
);

export const logoutUser = createAsyncThunk('auth/logout', async () => {
  await authService.logout();
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginWithZKLogin.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginWithZKLogin.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
      })
      .addCase(loginWithZKLogin.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(restoreSession.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload;
      })
      .addCase(restoreSession.rejected, (state) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.isAuthenticated = false;
        state.user = null;
        state.isLoading = false;
      });
  },
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;
