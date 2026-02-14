import { Alert } from 'react-native';
import { useCallback, useEffect, useState } from 'react';

import * as api from '../services/api';
import { useStore } from '../store/useStore';
import { getErrorMessage } from '../utils/errorMessage';

export function useHomeDashboard() {
  const setParakeets = useStore((state) => state.setParakeets);
  const [alerts, setAlerts] = useState<api.Alert[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [parakeetData, alertData] = await Promise.all([
        api.getParakeets(),
        api.getAlerts(),
      ]);
      setParakeets(parakeetData);
      setAlerts(alertData);
    } catch (error) {
      Alert.alert(
        'Error',
        getErrorMessage(error, 'No se pudo actualizar el tablero.')
      );
    }
  }, [setParakeets]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  return { alerts, refreshing, onRefresh };
}
