// RevenueCat deshabilitado — app exclusiva para clientes Polaris y Growth Players.
export const checkSubscription = async () => ({ isActive: true, productId: null })
export const purchaseProduct = async (_productId?: string) => {
  console.warn('Purchases disabled — exclusive program access')
}
export const revenueCatService = {
  init: async () => {},
  getOfferings: async () => [],
  purchasePackage: async (_packageId: string) => true,
  restorePurchases: async () => true,
  checkEntitlement: async (_entitlementId: string) => true,
  getCustomerInfo: async () => null,
}
