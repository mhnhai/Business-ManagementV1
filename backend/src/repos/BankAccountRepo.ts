import bankAccountModel, { IBankAccount, IBankAccountCreate } from '@src/models/BankAccount.model';
import prisma from './prisma';

async function getAll(): Promise<IBankAccount[]> {
  const rows = await prisma.bankAccount.findMany();
  return rows.map(row => bankAccountModel.mapRow(row));
}

async function getByUserId(userId: number): Promise<IBankAccount | null> {
  const row = await prisma.bankAccount.findUnique({
    where: { user_id: userId },
  });
  return row ? bankAccountModel.mapRow(row) : null;
}

async function add(payload: IBankAccountCreate): Promise<IBankAccount> {
  const row = await prisma.bankAccount.create({
    data: {
      user_id: payload.userId,
      bank_name: payload.bankName,
      account_number: payload.accountNumber,
    },
  });
  return bankAccountModel.mapRow(row);
}

async function upsert(userId: number, bankAccount: Partial<IBankAccount>): Promise<IBankAccount> {
  const existing = await prisma.bankAccount.findUnique({
    where: { user_id: userId },
  });

  const row = await prisma.bankAccount.upsert({
    where: { user_id: userId },
    create: {
      user_id: userId,
      bank_name: bankAccount.bankName ?? '',
      account_number: bankAccount.accountNumber ?? '',
    },
    update: {
      bank_name: bankAccount.bankName !== undefined ? bankAccount.bankName : existing?.bank_name,
      account_number: bankAccount.accountNumber !== undefined ? bankAccount.accountNumber : existing?.account_number,
    },
  });
  return bankAccountModel.mapRow(row);
}

async function deleteByUserId(userId: number): Promise<void> {
  await prisma.bankAccount.delete({
    where: { user_id: userId },
  });
}

export default {
  getAll, 
  getByUserId,
  add,
  upsert,
  deleteByUserId,
} as const;