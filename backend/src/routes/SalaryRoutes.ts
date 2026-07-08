import { isNumber, isUnsignedInteger } from 'jet-validators';
import { transform } from 'jet-validators/utils';

import HttpStatusCodes from '@src/common/constants/HttpStatusCodes';
import Salary from '@src/models/Salary.model';

import { Req, Res } from './common/express-types';
import parseReq from './common/parseReq';
import SalaryService from '@src/services/SalaryService';

/******************************************************************************
                                   Constants
******************************************************************************/

const reqValidators = {
  id: parseReq({ id: transform(Number, isNumber) }),
  byUser: parseReq({ userId: transform(Number, isNumber) }),
  add: parseReq({ salary: Salary.isComplete }),
  update: parseReq({ salary: Salary.isComplete }),
  calculate: parseReq({
    month: transform(Number, isUnsignedInteger),
    year: transform(Number, isUnsignedInteger),
    commissionRate: transform(Number, isNumber),
  }),
} as const;

/******************************************************************************
                                   Functions
******************************************************************************/

/**
 * Get all salary records (Admin only).
 * @route GET /api/salaries/all
 */
async function getAll(_: Req, res: Res) {
  const salaries = await SalaryService.getAll();
  res.status(HttpStatusCodes.OK).json({ salaries });
}

/**
 * Get all salary records for a specific user.
 * @route GET /api/salaries/user/:userId
 */
async function getByUserId(req: Req, res: Res) {
  const { userId } = reqValidators.byUser(req.params);
  const salaries = await SalaryService.getByUserId(userId);
  res.status(HttpStatusCodes.OK).json({ salaries });
}

/**
 * Get one salary record by its ID.
 * @route GET /api/salaries/:id
 */
async function getOne(req: Req, res: Res) {
  const { id } = reqValidators.id(req.params);
  const salary = await SalaryService.getOne(id);
  res.status(HttpStatusCodes.OK).json({ salary });
}

/**
 * Add one salary record.
 * @route POST /api/salaries/add
 */
async function add(req: Req, res: Res) {
  const { salary } = reqValidators.add(req.body);
  const created = await SalaryService.addOne(salary);
  res.status(HttpStatusCodes.CREATED).json({ salary: created });
}

/**
 * Update one salary record.
 * @route PUT /api/salaries/update
 */
async function update(req: Req, res: Res) {
  const { salary } = reqValidators.update(req.body);
  const updated = await SalaryService.updateOne(salary);
  res.status(HttpStatusCodes.OK).json({ salary: updated });
}

/**
 * Delete one salary record.
 * @route DELETE /api/salaries/delete/:id
 */
async function delete_(req: Req, res: Res) {
  const { id } = reqValidators.id(req.params);
  await SalaryService.delete(id);
  res.status(HttpStatusCodes.OK).end();
}

/**
 * Automatically calculate and upsert payroll for all active users.
 * @route POST /api/salaries/calculate
 */
async function calculatePayroll(req: Req, res: Res) {
  // Validate request body parameters (e.g., { month: 6, year: 2026, commissionRate: 0.05 })
  const { month, year, commissionRate } = reqValidators.calculate(req.body);
  
  await SalaryService.calculateAutomatedPayroll(month, year, commissionRate);
  
  res.status(HttpStatusCodes.OK).json({ 
    message: `Automated payroll for ${month}/${year} completed successfully.` 
  });
}

/******************************************************************************
                                 Export default
******************************************************************************/

export default {
  getAll,
  getByUserId,
  getOne,
  add,
  update,
  delete: delete_,
  calculatePayroll
} as const;