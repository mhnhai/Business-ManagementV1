import { ISalary, ISalaryWithUser } from '@src/models/Salary.model';
import prisma from './prisma';

/**
 * Get all salary records with user information. Used by Admin/Accountant.
 */
async function getAll(): Promise<ISalaryWithUser[]> {
  const rows = await prisma.salary.findMany({
    include: {
      user: {
        include: {
          bank_account: true, 
        }
      },
    },
    orderBy: [
      { year: 'desc' },
      { month: 'desc' },
    ],
  });

  return rows.map(row => ({
    id: row.salary_id,
    userId: row.user_id,
    month: row.month,
    year: row.year,
    baseSalary: Number(row.base_salary),
    commission: Number(row.commission),
    bonus: Number(row.bonus),
    isPaid: !!row.is_paid,
    createdAt: row.created_at,
    updatedAt: row.updated_at,

    user: row.user ? {
      username: row.user.username,
      fullName: row.user.full_name,
      department: row.user.department,
      email: row.user.email,
      phoneNumber: row.user.phone_number,
      role: row.user.role,
    } : null,
  }));
}

/**
 * Get a single salary record by its ID.
 */
async function getOne(salaryId: number): Promise<ISalary | null> {
  const row = await prisma.salary.findUnique({
    where: { salary_id: salaryId },
  });
  if (!row) return null;
  return {
    id: row.salary_id,
    userId: row.user_id,
    month: row.month,
    year: row.year,
    baseSalary: Number(row.base_salary),
    commission: Number(row.commission),
    bonus: Number(row.bonus),
    isPaid: !!row.is_paid,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Check if a salary record exists.
 */
async function persists(salaryId: number): Promise<boolean> {
  const count = await prisma.salary.count({
    where: { salary_id: salaryId },
  });
  return count > 0;
}

/**
 * Get the payroll history for a specific user.
 */
async function getByUserId(userId: number): Promise<ISalary[]> {
  const rows = await prisma.salary.findMany({
    where: { user_id: userId },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  });
  return rows.map(row => ({
    id: row.salary_id,
    userId: row.user_id,
    month: row.month,
    year: row.year,
    baseSalary: Number(row.base_salary),
    commission: Number(row.commission),
    bonus: Number(row.bonus),
    isPaid: !!row.is_paid,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

/**
 * Create a new salary record manually.
 */
async function add(salary: ISalary & { isPaid?: boolean }): Promise<ISalary> {
  const row = await prisma.salary.create({
    data: {
      user_id: salary.userId,
      month: salary.month,
      year: salary.year,
      base_salary: salary.baseSalary,
      commission: salary.commission,
      bonus: salary.bonus,
      is_paid: salary.isPaid ?? false,
    },
  });
  return {
    id: row.salary_id,
    userId: row.user_id,
    month: row.month,
    year: row.year,
    baseSalary: Number(row.base_salary),
    commission: Number(row.commission),
    bonus: Number(row.bonus),
    isPaid: !!row.is_paid,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Update payroll information or payment status.
 */
async function update(salary: ISalary & { isPaid?: boolean }): Promise<ISalary> {
  const row = await prisma.salary.update({
    where: { salary_id: salary.id },
    data: {
      month: salary.month,
      year: salary.year,
      base_salary: salary.baseSalary,
      commission: salary.commission,
      bonus: salary.bonus,
      is_paid: salary.isPaid,
      updated_at: new Date(),
    },
  });
  return {
    id: row.salary_id,
    userId: row.user_id,
    month: row.month,
    year: row.year,
    baseSalary: Number(row.base_salary),
    commission: Number(row.commission),
    bonus: Number(row.bonus),
    isPaid: !!row.is_paid,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Delete a salary record.
 */
async function delete_(salaryId: number): Promise<void> {
  await prisma.salary.delete({
    where: { salary_id: salaryId },
  });
}

/**
 * Automatically calculates and upserts the payroll for all active users in a specific month and year.
 * @param month The payroll month (1 - 12)
 * @param year The payroll year
 * @param commissionRate The default commission percentage (e.g., 0.05 for 5%)
 */
async function calculateAutomatedPayroll(
  month: number,
  year: number,
  commissionRate: number = 0.05
): Promise<void> {
  const activeUsers = await prisma.user.findMany({
    where: { is_activated: true, deleted_at: null },
  });

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);

  await Promise.all(
    activeUsers.map(async (user) => {
      
      // 1. Base Salary: Fallback to the latest month's salary or default to 5,000,000 VND
      const lastSalaryRecord = await prisma.salary.findFirst({
        where: { user_id: user.user_id },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
      });
      const baseSalary = lastSalaryRecord ? Number(lastSalaryRecord.base_salary) : 5000000;

      // 2. Commission: Based on total collected payments within the month
      const paymentsInMonth = await prisma.payment.findMany({
        where: {
          activity: { user_id: user.user_id },
          payment_date: { gte: startDate, lt: endDate },
        },
        select: { paid_amount: true },
      });

      const totalCollected = paymentsInMonth.reduce((sum, p) => sum + Number(p.paid_amount), 0);
      const commission = totalCollected * commissionRate;

      // 3. KPI Bonus: 100k per approved customer + 1M bonus if total collected >= 50M
      const newApprovedCustomersCount = await prisma.customer.count({
        where: {
          activities: {
            some: { user_id: user.user_id },
          },
          is_approved: true,
          approved_at: { gte: startDate, lt: endDate },
        },
      });

      let bonus = newApprovedCustomersCount * 100000;
      if (totalCollected >= 50000000) {
        bonus += 1000000;
      }
      
      const existingSalary = await prisma.salary.findFirst({
        where: {
          user_id: user.user_id,
          month: month,
          year: year,
        },
      });

      if (existingSalary) {
        await prisma.salary.update({
          where: { salary_id: existingSalary.salary_id },
          data: {
            base_salary: baseSalary,
            commission: commission,
            bonus: bonus,
            is_paid: existingSalary.is_paid 
          },
        });
      } else {
        await prisma.salary.create({
          data: {
            user_id: user.user_id,
            month: month,
            year: year,
            base_salary: baseSalary,
            commission: commission,
            bonus: bonus,
            is_paid: false,
          },
        });
      }
    })
  );
}

async function deleteAll(): Promise<void> {
  await prisma.salary.deleteMany();
}

export default {
  getAll,
  getOne,
  persists,
  getByUserId,
  add,
  update,
  delete: delete_,
  deleteAll,
  calculateAutomatedPayroll
} as const;