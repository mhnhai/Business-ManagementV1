export const PaymentStatuses = {
  UNPAID: 'unpaid',
  PARTIAL: 'partial',
  PAID: 'paid',
} as const;

export type PaymentStatusCode =
  (typeof PaymentStatuses)[keyof typeof PaymentStatuses];

export const PaymentStatusLabels: Record<PaymentStatusCode, string> = {
  unpaid: 'Chưa thanh toán',
  partial: 'Thanh toán một phần',
  paid: 'Đã thanh toán',
};

/** Thanh toán bằng số dư tài khoản khách hàng */
export const PAYMENT_METHOD_CUSTOMER_BALANCE = 'So du khach hang';
