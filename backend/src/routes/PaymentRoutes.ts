import { isNumber } from 'jet-validators';
import { transform } from 'jet-validators/utils';

import HttpStatusCodes from '@src/common/constants/HttpStatusCodes';
import Payment, { type IPaymentRecordInput } from '@src/models/Payment.model';
import PaymentService from '@src/services/PaymentService';
import { RouteError } from '@src/common/utils/route-errors';

import { Req, Res } from './common/express-types';
import parseReq from './common/parseReq';

const reqValidators = {
  activityId: parseReq({ activityId: transform(Number, isNumber) }),
  paymentId: parseReq({ paymentId: transform(Number, isNumber) }),
} as const;

function parseRecordBody(body: unknown): IPaymentRecordInput {
  const wrapped =
    typeof body === 'object' && body !== null && 'payment' in body
      ? (body as { payment: IPaymentRecordInput }).payment
      : (body as IPaymentRecordInput);
  if (!Payment.isCompleteRecordInput(wrapped)) {
    throw new RouteError(HttpStatusCodes.BAD_REQUEST, 'Invalid payment payload');
  }
  return wrapped;
}

async function getSummary(req: Req, res: Res) {
  const { activityId } = reqValidators.activityId(req.params);
  const summary = await PaymentService.getSummary(activityId);
  res.status(HttpStatusCodes.OK).json({ summary });
}

async function listByActivity(req: Req, res: Res) {
  const { activityId } = reqValidators.activityId(req.params);
  const payments = await PaymentService.getByActivity(activityId);
  res.status(HttpStatusCodes.OK).json({ payments });
}

async function applyBalance(req: Req, res: Res) {
  const { activityId } = reqValidators.activityId(req.params);
  const result = await PaymentService.applyCustomerBalance(activityId);
  res.status(HttpStatusCodes.OK).json(result);
}

async function record(req: Req, res: Res) {
  const activityId = Number(req.params.activityId);
  const payment = parseRecordBody(req.body);
  const result = await PaymentService.recordPayment(activityId, {
    paidAmount: payment.paidAmount,
    method: payment.method,
    applyCustomerBalance: payment.applyCustomerBalance,
    paymentDate: payment.paymentDate ? new Date(payment.paymentDate) : undefined,
  });
  res.status(HttpStatusCodes.CREATED).json(result);
}

async function delete_(req: Req, res: Res) {
  const { paymentId } = reqValidators.paymentId(req.params);
  await PaymentService.delete(paymentId);
  res.status(HttpStatusCodes.OK).end();
}

export default {
  getSummary,
  listByActivity,
  applyBalance,
  record,
  delete: delete_,
} as const;
