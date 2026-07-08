import { Prisma } from '@prisma/client';

import HttpStatusCodes from '@src/common/constants/HttpStatusCodes';
import {
  PaymentStatusLabels,
  PaymentStatuses,
} from '@src/common/constants/payment-status';
import { CustomerErrors as Errors } from '@src/common/constants/service-errors';
import { RouteError } from '@src/common/utils/route-errors';
import type {
  ICustomerAccount,
  ICustomerOrderRow,
  ICustomerReceivePaymentInput,
  ICustomerReceivePaymentResult,
} from '@src/models/CustomerAccount.model';
import { ICustomer, ICustomerUpdate, ICustomerWrite } from '@src/models/Customer.model';
import ActivityRepo from '@src/repos/ActivityRepo';
import CustomerRepo from '@src/repos/CustomerRepo';
import LocationRepo from '@src/repos/LocationRepo';
import prisma from '@src/repos/common/prisma';
import {
  allocateCustomerPayment,
  resolvePaymentStatus,
  sumPayments,
} from '@src/services/PaymentService';
import { computeCustomerTotalDebt } from '@src/services/customer-debt';
import type { EmployeeDataScope } from '@src/services/employee-scope';
import {
  assertCustomerInScope,
} from '@src/services/employee-scope';

async function assertLocationExists(locationId: number) {
  const exists = await LocationRepo.persists(locationId);
  if (!exists) {
    throw new RouteError(HttpStatusCodes.BAD_REQUEST, Errors.LOCATION_NOT_FOUND);
  }
}

async function getAll(scope: EmployeeDataScope) {
  if (scope.mode === 'all') {
    return CustomerRepo.getAll();
  }
  return CustomerRepo.getAll(scope.locationIds);
}

async function getPendingApproval() {
  return CustomerRepo.getPendingApproval();
}

async function getOne(id: number, scope: EmployeeDataScope) {
  if (scope.mode === 'employee') {
    const customer = await CustomerRepo.getOneInTerritory(
      id,
      scope.locationIds,
    );
    if (!customer) {
      throw new RouteError(HttpStatusCodes.NOT_FOUND, Errors.CUSTOMER_NOT_FOUND);
    }
    return customer;
  }

  const customer = await CustomerRepo.getOne(id);
  if (!customer) {
    throw new RouteError(HttpStatusCodes.NOT_FOUND, Errors.CUSTOMER_NOT_FOUND);
  }
  return customer;
}

async function addOne(customer: ICustomerWrite, scope: EmployeeDataScope) {
  await assertLocationExists(customer.locationId);
  assertCustomerInScope(scope, customer.locationId);
  return CustomerRepo.add(customer);
}

async function updateOne(customer: ICustomerUpdate, scope: EmployeeDataScope) {
  await getOne(customer.id, scope);
  await assertLocationExists(customer.locationId);
  assertCustomerInScope(scope, customer.locationId);
  return CustomerRepo.update(customer);
}

async function approveCustomer(id: number): Promise<ICustomer> {
  const customer = await CustomerRepo.getOne(id);
  if (!customer) {
    throw new RouteError(HttpStatusCodes.NOT_FOUND, Errors.CUSTOMER_NOT_FOUND);
  }

  customer.isApproved = true;
  customer.approvedAt = new Date();

  return CustomerRepo.update(customer);
}

async function deleteOne(id: number, scope: EmployeeDataScope): Promise<void> {
  await getOne(id, scope);

  const activityCount = await ActivityRepo.countByCustomer(id);
  if (activityCount > 0) {
    throw new RouteError(
      HttpStatusCodes.BAD_REQUEST,
      Errors.CUSTOMER_HAS_ACTIVITIES,
    );
  }

  return CustomerRepo.delete(id);
}

type DbClient = Prisma.TransactionClient | typeof prisma;

async function buildOrderRows(
  customerId: number,
  db: DbClient = prisma,
): Promise<ICustomerOrderRow[]> {
  const activities = await db.activity.findMany({
    where: {
      customer_id: customerId,
      invoice_id: { not: null },
    },
    include: { invoice: true },
    orderBy: [{ created_at: 'asc' }, { activity_id: 'asc' }],
  });

  const orders: ICustomerOrderRow[] = [];
  for (const act of activities) {
    const invoiceTotal = Number(act.invoice?.total_amount ?? 0);
    const paidTotal = await sumPayments(act.activity_id, db);
    const remaining = Math.max(0, invoiceTotal - paidTotal);
    const paymentStatus = resolvePaymentStatus(paidTotal, invoiceTotal);

    orders.push({
      activityId: act.activity_id,
      activityDate: act.activity_date,
      createdAt: act.created_at,
      status: act.status,
      paymentStatus,
      paymentStatusLabel: PaymentStatusLabels[paymentStatus],
      invoiceTotal,
      paidTotal,
      remaining,
    });
  }
  return orders;
}

async function getAccount(
  customerId: number,
  scope: EmployeeDataScope,
): Promise<ICustomerAccount> {
  const customer = await getOne(customerId, scope);
  const orders = await buildOrderRows(customerId);
  const totalDebt = await computeCustomerTotalDebt(customerId);

  return {
    customer,
    currentBalance: customer.currentBalance,
    totalDebt,
    orders,
  };
}

async function receivePayment(
  customerId: number,
  input: ICustomerReceivePaymentInput,
  scope: EmployeeDataScope,
): Promise<ICustomerReceivePaymentResult> {
  if (input.amount <= 0) {
    throw new RouteError(HttpStatusCodes.BAD_REQUEST, Errors.INVALID_AMOUNT);
  }
  if (!input.method?.trim()) {
    throw new RouteError(HttpStatusCodes.BAD_REQUEST, Errors.INVALID_METHOD);
  }

  await getOne(customerId, scope);

  return prisma.$transaction(async (tx) => {
    const { allocations, excessToBalance } = await allocateCustomerPayment(
      customerId,
      input.amount,
      input.method.trim(),
      tx,
    );

    const customer = await CustomerRepo.getOne(customerId);
    if (!customer) {
      throw new RouteError(HttpStatusCodes.NOT_FOUND, Errors.CUSTOMER_NOT_FOUND);
    }

    const orders = await buildOrderRows(customerId, tx);
    const totalDebt = await computeCustomerTotalDebt(customerId, tx);

    return {
      allocations,
      excessToBalance,
      account: {
        customer,
        currentBalance: customer.currentBalance,
        totalDebt,
        orders,
      },
    };
  });
}

/******************************************************************************
                                Export default
******************************************************************************/

export default {
  Errors,
  getAll,
  getPendingApproval, 
  getOne,
  addOne,
  updateOne,
  approveCustomer, 
  delete: deleteOne,
  getAccount,
  receivePayment,
} as const;