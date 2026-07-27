import type { OrderStatus } from '@/api/generated/qASAAPIDocumentation.schemas'

/** Mirrors `OrderStatus::isEditable()` (qasa-backend-oss: app/Modules/Orders/Domain/Enums/OrderStatus.php). */
export function isOrderEditable(status: OrderStatus): boolean {
  return status === 'active' || status === 'paused'
}
