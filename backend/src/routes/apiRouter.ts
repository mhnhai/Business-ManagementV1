import { Router } from 'express';

import Paths from '@src/common/constants/Paths';
import { Roles } from '@src/common/constants/roles';

import ActivityDetailRoutes from './ActivityDetailRoutes';
import ActivityRoutes from './ActivityRoutes';
import PaymentRoutes from './PaymentRoutes';
import OrderStatusRoutes from './OrderStatusRoutes';
import CustomerRoutes from './CustomerRoutes';
import InvoiceRoutes from './InvoiceRoutes';
import LocationRoutes from './LocationRoutes';
import ProductRoutes from './ProductRoutes';
import UserRoutes from './UserRoutes';
import AuthRoutes from './AuthRoutes';
import authMiddleware from '@src/middlewares/authMiddleware';
import SalaryRoutes from './SalaryRoutes';
import SupplierRoutes from './SupplierRoutes';
import ImportRoutes from './ImportRoutes';
import ImportDetailRoutes from './ImportDetailRoutes';
import EmployeeLocationRoutes from './EmployeeLocationRoutes';
import rateLimiters from '@src/middlewares/rateLimitMiddleware';
import BankAccountRoutes from './BankAccountRoutes';

/******************************************************************************
                                Setup
******************************************************************************/

const apiRouter = Router();

const auth = authMiddleware.auth;

const adminOnly = [auth, authMiddleware.authorize(Roles.ADMIN)];

const userRouter = Router();
userRouter.get(Paths.Users.Profile, rateLimiters.default, auth, UserRoutes.getProfile);
userRouter.get(Paths.Users.Get, rateLimiters.default, adminOnly, UserRoutes.getAll);
userRouter.get(Paths.Users.GetUnactivated, rateLimiters.default, adminOnly, UserRoutes.getAllUnactivated);
userRouter.get(Paths.Users.Search, rateLimiters.default, adminOnly, UserRoutes.search);
userRouter.post(Paths.Users.Add, rateLimiters.auth, adminOnly, UserRoutes.add);
userRouter.put(Paths.Users.Update, rateLimiters.auth, adminOnly, UserRoutes.update);
userRouter.delete(Paths.Users.Delete, rateLimiters.auth, adminOnly, UserRoutes.delete);
userRouter.get(Paths.Users.GetOne, rateLimiters.default, adminOnly, UserRoutes.getOne);

userRouter.get(Paths.Users.StatsOverview, rateLimiters.default, auth, UserRoutes.getOverviewStats);
userRouter.get(Paths.Users.StatsMonthly, rateLimiters.default, auth, UserRoutes.getMonthlyStats);
userRouter.get(Paths.Users.StatsLocations, rateLimiters.default, auth, UserRoutes.getLocationStats);
userRouter.get(Paths.Users.StatsTopProducts, rateLimiters.default, auth, UserRoutes.getTopProducts);
userRouter.get(Paths.Users.StatsStatusBreakdown, rateLimiters.default, auth, UserRoutes.getStatusBreakdown);
userRouter.get(Paths.Users.StatsRecentSales, rateLimiters.default, auth, UserRoutes.getRecentSalesTimeline);
userRouter.get(Paths.Users.StatsSellerOverview, rateLimiters.default, auth, UserRoutes.getSellerOverviewStats);
userRouter.get(Paths.Users.StatsSellerRevenueSeries, rateLimiters.default, auth, UserRoutes.getSellerRevenueSeries);
userRouter.get(Paths.Users.StatsSellerMonthly, rateLimiters.default, auth, UserRoutes.getSellerMonthlyStats);
userRouter.get(Paths.Users.StatsSellerTopDebtors, rateLimiters.default, auth, UserRoutes.getEmployeeTopDebtors);
userRouter.get(Paths.Users.StatsShipperOverview, rateLimiters.default, auth, UserRoutes.getShipperOverviewStats);
userRouter.get(Paths.Users.StatsShipperMonthly, rateLimiters.default, auth, UserRoutes.getShipperMonthlyStats);
userRouter.get(Paths.Users.StatsMap, rateLimiters.default, auth, UserRoutes.getMapStatus);

apiRouter.use(Paths.Users._, userRouter);

const salaryRouter = Router();
salaryRouter.get(Paths.Salaries.GetAll, SalaryRoutes.getAll);
salaryRouter.get(Paths.Salaries.GetByUserId, SalaryRoutes.getByUserId);
salaryRouter.get(Paths.Salaries.GetOne, SalaryRoutes.getOne);
salaryRouter.post(Paths.Salaries.Add, SalaryRoutes.add);
salaryRouter.put(Paths.Salaries.Update, SalaryRoutes.update);
salaryRouter.delete(Paths.Salaries.Delete, SalaryRoutes.delete);
salaryRouter.post(Paths.Salaries.Calculate, SalaryRoutes.calculatePayroll);
apiRouter.use(Paths.Salaries._, salaryRouter);

const supplierRouter = Router();
supplierRouter.use(rateLimiters.default);
supplierRouter.get(Paths.Suppliers.Get, auth, SupplierRoutes.getAll);
supplierRouter.get(Paths.Suppliers.GetOne, auth, SupplierRoutes.getOne);
supplierRouter.post(Paths.Suppliers.Add, ...adminOnly, SupplierRoutes.add);
supplierRouter.put(Paths.Suppliers.Update, ...adminOnly, SupplierRoutes.update);
supplierRouter.delete(Paths.Suppliers.Delete, ...adminOnly, SupplierRoutes.delete);
apiRouter.use(Paths.Suppliers._, supplierRouter);

const importRouter = Router();
importRouter.use(rateLimiters.default);
importRouter.get(Paths.Imports.Get, auth, ImportRoutes.getAll);
importRouter.get(Paths.Imports.Export, auth, ImportRoutes.exportExcel);
importRouter.get(Paths.Imports.GetOne, auth, ImportRoutes.getOne);
importRouter.post(Paths.Imports.Add, ...adminOnly, ImportRoutes.add);
importRouter.put(Paths.Imports.Update, ...adminOnly, ImportRoutes.update);
importRouter.delete(Paths.Imports.Delete, ...adminOnly, ImportRoutes.delete);
importRouter.get(Paths.Imports.DetailsGet, auth, ImportDetailRoutes.getByImport);
importRouter.post(Paths.Imports.DetailsAdd, ...adminOnly, ImportDetailRoutes.add);
importRouter.put(Paths.Imports.DetailsUpdate, ...adminOnly, ImportDetailRoutes.update);
importRouter.delete(Paths.Imports.DetailsDelete, ...adminOnly, ImportDetailRoutes.delete);
apiRouter.use(Paths.Imports._, importRouter);

const productRouter = Router();
productRouter.use(rateLimiters.default);
productRouter.get(Paths.Products.Get, auth, ProductRoutes.getAll);
productRouter.get(Paths.Products.GetOne, auth, ProductRoutes.getOne);
productRouter.post(Paths.Products.Add, ...adminOnly, ProductRoutes.add);
productRouter.put(Paths.Products.Update, ...adminOnly, ProductRoutes.update);
productRouter.delete(Paths.Products.Delete, ...adminOnly, ProductRoutes.delete);
apiRouter.use(Paths.Products._, productRouter);

const locationRouter = Router();
locationRouter.get(Paths.Locations.Get, auth, LocationRoutes.getAll);
locationRouter.get(Paths.Locations.GetOne, auth, LocationRoutes.getOne);
locationRouter.post(Paths.Locations.Add, ...adminOnly, LocationRoutes.add);
locationRouter.put(Paths.Locations.Update, ...adminOnly, LocationRoutes.update);
locationRouter.delete(Paths.Locations.Delete, ...adminOnly, LocationRoutes.delete);
locationRouter.post(Paths.Locations.SyncCanTho,  ...adminOnly, LocationRoutes.syncCanTho);
apiRouter.use(Paths.Locations._, locationRouter);

const employeeLocationRouter = Router();
employeeLocationRouter.get(Paths.EmployeeLocations.GetAll, auth, EmployeeLocationRoutes.getAll);
employeeLocationRouter.get(Paths.EmployeeLocations.GetAvailable, auth, EmployeeLocationRoutes.getAvailable);
employeeLocationRouter.get(Paths.EmployeeLocations.GetByUser, auth, EmployeeLocationRoutes.getByUserId);
employeeLocationRouter.put(Paths.EmployeeLocations.SetByUser, ...adminOnly, EmployeeLocationRoutes.setByUserId);
employeeLocationRouter.post(Paths.EmployeeLocations.Assign, ...adminOnly, EmployeeLocationRoutes.assign);
employeeLocationRouter.delete(Paths.EmployeeLocations.Unassign, ...adminOnly, EmployeeLocationRoutes.unassign);
apiRouter.use(Paths.EmployeeLocations._, employeeLocationRouter);

const customerRouter = Router();
customerRouter.get(Paths.Customers.Get, auth, CustomerRoutes.getAll);
customerRouter.get(Paths.Customers.GetPendingApproval, ...adminOnly, CustomerRoutes.getPendingApproval);
customerRouter.get(Paths.Customers.GetOne, auth, CustomerRoutes.getOne);
customerRouter.get(Paths.Customers.Account, auth, CustomerRoutes.getAccount);
customerRouter.post(Paths.Customers.ReceivePayment, ...adminOnly, CustomerRoutes.receivePayment);
customerRouter.post(Paths.Customers.Add, auth, CustomerRoutes.add);
customerRouter.put(Paths.Customers.Update, ...adminOnly, CustomerRoutes.update);
customerRouter.delete(Paths.Customers.Delete, ...adminOnly, CustomerRoutes.delete);
customerRouter.post(Paths.Customers.Approve, ...adminOnly, CustomerRoutes.approve);
apiRouter.use(Paths.Customers._, customerRouter);

const invoiceRouter = Router();
invoiceRouter.get(Paths.Invoices.Get, InvoiceRoutes.getAll);
invoiceRouter.get(Paths.Invoices.GetOne, InvoiceRoutes.getOne);
invoiceRouter.post(Paths.Invoices.Add, InvoiceRoutes.add);
invoiceRouter.put(Paths.Invoices.Update, InvoiceRoutes.update);
invoiceRouter.delete(Paths.Invoices.Delete, InvoiceRoutes.delete);
apiRouter.use(Paths.Invoices._, invoiceRouter);

const orderStatusRouter = Router();
orderStatusRouter.get(Paths.OrderStatuses.Get, auth, OrderStatusRoutes.getAll);
apiRouter.use(Paths.OrderStatuses._, orderStatusRouter);

const activityRouter = Router();
activityRouter.use(rateLimiters.default);
activityRouter.get(Paths.Activities.Get, auth, ActivityRoutes.getAll);
activityRouter.get(Paths.Activities.Export, auth, ActivityRoutes.exportExcel);
activityRouter.get(Paths.Activities.GetOne, auth, ActivityRoutes.getOne);
activityRouter.post(Paths.Activities.Add, auth, ActivityRoutes.add);
activityRouter.put(Paths.Activities.Update, auth, ActivityRoutes.update);
activityRouter.delete(Paths.Activities.Delete, ...adminOnly, ActivityRoutes.delete);
activityRouter.post(Paths.Activities.Confirm, ...adminOnly, ActivityRoutes.confirm);
activityRouter.post(Paths.Activities.AdvanceStatus, ...adminOnly, ActivityRoutes.advanceStatus);

activityRouter.get(Paths.Activities.DetailsGet, auth, ActivityDetailRoutes.getByActivity);
activityRouter.post(Paths.Activities.DetailsAdd, auth, ActivityDetailRoutes.add);
activityRouter.put(Paths.Activities.DetailsUpdate, auth, ActivityDetailRoutes.update);
activityRouter.delete(Paths.Activities.DetailsDelete, auth, ActivityDetailRoutes.delete);

activityRouter.get(Paths.Activities.PaymentSummary, ...adminOnly, PaymentRoutes.getSummary);
activityRouter.get(Paths.Activities.PaymentsList, ...adminOnly, PaymentRoutes.listByActivity);
activityRouter.post(Paths.Activities.PaymentsApplyBalance, ...adminOnly, PaymentRoutes.applyBalance);
activityRouter.post(Paths.Activities.PaymentsAdd, ...adminOnly, PaymentRoutes.record);
activityRouter.delete(Paths.Activities.PaymentsDelete, ...adminOnly, PaymentRoutes.delete);
apiRouter.use(Paths.Activities._, activityRouter);

const authRouter = Router();
authRouter.post(Paths.Auth.Login, rateLimiters.auth, AuthRoutes.login);
authRouter.post(Paths.Auth.Refresh, rateLimiters.default, AuthRoutes.refresh);
authRouter.get(Paths.Auth.Logout, rateLimiters.default, AuthRoutes.logout);
authRouter.post(Paths.Auth.Register, rateLimiters.auth, AuthRoutes.register);
authRouter.get(Paths.Auth.Check, rateLimiters.default, AuthRoutes.check);
authRouter.get(Paths.Auth.VerifyEmail, rateLimiters.default, AuthRoutes.verifyEmail);
authRouter.post(Paths.Auth.ForgotPassword, rateLimiters.auth, AuthRoutes.forgotPassword);
authRouter.post(Paths.Auth.ResetPassword, rateLimiters.auth, AuthRoutes.resetPassword);
apiRouter.use(Paths.Auth._, authRouter);


const bankAccountRouter = Router();

bankAccountRouter.get(
  Paths.BankAccount.GetAll, 
  rateLimiters.default, 
  BankAccountRoutes.getAll,
);


bankAccountRouter.get(
  Paths.BankAccount.GetByUserId, 
  rateLimiters.default, 
  BankAccountRoutes.getByUserId,
);


bankAccountRouter.post(
  Paths.BankAccount.Add, 
  rateLimiters.default, 
  BankAccountRoutes.add,
);


bankAccountRouter.put(
  Paths.BankAccount.Upsert, 
  rateLimiters.default, 
  BankAccountRoutes.upsert,
);

bankAccountRouter.delete(
  Paths.BankAccount.Delete, 
  rateLimiters.default, 
  BankAccountRoutes.delete,
);

apiRouter.use(Paths.BankAccount._, bankAccountRouter);

/******************************************************************************
                                Export
******************************************************************************/

export default apiRouter;