import { useState, useEffect } from 'react';
import { revenueCatService } from '../services/revenuecat';

type Plan = 'free' | 'monthly' | 'annual' | 'lifetime';

interface UseSubscriptionReturn {
  isPremium: boolean;
  currentPlan: Plan;
  purchaseMonthly: () => Promise<boolean>;
  purchaseAnnual: () => Promise<boolean>;
  purchaseLifetime: () => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  isLoading: boolean;
}

export function useSubscription(): UseSubscriptionReturn {
  const [isPremium, setIsPremium] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<Plan>('free');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    checkSubscription();
  }, []);

  const checkSubscription = async () => {
    const isPrem = await revenueCatService.checkEntitlement('premium');
    setIsPremium(isPrem);

    if (isPrem) {
      // Determinar plan basado en RevenueCat
      setCurrentPlan('monthly');
    } else {
      setCurrentPlan('free');
    }
  };

  const purchaseMonthly = async (): Promise<boolean> => {
    setIsLoading(true);
    const success = await revenueCatService.purchasePackage('jaco_soberano_monthly');
    if (success) {
      await checkSubscription();
    }
    setIsLoading(false);
    return success;
  };

  const purchaseAnnual = async (): Promise<boolean> => {
    setIsLoading(true);
    const success = await revenueCatService.purchasePackage('jaco_soberano_annual');
    if (success) {
      await checkSubscription();
    }
    setIsLoading(false);
    return success;
  };

  const purchaseLifetime = async (): Promise<boolean> => {
    setIsLoading(true);
    const success = await revenueCatService.purchasePackage('jaco_maestro_lifetime');
    if (success) {
      await checkSubscription();
    }
    setIsLoading(false);
    return success;
  };

  const restorePurchases = async (): Promise<boolean> => {
    setIsLoading(true);
    const success = await revenueCatService.restorePurchases();
    if (success) {
      await checkSubscription();
    }
    setIsLoading(false);
    return success;
  };

  return {
    isPremium,
    currentPlan,
    purchaseMonthly,
    purchaseAnnual,
    purchaseLifetime,
    restorePurchases,
    isLoading,
  };
}
