import type { PaymentStatus } from "@/lib/types";

export const PAYMENT_METHOD_BALANCE = "So du khach hang";

export type PendingPaymentLine = {
  clientId: string;
  paidAmount: number;
  method: string;
};

export type PaymentPreviewRow = PendingPaymentLine & {
  isBalance?: boolean;
  note?: string;
};

const STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: "Chưa thanh toán",
  partial: "Thanh toán một phần",
  paid: "Đã thanh toán",
};

function payTowardDebts(
  amount: number,
  currentRemaining: number,
  otherDebt: number,
  priorityCurrentFirst: boolean,
): {
  currentRemaining: number;
  otherDebt: number;
  excess: number;
  paid: number;
  paidToCurrent: number;
  paidToOther: number;
} {
  let left = amount;
  let paidToCurrent = 0;
  let paidToOther = 0;

  const payCurrent = () => {
    const chunk = Math.min(left, currentRemaining);
    currentRemaining -= chunk;
    left -= chunk;
    paidToCurrent += chunk;
  };

  const payOther = () => {
    const chunk = Math.min(left, otherDebt);
    otherDebt -= chunk;
    left -= chunk;
    paidToOther += chunk;
  };

  if (priorityCurrentFirst) {
    payCurrent();
    payOther();
  } else {
    payOther();
    payCurrent();
  }

  return {
    currentRemaining,
    otherDebt,
    excess: left,
    paid: paidToCurrent + paidToOther,
    paidToCurrent,
    paidToOther,
  };
}

export function computePaymentPreview(
  invoiceTotal: number,
  customerBalance: number,
  customerDebtOtherOrders: number,
  pendingLines: PendingPaymentLine[],
  useBalanceOnComplete: boolean,
): {
  paidTotal: number;
  remaining: number;
  projectedCustomerBalance: number;
  projectedCustomerTotalDebt: number;
  paymentStatus: PaymentStatus;
  paymentStatusLabel: string;
  displayRows: PaymentPreviewRow[];
} {
  let paid = 0;
  let balance = customerBalance;
  let currentRemaining = invoiceTotal;
  let otherDebt = customerDebtOtherOrders;
  const displayRows: PaymentPreviewRow[] = [];

  if (useBalanceOnComplete && balance > 0) {
    const fromBalance = payTowardDebts(
      balance,
      currentRemaining,
      otherDebt,
      false,
    );
    balance = fromBalance.excess;
    currentRemaining = fromBalance.currentRemaining;
    otherDebt = fromBalance.otherDebt;
    paid += fromBalance.paid;

    if (fromBalance.paidToOther > 0) {
      displayRows.push({
        clientId: "__balance_other__",
        paidAmount: fromBalance.paidToOther,
        method: PAYMENT_METHOD_BALANCE,
        isBalance: true,
        note: "Trừ nợ đơn khác",
      });
    }
    if (fromBalance.paidToCurrent > 0) {
      displayRows.push({
        clientId: "__balance__",
        paidAmount: fromBalance.paidToCurrent,
        method: PAYMENT_METHOD_BALANCE,
        isBalance: true,
        note: "Trừ nợ đơn này",
      });
    }
  }

  for (const line of pendingLines) {
    const cash = payTowardDebts(
      line.paidAmount,
      currentRemaining,
      otherDebt,
      true,
    );
    currentRemaining = cash.currentRemaining;
    otherDebt = cash.otherDebt;
    paid += cash.paid;
    balance += cash.excess;

    if (cash.paidToOther > 0) {
      displayRows.push({
        clientId: `${line.clientId}_other`,
        paidAmount: cash.paidToOther,
        method: line.method,
        note: "Trừ nợ đơn khác",
      });
    }
    if (cash.paidToCurrent > 0) {
      displayRows.push({
        ...line,
        paidAmount: cash.paidToCurrent,
        note: cash.paidToOther > 0 ? "Trừ nợ đơn này" : undefined,
      });
    }
    if (cash.excess > 0) {
      displayRows.push({
        clientId: `${line.clientId}_excess`,
        paidAmount: cash.excess,
        method: line.method,
        note: "Cộng số dư",
      });
    }
  }

  let paymentStatus: PaymentStatus = "unpaid";
  if (paid <= 0) paymentStatus = "unpaid";
  else if (currentRemaining <= 0) paymentStatus = "paid";
  else paymentStatus = "partial";

  return {
    paidTotal: paid,
    remaining: currentRemaining,
    projectedCustomerBalance: balance,
    projectedCustomerTotalDebt: otherDebt + currentRemaining,
    paymentStatus,
    paymentStatusLabel: STATUS_LABELS[paymentStatus],
    displayRows,
  };
}
