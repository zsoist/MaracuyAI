import { useEffect, useState } from 'react';
import * as api from '../services/api';
import { useStore } from '../store/useStore';

export function useAuth() {
  const { setUser, isAuthenticated } = useStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      await api.ensureGuestIdentity();
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
