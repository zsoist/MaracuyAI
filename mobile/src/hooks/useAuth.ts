import { useEffect, useState } from 'react';
import * as api from '../services/api';
import { useStore } from '../store/useStore';

export function useAuth() {
  const { setUser, isAuthenticated } = useStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const user = await api.getMe();
      setUser(user);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  return { isLoading, isAuthenticated };
}
