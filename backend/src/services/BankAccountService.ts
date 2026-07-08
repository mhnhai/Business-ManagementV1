import HttpStatusCodes from "@src/common/constants/HttpStatusCodes";
import { BankAccountErrors } from "@src/common/constants/service-errors";
import { logger } from "@src/common/utils/logger";
import { RouteError } from "@src/common/utils/route-errors";
import { IBankAccount, IBankAccountCreate } from "@src/models/BankAccount.model";
import BankAccountRepo from "@src/repos/BankAccountRepo";

/******************************************************************************
                                   Functions
******************************************************************************/

async function getAll(): Promise<IBankAccount[]> {
  return BankAccountRepo.getAll();
}

async function getByUserId(userId: number): Promise<IBankAccount | null> {
  return BankAccountRepo.getByUserId(userId);
}

async function addOne(payload: IBankAccountCreate): Promise<IBankAccount> {
  try {
    const createdBank = await BankAccountRepo.add(payload);
    logger.info('SYSTEM', `Thêm mới tài khoản ngân hàng thành công cho User ID: ${createdBank.userId}.`);
    return createdBank;
  } catch (error) {
    logger.error('SYSTEM', `Lỗi khi cố gắng thêm tài khoản ngân hàng cho User ID [${payload.userId}]: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

async function upsertOne(userId: number, bankAccount: Partial<IBankAccount>): Promise<IBankAccount> {
  try {
    const updatedBank = await BankAccountRepo.upsert(userId, bankAccount);
    logger.info('SYSTEM', `Cập nhật/Cài đặt thành công tài khoản ngân hàng cho User ID: ${userId}.`);
    return updatedBank;
  } catch (error) {
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      logger.warn('SYSTEM', `Cập nhật tài khoản ngân hàng thất bại: Người dùng có ID [${userId}] không tồn tại.`);
      throw new RouteError(HttpStatusCodes.NOT_FOUND, BankAccountErrors.BANK_ACCOUNT_NOT_FOUND);
    }

    if (!(error instanceof RouteError)) {
      logger.error('SYSTEM', `Lỗi hệ thống khi thiết lập tài khoản ngân hàng cho User ID [${userId}]: ${error instanceof Error ? error.message : String(error)}`);
    }
    throw error;
  }
}

async function deleteByUserId(userId: number): Promise<void> {
  try {
    await BankAccountRepo.deleteByUserId(userId);
    logger.info('SYSTEM', `Xóa tài khoản ngân hàng thành công của User ID: ${userId}.`);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
      logger.warn('SYSTEM', `Xóa tài khoản ngân hàng thất bại: Không tìm thấy tài khoản ngân hàng liên kết với User ID [${userId}].`);
      throw new RouteError(HttpStatusCodes.NOT_FOUND, BankAccountErrors.BANK_ACCOUNT_NOT_FOUND);
    }

    if (!(error instanceof RouteError)) {
      logger.error('SYSTEM', `Lỗi hệ thống khi xóa tài khoản ngân hàng của User ID [${userId}]: ${error instanceof Error ? error.message : String(error)}`);
    }
    throw error;
  }
}

/******************************************************************************
                               Export default
******************************************************************************/

export default {
  getAll,
  getByUserId,
  addOne,
  upsertOne,
  deleteByUserId,
} as const;