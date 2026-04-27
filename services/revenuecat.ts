// ─── RevenueCat Service ───────────────────────────────────────────────────────
// Envuelve react-native-purchases con un API limpia y segura.
// En web, todas las funciones son no-ops (RevenueCat no soporta web).

import { Platform } from 'react-native';
import { ENV } from '@/app/config/env';

// ─── Tipos mínimos para evitar importar todo el SDK ──────────────────────────

type CustomerInfo = {
  entitlements: { active: Record<string, unknown> };
};

type PurchasesPackage = {
  packageType: string;
  product: { priceString: string; title: string };
};

type PurchasesOfferings = {
  current: {
    availablePackages: PurchasesPackage[];
  } | null;
};

// ─── Lazy import para evitar crash en web ────────────────────────────────────

async function getPurchases() {
  if (Platform.OS === 'web') return null;
  try {
    const mod = await import('react-native-purchases');
    return mod.default;
  } catch {
    return null;
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────

export async function initRevenueCat(): Promise<void> {
  if (!ENV.revenueCatApiKey || Platform.OS === 'web') return;
  try {
    const Purchases = await getPurchases();
    if (!Purchases) return;
    Purchases.configure({ apiKey: ENV.revenueCatApiKey });
  } catch (err) {
    console.warn('[RevenueCat] init error:', err);
  }
}

// ─── Offerings ───────────────────────────────────────────────────────────────

export async function getOfferings(): Promise<PurchasesOfferings | null> {
  try {
    const Purchases = await getPurchases();
    if (!Purchases) return null;
    return (await Purchases.getOfferings()) as PurchasesOfferings;
  } catch {
    return null;
  }
}

// ─── Purchase ────────────────────────────────────────────────────────────────

export async function purchasePackage(pkg: PurchasesPackage): Promise<CustomerInfo | null> {
  try {
    const Purchases = await getPurchases();
    if (!Purchases) return null;
    const { customerInfo } = await (Purchases as any).purchasePackage(pkg);
    return customerInfo as CustomerInfo;
  } catch (err: any) {
    // userCancelled no es un error real
    if (err?.userCancelled) return null;
    throw err;
  }
}

// ─── Restore ─────────────────────────────────────────────────────────────────

export async function restorePurchases(): Promise<CustomerInfo | null> {
  try {
    const Purchases = await getPurchases();
    if (!Purchases) return null;
    return (await Purchases.restorePurchases()) as CustomerInfo;
  } catch {
    return null;
  }
}

// ─── Check subscription ───────────────────────────────────────────────────────

export async function checkSubscription(): Promise<boolean> {
  try {
    const Purchases = await getPurchases();
    if (!Purchases) return false;
    const info = (await Purchases.getCustomerInfo()) as CustomerInfo;
    return Object.keys(info.entitlements.active).length > 0;
  } catch {
    return false;
  }
}
