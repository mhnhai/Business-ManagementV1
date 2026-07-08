export const OrderStatusCodes = {
  DRAFT: 'draft',
  CONFIRMED: 'confirmed',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
} as const;

export type OrderStatusCode =
  (typeof OrderStatusCodes)[keyof typeof OrderStatusCodes];

export function isOrderEditable(status: string) {
  return status === OrderStatusCodes.DRAFT;
}
