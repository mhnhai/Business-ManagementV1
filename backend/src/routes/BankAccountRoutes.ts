import { isNumber } from 'jet-validators';
import { transform } from 'jet-validators/utils';
import { NextFunction } from 'express';

import HttpStatusCodes from '@src/common/constants/HttpStatusCodes';
import { RouteError } from '@src/common/utils/route-errors';
import { Req, Res } from './common/express-types';
import parseReq from './common/parseReq';

import BankAccountService from '@src/services/BankAccountService';
import BankAccountModel, { IBankAccount } from '@src/models/BankAccount.model';

/******************************************************************************
                                   Constants
******************************************************************************/

const reqValidators = {
  getByUserId: parseReq({ userId: transform(Number, isNumber) }),
  delete: parseReq({ userId: transform(Number, isNumber) }),
} as const;

/******************************************************************************
                                   Functions
******************************************************************************/

/**
 * Lấy tất cả tài khoản ngân hàng hệ thống (Phục vụ kế toán/tính lương).
 * @route GET /api/bank-accounts/all
 */
async function getAll(_: Req, res: Res, next: NextFunction) {
  try {
    const bankAccounts = await BankAccountService.getAll();
    return res.status(HttpStatusCodes.OK).json({ bankAccounts });
  } catch (error) {
    return next(error);
  }
}

/**
 * Lấy thông tin tài khoản ngân hàng của một User cụ thể.
 * @route GET /api/bank-accounts/user/:userId
 */
async function getByUserId(req: Req, res: Res, next: NextFunction) {
  try {
    const { userId } = reqValidators.getByUserId(req.params);
    const bankAccount = await BankAccountService.getByUserId(userId);
    
    if (!bankAccount) {
      throw new RouteError(HttpStatusCodes.NOT_FOUND, 'Bank account not found for this user');
    }
    
    return res.status(HttpStatusCodes.OK).json({ bankAccount });
  } catch (error) {
    return next(error);
  }
}

/**
 * Thêm mới một tài khoản ngân hàng.
 * @route POST /api/bank-accounts/add
 */
async function add(req: Req, res: Res, next: NextFunction) {
  try {
    // Giả định BankAccountModel có schema validator tương tự như UserModel của bạn
    const validatedPayload = BankAccountModel.newCreate(req.body.bankAccount);
    const created = await BankAccountService.addOne(validatedPayload);
    return res.status(HttpStatusCodes.CREATED).json({ bankAccount: created });
  } catch (error) {
    return next(error);
  }
}

/**
 * Thêm hoặc cập nhật tài khoản ngân hàng (Upsert).
 * @route PUT /api/bank-accounts/upsert/:userId
 */
async function upsert(req: Req, res: Res, next: NextFunction) {
  try {
    const { userId } = reqValidators.getByUserId(req.params);
    const bankAccountData = req.body as Partial<IBankAccount>;
    
    const updated = await BankAccountService.upsertOne(userId, bankAccountData);
    return res.status(HttpStatusCodes.OK).json({ bankAccount: updated });
  } catch (error) {
    return next(error);
  }
}

/**
 * Xóa tài khoản ngân hàng của một User.
 * @route DELETE /api/bank-accounts/delete/:userId
 */
async function delete_(req: Req, res: Res, next: NextFunction) {
  try {
    const { userId } = reqValidators.delete(req.params);
    await BankAccountService.deleteByUserId(userId);
    return res.status(HttpStatusCodes.OK).end();
  } catch (error) {
    return next(error);
  }
}

/******************************************************************************
                               Export default
******************************************************************************/

export default {
  getAll,
  getByUserId,
  add,
  upsert,
  delete: delete_,
} as const;