export interface OrderStatus {

  statusCode: string;

  statusName: string;

  sortOrder: number;

  isTerminal: boolean;

}



export interface Invoice {

  id: number;

  totalAmount: number;

  date: string;

  createdAt: string;

  updatedAt: string;

}



export type PaymentStatus = "unpaid" | "partial" | "paid";

export interface Payment {
  id: number;
  activityId: number;
  paidAmount: number;
  paymentDate: string;
  method: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentSummary {
  activityId: number;
  invoiceTotal: number;
  paidTotal: number;
  remaining: number;
  customerBalance: number;
  customerTotalDebt: number;
  customerDebtOtherOrders: number;
  paymentStatus: PaymentStatus;
  paymentStatusLabel: string;
  canRecordPayment: boolean;
  paymentsDeferred?: boolean;
  payments: Payment[];
}

export interface Activity {

  id: number;

  userId: number;

  customerId: number;

  invoiceId: number | null;

  status: string;

  paymentStatus: PaymentStatus;

  activityDate: string;

  deliveryDate: string | null;

  content: string;

  createdAt: string;

  updatedAt: string;

  /** Chỉ có khi lấy danh sách hoạt động */
  invoiceTotal?: number;
  paidTotal?: number;
  remaining?: number;
  paymentStatusLabel?: string;
}



export interface ActivityWrite {

  userId: number;

  customerId: number;

  content: string;

}



export interface ActivityDetail {

  activityId: number;

  productId: number;

  quantity: number;

  salePrice: number;

  productName: string;

  unitPrice: number;

  lineTotal: number;

}



export interface Product {

  id: number;

  productName: string;

  unitPrice: number;

  stockQuantity: number;

}

export interface Supplier {
  id: number;
  supplierName: string;
  businessType: string;
  address: string;
  phoneNumber: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface ImportWrite {
  supplierId: number;
  content: string;
}

export interface Import {
  id: number;
  supplierId: number;
  importDate: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface ImportView extends Import {
  supplierName?: string;
  totalAmount?: number;
  lineCount?: number;
}

export interface ImportDetail {
  importId: number;
  productId: number;
  quantity: number;
  importPrice: number;
  productName: string;
  unitPrice: number;
  lineTotal: number;
}

export interface IBankAccount {
  bankAccountId: number;
  userId: number;
  bankName: string;
  accountNumber: string;
  createdAt: string;
  updatedAt: string;
}

export interface IBankAccountCreate {
  userId: number;
  bankName: string;
  accountNumber: string;
}

export type IBankAccountUpdate = Partial<Omit<IBankAccountCreate, 'userId'>>;

export interface User {
  id: number;
  username: string;
  password?: string;
  role: string;
  fullName: string;
  department: string;
  phoneNumber: string;
  email: string;
  isActivated: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface UserCreate {
  username: string;
  password?: string;
  role: string;
  fullName: string;
  department: string;
  phoneNumber: string;
  email: string;
}

export type UserPublic = Omit<User, "password">;

export interface Salary {
  id: number;
  userId: number;
  month: number;
  year: number;
  baseSalary: number;
  commission: number;
  bonus: number;
  isPaid: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface SalaryWithUser extends Salary {
  user: UserPublic | null;
}

export interface Location {

  id: number;

  province: string;

  ward: string;

  wardCode: number;

}

export interface EmployeeLocationView {
  userId: number;
  locationId: number;
  createdAt: string;
  user?: {
    id: number;
    username: string;
    fullName: string;
    role: string;
    department: string;
  };
  location: Location;
}


export interface Customer {

  id: number;

  locationId: number;

  companyName: string;

  businessType: string;

  representativeName: string;

  position: string;

  phoneNumber: string;

  currentBalance: number;

  lat?: number;     

  lng?: number;      

  isApproved: boolean; 
  
  approvedAt?: Date | string; 
}

export interface CustomerOrderRow {
  activityId: number;
  activityDate: string;
  createdAt: string;
  status: string;
  paymentStatus: PaymentStatus;
  paymentStatusLabel: string;
  invoiceTotal: number;
  paidTotal: number;
  remaining: number;
}

export interface CustomerAccount {
  customer: Customer;
  currentBalance: number;
  totalDebt: number;
  orders: CustomerOrderRow[];
}

export interface CustomerPaymentAllocation {
  activityId: number;
  paidAmount: number;
}

export interface CustomerReceivePaymentResult {
  allocations: CustomerPaymentAllocation[];
  excessToBalance: number;
  account: CustomerAccount;
}

export interface EmployeeOverviewStats {
  totalActivities: number;
  conversionRate: number;
  grossRevenue: number;
  collectedRevenue: number;
  pendingRevenue: number;
  averageOrderValue: number;
}

export interface EmployeeMonthlyStats {
  period: string;
  tasksReceived: number;
  tasksProcessed: number;
  monthlyGrossRevenue: number;
  monthlyCollectedRevenue: number;
  monthlyDebtCreated: number;
}

export interface LocationStatItem {
  province: string;
  ward: string;
  activeCustomersCount: number;
  revenueGenerated: number;
  collectedAmount: number;
  outstandingDebt: number;
}

export interface EmployeeLocationStats {
  locations: LocationStatItem[];
}

export interface TopProductStat {
  productName: string;
  totalQty: number;
  totalSales: number;
}

export interface TopProductsStats {
  products: TopProductStat[];
}

export interface StatusBreakdownItem {
  statusName: string;
  count: number;
}

export interface StatusBreakdownStats {
  breakdown: StatusBreakdownItem[];
}

export interface RecentSaleTimelineItem {
  createdAt: string;
  customerName: string;
  productName: string;
  amount: number;
}

export interface RecentSalesTimelineStats {
  timeline: RecentSaleTimelineItem[];
}

export interface SellerOverviewStats {
  totalActivities: number;
  conversionRate: number;
  grossRevenue: number;
  totalCost: number;
  totalProfit: number;
  collectedRevenue: number;
  outstandingDebt: number;
  currentBalance: number;
  averageOrderValue: number;
}

export interface SellerRevenueSeriesPoint {
  key: string;
  label: string;
  revenue: number;
  cost: number;
  profit: number;
}

export interface SellerRevenueSeries {
  granularity: "day" | "month";
  series: SellerRevenueSeriesPoint[];
}

export interface SellerMonthlyStatItem {
  month: number;
  period: string;
  successfulDeliveries: number;
  collectedCod: number;
}

export interface TopDebtorItem {
  customerId: number;
  customerName: string;
  phoneNumber: string;
  currentBalance: number;
  outstandingDebt: number;
  totalDebt: number;
  totalOrders: number;
}

export interface TopDebtorsStats {
  debtors: TopDebtorItem[];
}

export interface ShipperOverviewStats {
  totalDeliveryTrips: number;
  completedDeliveries: number;
  deliverySuccessRate: number;
  totalMoneyCollected: number;
}

export interface ShipperMonthlyStats {
  period: string;
  monthlyTrips: number;
  monthlySuccess: number;
  monthlyMoneyCollected: number;
}

export interface OccupiedAreaInfo {
  employeeName: string;
  activityContent: string;
  customerName: string;
}

export interface MapStatusStats {
  date: string;
  occupiedProvinces: Record<string, OccupiedAreaInfo>;
}

