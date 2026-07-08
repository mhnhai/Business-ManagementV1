import HttpStatusCodes from '@src/common/constants/HttpStatusCodes';
import { RouteError } from '@src/common/utils/route-errors';
import SalaryModel, { ISalary, ISalaryWithUser } from '@src/models/Salary.model';
import SalaryRepo from '@src/repos/SalaryRepo';
import UserRepo from '@src/repos/UserRepo';
import BankAccountRepo from '@src/repos/BankAccountRepo';

/******************************************************************************
                                   Functions
******************************************************************************/

async function getAll(): Promise<ISalaryWithUser[]> {
  const [salaries, users, bankAccounts] = await Promise.all([
    SalaryRepo.getAll(),
    UserRepo.getAll(),
    BankAccountRepo.getAll(), 
  ]);

  return salaries.map(salary => {
    const user = users.find(u => u.id === salary.userId);
    
    const bankAccount = user ? bankAccounts.find(b => b.userId === user.id) : null;

    return {
      ...salary,
      user: user ? {
        username: user.username,
        fullName: user.fullName,
        department: user.department,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        bankAccount: bankAccount ? {
          bankName: bankAccount.bankName,
          accountNumber: bankAccount.accountNumber,
        } : null,
      } : null,
    };
  });
}

function getByUserId(userId: number): Promise<ISalary[]> {
  return SalaryRepo.getByUserId(userId);
}

async function getOne(id: number): Promise<ISalary> {
  const salary = await SalaryRepo.getOne(id);
  if (!salary) {
    throw new RouteError(HttpStatusCodes.NOT_FOUND, 'Salary record not found');
  }
  return salary;
}

function addOne(salary: ISalary): Promise<ISalary> {
  return SalaryRepo.add(salary);
}

async function updateOne(salary: ISalary): Promise<ISalary> {
  const persists = await SalaryRepo.persists(salary.id);
  if (!persists) {
    throw new RouteError(HttpStatusCodes.NOT_FOUND, 'Salary record not found');
  }
  return SalaryRepo.update(salary);
}

async function deleteOne(id: number): Promise<void> {
  const exists = await SalaryRepo.persists(id);
  if (!exists) {
    throw new RouteError(HttpStatusCodes.NOT_FOUND, 'Salary record not found');
  }
  return SalaryRepo.delete(id);
}

function calculateAutomatedPayroll(
  month: number,
  year: number,
  commissionRate?: number
): Promise<void> {
  // Direct call to Repo logic layer
  return SalaryRepo.calculateAutomatedPayroll(month, year, commissionRate);
}

/******************************************************************************
                                 Export default
******************************************************************************/

export default {
  getAll,
  getByUserId,
  getOne,
  addOne,
  updateOne,
  delete: deleteOne,
  calculateAutomatedPayroll
} as const;