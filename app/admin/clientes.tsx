/**
 * Clientes — la lista completa (con búsqueda) de la vista simple de mentorías.
 * Quien tiene el panel completo usa /admin/usuarios; el resto, esto.
 */
import { MentorBoard } from '@/components/mentor-board';

export default function ClientesScreen() {
  return <MentorBoard view="clients" />;
}
