/**
 * La app no vende nada (decisión del dueño, 2026-11-09): el coaching se contrata
 * por fuera, con contrato. La ruta se conserva solo para no romper enlaces
 * viejos y lleva a "Tu acceso" (canje de código).
 */
import { Redirect } from 'expo-router';

export default function PaywallScreen() {
  return <Redirect href="/pricing" />;
}
