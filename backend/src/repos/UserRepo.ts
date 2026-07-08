import bcrypt from 'bcryptjs';
import userModel, { IUser, IUserCreate, IUserPublic } from '@src/models/User.model';
import prisma from './prisma';
import { buildActivityDateFilter } from '@src/common/utils/stats-period';
import { User } from '@prisma/client';
import { toUser } from './common/mappers';

const SALT_ROUNDS = 12;

/******************************************************************************
                                    Helpers
 ******************************************************************************/

type ActivityDebtRow = {
  invoice?: { total_amount: unknown } | null;
  details?: { quantity: number; sale_price: unknown }[];
  payments?: { paid_amount: unknown }[];
};

/** Chi tinh no tren don da co hoa don (giong CustomerService.buildOrderRows). */
function getActivityRemainingDebt(activity: ActivityDebtRow): number {
  if (activity.invoice?.total_amount == null) return 0;
  const orderTotal = Number(activity.invoice.total_amount);
  const orderPaid = (activity.payments ?? []).reduce(
    (sum, p) => sum + Number(p.paid_amount),
    0,
  );
  return Math.max(0, orderTotal - orderPaid);
}

function getGrossOrderTotal(activity: ActivityDebtRow): number {
  if (activity.invoice?.total_amount != null) {
    return Number(activity.invoice.total_amount);
  }
  if (activity.details?.length) {
    return activity.details.reduce(
      (sum, det) => sum + det.quantity * Number(det.sale_price),
      0,
    );
  }
  return 0;
}

/******************************************************************************
                                    Functions
******************************************************************************/
async function getOne(username: string): Promise<IUser | null> {
  const row = await prisma.user.findFirst({
    where: { 
      username: username,
      deleted_at: null,
      is_activated: true
    },
  });
  return row ? toUser(row) : null;
}

async function getOneByEmail(email: string): Promise<IUser | null> {
  const row = await prisma.user.findFirst({
    where: { 
      email: email,
      deleted_at: null,
    },
  });
  return row ? toUser(row) : null;
}

async function persists(id: number): Promise<boolean> {
  const count = await prisma.user.count({
    where: { 
      user_id: id, 
      deleted_at: null, 
    },
  });
  return count > 0;
}

async function getAll(): Promise<IUserPublic[]> {
  const rows = await prisma.user.findMany({
    where: { 
      deleted_at: null, 
      is_activated: true 
    },
  });
  return rows.map(row => userModel.toPublic(toUser(row)));
}

async function getAllUnactivated(): Promise<IUserPublic[]> {
  const rows = await prisma.user.findMany({
    where: { 
      deleted_at: null, 
      is_activated: false 
    },
  });
  return rows.map(row => userModel.toPublic(toUser(row)));
}

async function search(query: string): Promise<IUser[]> {
  const rows = await prisma.user.findMany({
    where: {
      deleted_at: null,
      OR: [
        { full_name: { contains: query, mode: 'insensitive' } },
        { username: { contains: query, mode: 'insensitive' } },
        { department: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
        { phone_number: { contains: query, mode: 'insensitive' } },
      ],
    },
  });
  return rows.map(row => toUser(row));
}

async function add(user: IUserCreate): Promise<IUserPublic> {
  const row = await prisma.user.create({
    data: {
      username: user.username,
      password: user.password,
      role: user.role,
      full_name: user.fullName,
      department: user.department,
      phone_number: user.phoneNumber,
      email: user.email,    
      is_activated: user.isActivated
    },
  });
  return userModel.toPublic(toUser(row));
}

async function update(user: Partial<IUser>): Promise<IUserPublic> {
  const existingUser = await prisma.user.findUnique({
    where: { user_id: user.id },
  });

  if (!existingUser) {
    throw new Error('User not found');
  }

  let hashedPassword = existingUser.password;
  if (user.password && user.password.trim() !== "" && user.password !== existingUser.password) {
    hashedPassword = await bcrypt.hash(user.password, SALT_ROUNDS);
  }

  const row = await prisma.user.update({
    where: { user_id: user.id },
    data: {
      username: user.username ?? existingUser.username,
      password: hashedPassword, 
      role: user.role ?? existingUser.role,
      full_name: user.fullName ?? existingUser.full_name,
      department: user.department ?? existingUser.department,
      phone_number: user.phoneNumber ?? existingUser.phone_number,
      email: user.email ?? existingUser.email,
      is_activated: user.isActivated ?? existingUser.is_activated,
      updated_at: new Date(),
    },
  });

  return userModel.toPublic(toUser(row));
}

async function delete_(id: number): Promise<void> {
  await prisma.user.update({
    where: { user_id: id },
    data: { deleted_at: new Date() },
  });
}

// **** Unit-Tests Only **** //

async function deleteAllUsers(): Promise<void> {
  await prisma.user.deleteMany();
}

async function insertMultiple(users: IUser[]): Promise<void> {
  const data = await Promise.all(
    users.map(async (u) => ({
      username: u.username,
      password: await bcrypt.hash(u.password, SALT_ROUNDS),
      role: u.role,
      full_name: u.fullName,
      department: u.department,
      phone_number: u.phoneNumber,
      email: u.email,
      is_activated: u.isActivated
    })),
  );
  await prisma.user.createMany({ data });
}

async function comparePassword(plainText: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(plainText, hash);
}

/******************************************************************************
                                   Statistics
******************************************************************************/

export type SellerScope = { mode: 'all' } | { mode: 'seller'; sellerId: number };

function userIdFilter(scope: SellerScope): { user_id?: number; user?: { is_activated: boolean } } {
  if (scope.mode === 'all') {
    return { user: { is_activated: true } };
  }
  return { user_id: scope.sellerId, user: { is_activated: true } };
}

function activityScopeWhere(
  scope: SellerScope,
  dateFilter?: { gte: Date; lt: Date },
  locationFilter?: Record<string, string>,
) {
  return {
    ...userIdFilter(scope),
    ...(dateFilter ? { activity_date: dateFilter } : {}),
    ...(locationFilter && Object.keys(locationFilter).length > 0
      ? { customer: { location: locationFilter } }
      : {}),
  };
}

/**
 * Overall employee productivity statistics (Shared/General)
 */
export async function getEmployeeOverviewStats(userId: number) {
  // Bộ lọc gốc đảm bảo user đang được tính toán phải kích hoạt
  const userActivatedFilter = { user_id: userId, user: { is_activated: true } };

  const [totalActivities, validOrdersCount, invoiceAggregate, paymentAggregate] = await Promise.all([
    prisma.activity.count({ where: userActivatedFilter }),
    prisma.activity.count({ where: { ...userActivatedFilter, NOT: { status: 'draft' } } }),
    prisma.invoice.aggregate({
      where: { activity: userActivatedFilter },
      _sum: { total_amount: true },
      _count: { invoice_id: true }
    }),
    prisma.payment.aggregate({
      where: { activity: userActivatedFilter },
      _sum: { paid_amount: true }
    })
  ]);

  if (totalActivities === 0) {
    return { totalActivities: 0, conversionRate: 0, grossRevenue: 0, collectedRevenue: 0, pendingRevenue: 0, averageOrderValue: 0 };
  }

  const grossRevenue = Number(invoiceAggregate._sum.total_amount) || 0;
  const collectedRevenue = Number(paymentAggregate._sum.paid_amount) || 0;
  const completedCount = invoiceAggregate._count.invoice_id || 0;

  return {
    totalActivities,
    conversionRate: Number(((validOrdersCount / totalActivities) * 100).toFixed(2)),
    grossRevenue,
    collectedRevenue,
    pendingRevenue: Math.max(0, grossRevenue - collectedRevenue),
    averageOrderValue: completedCount > 0 ? Number((grossRevenue / completedCount).toFixed(2)) : 0,
  };
}

/**
 * Detailed monthly productivity and individual targets for a specific employee
 */
function getDateFilter(month?: string, year?: string, date?: string) {
  return buildActivityDateFilter({ month, year, date });
}

export async function getEmployeeMonthlyStats(userId: number, inputMonth?: number, inputYear?: number) {
  const now = new Date();
  const month = inputMonth ?? (now.getMonth() + 1);
  const year = inputYear ?? now.getFullYear();

  const startOfMonth = new Date(year, month - 1, 1);
  const startOfNextMonth = new Date(year, month, 1);
  
  const userActivatedFilter = { user_id: userId, user: { is_activated: true } };

  const [tasksReceived, tasksProcessed, monthlyInvoices, monthlyPayments] = await Promise.all([
    prisma.activity.count({
      where: { ...userActivatedFilter, activity_date: { gte: startOfMonth, lt: startOfNextMonth } }
    }),
    prisma.activity.count({
      where: { ...userActivatedFilter, NOT: { status: 'draft' }, activity_date: { gte: startOfMonth, lt: startOfNextMonth } }
    }),
    prisma.invoice.aggregate({
      where: { activity: userActivatedFilter, date: { gte: startOfMonth, lt: startOfNextMonth } },
      _sum: { total_amount: true }
    }),
    prisma.payment.aggregate({
      where: { activity: userActivatedFilter, payment_date: { gte: startOfMonth, lt: startOfNextMonth } },
      _sum: { paid_amount: true }
    })
  ]);

  const grossRevenue = Number(monthlyInvoices._sum.total_amount) || 0;
  const collectedRevenue = Number(monthlyPayments._sum.paid_amount) || 0;

  return {
    period: `${month.toString().padStart(2, '0')}/${year}`,
    tasksReceived, 
    tasksProcessed, 
    monthlyGrossRevenue: grossRevenue, 
    monthlyCollectedRevenue: collectedRevenue, 
    monthlyDebtCreated: Math.max(0, grossRevenue - collectedRevenue) 
  };
}

export async function getEmployeeLocationStats(scope: SellerScope, month: string, year: string, province?: string, ward?: string, date?: string) {
  const dateFilter = getDateFilter(month, year, date);
  const userFilter = userIdFilter(scope);
  
  const locations = await prisma.location.findMany({
    where: {
      ...(province && province !== "all" ? { province } : {}),
      ...(ward && ward !== "all" ? { ward } : {}),
      customers: {
        some: {
          activities: {
            some: {
              ...userFilter,
              ...(dateFilter ? { activity_date: dateFilter } : {}),
            },
          },
        },
      },
    },
    select: {
      province: true,
      ward: true,
      customers: {
        where: {
          activities: {
            some: {
              ...userFilter,
            },
          },
        },
        select: {
          customer_id: true,
          current_balance: true,
          activities: {
            where: {
              ...userFilter,
              ...(dateFilter ? { activity_date: dateFilter } : {}),
              status: { not: "cancelled" }
            },
            select: {
              invoice: { select: { total_amount: true } },
              details: { select: { quantity: true, sale_price: true } },
              payments: { select: { paid_amount: true } }
            }
          }
        }
      }
    }
  });

  return {
    locations: locations.map(loc => {
      let revenueGenerated = 0;
      let collectedAmount = 0; 
      let outstandingDebt = 0;

      loc.customers.forEach(cust => {
        cust.activities.forEach(act => {
          const orderTotal = getGrossOrderTotal(act);

          revenueGenerated += orderTotal;

          const orderPaid = act.payments?.reduce((sum, p) => sum + Number(p.paid_amount), 0) || 0;
          
          collectedAmount += orderPaid; 

          outstandingDebt += getActivityRemainingDebt(act);
        });
      });

      return {
        province: loc.province,
        ward: loc.ward,
        activeCustomersCount: loc.customers.length,
        revenueGenerated,
        collectedAmount,
        outstandingDebt
      };
    })
  };
}

export async function getSellerOverviewStats(
  scope: SellerScope, 
  month: string, 
  year: string, 
  province?: string, 
  ward?: string, 
  date?: string
) {
  const dateFilter = getDateFilter(month, year, date);

  const locationFilter: Record<string, string> = {};
  if (province && province !== "all") locationFilter.province = province;
  if (ward && ward !== "all") locationFilter.ward = ward;

  const baseActivityWhere = activityScopeWhere(scope, dateFilter, locationFilter);

  const sellerActivities = await prisma.activity.findMany({
    where: {
      ...baseActivityWhere,
      status: { not: "cancelled" }
    },
    select: {
      activity_id: true,
      status: true,
      invoice: { select: { total_amount: true } },
      details: { select: { quantity: true, sale_price: true, product_id: true } },
      payments: { select: { paid_amount: true } }
    }
  });

  const importPriceByProduct = await getAverageImportPriceByProduct();

  const totalActivities = sellerActivities.length;
  const validOrdersCount = sellerActivities.filter(act => act.status !== 'draft').length;
  
  let grossRevenue = 0;
  let collectedRevenue = 0;
  let outstandingDebt = 0;
  let totalCost = 0;
  let totalProfit = 0;

  sellerActivities.forEach(act => {
    const orderTotal = getGrossOrderTotal(act);

    grossRevenue += orderTotal;

    const cost = getActivityCost(act, importPriceByProduct);
    totalCost += cost;
    totalProfit += Math.max(0, orderTotal - cost);

    const orderPaid = act.payments?.reduce((sum, p) => sum + Number(p.paid_amount), 0) || 0;
    collectedRevenue += orderPaid;

    outstandingDebt += getActivityRemainingDebt(act);
  });

  const customersInScope = await prisma.customer.findMany({
    where: { 
      activities: { some: userIdFilter(scope) },
      ...(Object.keys(locationFilter).length > 0 ? { location: locationFilter } : {})
    },
    select: { current_balance: true }
  });
  
  const currentBalance = customersInScope.reduce((sum, c) => sum + (Number(c.current_balance) || 0), 0);

  return {
    totalActivities, 
    conversionRate: totalActivities > 0 ? Number(((validOrdersCount / totalActivities) * 100).toFixed(2)) : 0, 
    grossRevenue, 
    totalCost: Number(totalCost.toFixed(0)),
    totalProfit: Number(totalProfit.toFixed(0)),
    collectedRevenue,
    outstandingDebt, 
    currentBalance,  
    averageOrderValue: totalActivities > 0 ? Number((grossRevenue / totalActivities).toFixed(0)) : 0
  };
}

export async function getEmployeeStatusBreakdown(scope: SellerScope, month: string, year: string, province?: string, ward?: string, date?: string) {
  const dateFilter = getDateFilter(month, year, date);
  
  const locationFilter: Record<string, string> = {};
  if (province && province !== "all") locationFilter.province = province;
  if (ward && ward !== "all") locationFilter.ward = ward;

  const statusCounts = await prisma.activity.groupBy({
    by: ['status'],
    where: activityScopeWhere(scope, dateFilter, locationFilter),
    _count: { activity_id: true }
  });

  return {
    breakdown: statusCounts.map(item => ({
      statusName: item.status, 
      count: item._count.activity_id
    }))
  };
}

export async function getEmployeeRecentSalesTimeline(scope: SellerScope, month: string, year: string, province?: string, ward?: string, date?: string) {
  const dateFilter = getDateFilter(month, year, date);

  const locationFilter: Record<string, string> = {};
  if (province && province !== "all") locationFilter.province = province;
  if (ward && ward !== "all") locationFilter.ward = ward;

  const recentActivities = await prisma.activity.findMany({
    where: { 
      ...activityScopeWhere(scope, dateFilter, locationFilter),
      invoice_id: { not: null },
    },
    orderBy: { activity_date: 'desc' },
    take: 10,
    select: {
      activity_date: true,
      content: true,
      invoice: { select: { total_amount: true } },
      customer: { select: { company_name: true } },
      details: {
        take: 1,
        select: { product: { select: { product_name: true } } }
      }
    }
  });

  return {
    timeline: recentActivities.map(act => ({
      createdAt: act.activity_date, 
      customerName: act.customer.company_name,
      productName: act.details[0]?.product?.product_name || act.content,
      amount: Number(act.invoice?.total_amount) || 0 
    }))
  };
}

export async function getEmployeeTopDebtors(scope: SellerScope, province?: string, ward?: string) {
  const locationFilter: Record<string, string> = {};
  if (province && province !== "all") locationFilter.province = province;
  if (ward && ward !== "all") locationFilter.ward = ward;

  const userFilter = userIdFilter(scope);

  const customers = await prisma.customer.findMany({
    where: { 
      activities: { some: userFilter },
      ...(Object.keys(locationFilter).length > 0 ? { location: locationFilter } : {})
    },
    select: {
      customer_id: true,
      company_name: true,
      phone_number: true,
      current_balance: true,
      activities: {
        where: {
          ...userFilter,
          status: { not: "cancelled" } 
        },
        select: {
          invoice: { select: { total_amount: true } },
          details: { select: { quantity: true, sale_price: true } },
          payments: { select: { paid_amount: true } }
        }
      },
      _count: {
        select: {
          activities: { where: userFilter }
        }
      }
    }
  });

  const mappedDebtors = customers.map(cust => {
    const currentBalance = Number(cust.current_balance) || 0;
    
    const totalDebt = cust.activities.reduce(
      (sum, activity) => sum + getActivityRemainingDebt(activity),
      0,
    );

    return {
      customerId: cust.customer_id,
      customerName: cust.company_name,
      phoneNumber: cust.phone_number,
      currentBalance: currentBalance, 
      outstandingDebt: totalDebt,      
      totalDebt: totalDebt,            
      totalOrders: cust._count.activities 
    };
  });

  const topDebtors = mappedDebtors
    .sort((a, b) => b.outstandingDebt - a.outstandingDebt)
    .slice(0, 5);

  return {
    debtors: topDebtors
  };
}

export async function getSellerMonthlyStats(sellerId: number, inputMonth?: number, inputYear?: number) {
  const now = new Date();
  const month = inputMonth ?? (now.getMonth() + 1);
  const year = inputYear ?? now.getFullYear();

  const startOfMonth = new Date(year, month - 1, 1);
  const startOfNextMonth = new Date(year, month, 1);

  const activities = await prisma.activity.findMany({
    where: {
      user_id: sellerId,
      user: { is_activated: true }, 
      activity_date: { gte: startOfMonth, lt: startOfNextMonth }
    },
    select: {
      activity_id: true,
      status: true,
      invoice: { select: { total_amount: true } },
      payments: { select: { paid_amount: true } }
    }
  });

  let successfulDeliveries = 0;
  let collectedCod = 0;

  activities.forEach(act => {
    if (act.status === 'completed') successfulDeliveries++;
    act.payments.forEach(p => {
      collectedCod += Number(p.paid_amount) || 0;
    });
  });

  return [{
    month: month,
    period: `${month.toString().padStart(2, '0')}/${year}`,
    successfulDeliveries,
    collectedCod
  }];
}

export async function getEmployeeTopProducts(userId: number) {
  const groupedProducts = await prisma.activityDetail.groupBy({
    by: ['product_id'],
    where: { activity: { user_id: userId, user: { is_activated: true } } }, 
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: 'desc' } },
    take: 5 
  });

  if (groupedProducts.length === 0) return { products: [] };

  const productsInfo = await prisma.product.findMany({
    where: { product_id: { in: groupedProducts.map(p => p.product_id) } },
    select: { product_id: true, product_name: true }
  });

  const detailsInfo = await prisma.activityDetail.findMany({
    where: {
      product_id: { in: groupedProducts.map(p => p.product_id) },
      activity: { user_id: userId, user: { is_activated: true } } 
    },
    select: { product_id: true, sale_price: true, quantity: true }
  });

  const products = groupedProducts.map(gp => {
    const info = productsInfo.find(p => p.product_id === gp.product_id);
    const totalQty = gp._sum.quantity || 0;
    
    const totalSales = detailsInfo
      .filter(d => d.product_id === gp.product_id)
      .reduce((sum, d) => sum + (Number(d.sale_price) * (d.quantity || 0)), 0);

    return {
      productName: info?.product_name || `Unknown`,
      totalQty,
      totalSales
    };
  });

  return { products };
}

export async function getShipperOverviewStats(shipperId: number, month?: string, year?: string, date?: string) {
  const dateFilter = getDateFilter(month ?? "all", year ?? "all", date);
  const userActivatedFilter = { user_id: shipperId, user: { is_activated: true } };
  const activityDateWhere = dateFilter ? { activity_date: dateFilter } : {};
  const paymentDateWhere = dateFilter ? { payment_date: dateFilter } : {};

  const [totalDeliveryTrips, completedDeliveries, moneyCollectedAggregate] = await Promise.all([
    prisma.activity.count({
      where: { ...userActivatedFilter, content: { contains: 'Delivery' }, ...activityDateWhere } 
    }),
    prisma.activity.count({
      where: { ...userActivatedFilter, status: 'completed', ...activityDateWhere }
    }),
    prisma.payment.aggregate({
      where: { activity: userActivatedFilter, ...paymentDateWhere },
      _sum: { paid_amount: true }
    })
  ]);

  return {
    totalDeliveryTrips,
    completedDeliveries,
    deliverySuccessRate: totalDeliveryTrips > 0 ? Number(((completedDeliveries / totalDeliveryTrips) * 100).toFixed(2)) : 0,
    totalMoneyCollected: Number(moneyCollectedAggregate._sum.paid_amount) || 0 
  };
}

export async function getShipperMonthlyStats(shipperId: number, inputMonth?: number, inputYear?: number, date?: string) {
  const now = new Date();
  const month = inputMonth ?? (now.getMonth() + 1);
  const year = inputYear ?? now.getFullYear();

  const dateFilter = date
    ? getDateFilter("all", String(year), date)
    : getDateFilter(String(month), String(year));

  if (!dateFilter) {
    return {
      period: `${month.toString().padStart(2, '0')}/${year}`,
      monthlyTrips: 0,
      monthlySuccess: 0,
      monthlyMoneyCollected: 0,
    };
  }

  const userActivatedFilter = { user_id: shipperId, user: { is_activated: true } };

  const [monthlyTrips, monthlySuccess, monthlyPayments] = await Promise.all([
    prisma.activity.count({
      where: { ...userActivatedFilter, content: { contains: 'Delivery' }, activity_date: dateFilter }
    }),
    prisma.activity.count({
      where: { ...userActivatedFilter, status: 'completed', activity_date: dateFilter }
    }),
    prisma.payment.aggregate({
      where: { activity: userActivatedFilter, payment_date: dateFilter },
      _sum: { paid_amount: true }
    })
  ]);

  const period = date
    ? date.split("-").reverse().join("/")
    : `${month.toString().padStart(2, '0')}/${year}`;

  return {
    period,
    monthlyTrips,
    monthlySuccess,
    monthlyMoneyCollected: Number(monthlyPayments._sum.paid_amount) || 0
  };
}

interface IOccupiedAreaInfo {
  employeeName: string;
  activityContent: string;
  customerName: string;
}

export async function getMapStatusByActivities(dateString: string) {
  const startOfDay = new Date(`${dateString}T00:00:00.000Z`);
  const endOfDay = new Date(`${dateString}T23:59:59.999Z`);

  const activitiesInDay = await prisma.activity.findMany({
    where: {
      activity_date: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    include: {
      user: {
        select: {
          full_name: true,
          username: true,
        },
      },
      customer: {
        include: {
          location: true, 
        },
      },
    },
  });

  const occupiedProvinces: Record<string, IOccupiedAreaInfo> = {};

  activitiesInDay.forEach((act) => {
    const areaKey = act.customer.location.ward; 
    
    if (areaKey) {
      occupiedProvinces[areaKey] = {
        employeeName: act.user.full_name || act.user.username,
        activityContent: act.content,
        customerName: act.customer.company_name,
      };
    }
  });

  return { 
    date: dateString, 
    occupiedProvinces 
  };
}

type RevenueSeriesDetailRow = {
  quantity: number;
  sale_price: unknown;
  product_id: number;
};

type ActivityCostRow = {
  details: RevenueSeriesDetailRow[];
};

type RevenueSeriesActivityRow = ActivityCostRow & {
  activity_date: Date;
  invoice?: { total_amount: unknown } | null;
  payments?: { paid_amount: unknown }[];
};

async function getAverageImportPriceByProduct(): Promise<Map<number, number>> {
  const rows = await prisma.importDetail.groupBy({
    by: ['product_id'],
    _avg: { import_price: true },
  });
  return new Map(
    rows.map((row) => [row.product_id, Number(row._avg.import_price) || 0]),
  );
}

function getActivityCost(
  activity: ActivityCostRow,
  importPriceByProduct: Map<number, number>,
): number {
  if (!activity.details.length) return 0;
  return activity.details.reduce((sum, detail) => {
    const salePrice = Number(detail.sale_price) || 0;
    const importPrice = importPriceByProduct.get(detail.product_id) ?? 0;
    const unitCost = importPrice > 0 ? importPrice : salePrice * 0.65;
    return sum + detail.quantity * unitCost;
  }, 0);
}

function initRevenueBuckets(granularity: 'day' | 'month', year: number, month?: number) {
  const buckets = new Map<string, { revenue: number; cost: number; profit: number }>();

  if (granularity === 'month') {
    for (let m = 1; m <= 12; m += 1) {
      buckets.set(String(m), { revenue: 0, cost: 0, profit: 0 });
    }
    return buckets;
  }

  const monthIndex = month ?? 1;
  const daysInMonth = new Date(year, monthIndex, 0).getDate();
  for (let day = 1; day <= daysInMonth; day += 1) {
    buckets.set(String(day), { revenue: 0, cost: 0, profit: 0 });
  }
  return buckets;
}

export async function getSellerRevenueSeries(
  scope: SellerScope,
  year: string,
  month: string,
  province?: string,
  ward?: string,
) {
  const granularity: 'day' | 'month' = month !== 'all' ? 'day' : 'month';
  const parsedYear = Number.parseInt(year, 10);
  const parsedMonth = month !== 'all' ? Number.parseInt(month, 10) : undefined;

  if (Number.isNaN(parsedYear)) {
    return { granularity, series: [] as const };
  }

  const dateFilter = buildActivityDateFilter({ month, year });
  const locationFilter: Record<string, string> = {};
  if (province && province !== 'all') locationFilter.province = province;
  if (ward && ward !== 'all') locationFilter.ward = ward;

  const [activities, importPriceByProduct] = await Promise.all([
    prisma.activity.findMany({
      where: {
        ...activityScopeWhere(scope, dateFilter, locationFilter),
        status: { not: 'cancelled' },
      },
      select: {
        activity_date: true,
        invoice: { select: { total_amount: true } },
        details: {
          select: {
            quantity: true,
            sale_price: true,
            product_id: true,
          },
        },
        payments: { select: { paid_amount: true } },
      },
      orderBy: { activity_date: 'asc' },
    }),
    getAverageImportPriceByProduct(),
  ]);

  const buckets = initRevenueBuckets(granularity, parsedYear, parsedMonth);

  for (const activity of activities) {
    const revenue = getGrossOrderTotal(activity);
    if (revenue <= 0) continue;

    const cost = getActivityCost(activity, importPriceByProduct);
    const profit = Math.max(0, revenue - cost);

    const bucketKey =
      granularity === 'month'
        ? String(activity.activity_date.getUTCMonth() + 1)
        : String(activity.activity_date.getUTCDate());

    const bucket = buckets.get(bucketKey);
    if (!bucket) continue;

    bucket.revenue += revenue;
    bucket.cost += cost;
    bucket.profit += profit;
  }

  const series = Array.from(buckets.entries()).map(([key, values]) => {
    const label =
      granularity === 'month'
        ? `T${key}`
        : `${key.padStart(2, '0')}/${String(parsedMonth).padStart(2, '0')}`;

    return {
      key,
      label,
      revenue: Number(values.revenue.toFixed(0)),
      cost: Number(values.cost.toFixed(0)),
      profit: Number(values.profit.toFixed(0)),
    };
  });

  return { granularity, series };
}

/* ==========================================================================
   PART 5: EXPORT REPOSITORY OBJECT
   ========================================================================== */

export default {
  getOne,
  getOneByEmail,
  persists,
  getAll,
  getAllUnactivated,
  search,
  add,
  update,
  delete: delete_,
  deleteAllUsers,
  insertMultiple,
  comparePassword,

  // General Statistics
  getEmployeeOverviewStats,
  getEmployeeMonthlyStats,
  getEmployeeLocationStats,
  getEmployeeTopProducts,
  getEmployeeStatusBreakdown,
  getEmployeeRecentSalesTimeline,

  // Seller Statistics
  getSellerOverviewStats,
  getSellerMonthlyStats,
  getSellerRevenueSeries,
  getEmployeeTopDebtors,

  // Shipper Statistics
  getShipperOverviewStats,
  getShipperMonthlyStats,
  getMapStatusByActivities
} as const;