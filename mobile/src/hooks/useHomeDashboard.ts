import { Alert } from 'react-native';
import { useCallback, useEffect, useState } from 'react';

import { FEATURES } from '../config/env';
import { useI18n } from '../i18n/useI18n';
import * as api from '../services/api';
import { useStore } from '../store/useStore';
import type { ContextSnapshot, RiskEvent } from '../types';
import { getErrorMessage } from '../utils/errorMessage';

export function useHomeDashboard() {
  const { t } = useI18n();
  const setParakeets = useStore((state) => state.setParakeets);
  const [alerts, setAlerts] = useState<api.Alert[]>([]);
  const [contextSnapshot, setContextSnapshot] = useState<ContextSnapshot | null>(null);
  const [riskEvents, setRiskEvents] = useState<RiskEvent[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [parakeetData, alertData, currentContext, risks] = await Promise.all([
        api.getParakeets(),
        api.getAlerts(),
        FEATURES.contextEngine ? api.getCurrentContext() : Promise.resolve(null),
        FEATURES.contextEngine ? api.getRiskEvents(3) : Promise.resolve([]),
      ]);
      setParakeets(parakeetData);
      setAlerts(alertData);
      setContextSnapshot(currentContext);
      setRiskEvents(risks);
    } catch (error) {
      Alert.alert(
        t('commonError'),
        getErrorMessage(error, t('errorLoadDashboard'))
      );
    }
  }, [setParakeets, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  return { alerts, contextSnapshot, riskEvents, refreshing, onRefresh };
}
