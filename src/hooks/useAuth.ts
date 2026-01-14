// src/hooks/useAuth.ts
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { loginUser, registerUser, logoutUser, fetchCurrentUser } from '../store/authSlice';
import { LoginCredentials, RegisterData } from '../services/auth.services';

export const useAuth = () => {
  const dispatch = useDispatch<AppDispatch>();
  const auth = useSelector((state: RootState) => state.auth);

  const login = async (credentials: LoginCredentials) => {
    return dispatch(loginUser(credentials)).unwrap();
  };

  const register = async (data: RegisterData) => {
    return dispatch(registerUser(data)).unwrap();
  };

  const logout = async () => {
    return dispatch(logoutUser()).unwrap();
  };

  const getCurrentUser = async () => {
    return dispatch(fetchCurrentUser()).unwrap();
  };

  return {
    ...auth,
    login,
    register,
    logout,
    getCurrentUser,
  };
};