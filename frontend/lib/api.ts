import type {
  Activity,
  ActivityDetail,
  ActivityWrite,
  Customer,
  CustomerAccount,
  CustomerReceivePaymentResult,
  User,
  Invoice,
  Location,
  EmployeeLocationView,
  OrderStatus,
  PaymentSummary,
  Product,
  Salary,
  UserPublic,
  UserCreate,
  Supplier,
  Import,
  ImportWrite,
  ImportView,
  ImportDetail,
  SalaryWithUser,
  EmployeeOverviewStats,
  EmployeeMonthlyStats,
  EmployeeLocationStats,
  TopProductsStats,
  StatusBreakdownStats,
  RecentSalesTimelineStats,
  SellerOverviewStats,
  SellerRevenueSeries,
  SellerMonthlyStatItem,
  TopDebtorsStats,
  ShipperOverviewStats,
  ShipperMonthlyStats,
  MapStatusStats,
  IBankAccount,
  IBankAccountCreate,
  IBankAccountUpdate,
} from "@/lib/types";
import { getAuthTokens, setAuthTokens } from "@/lib/auth-tokens";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "https://business-management-lyart.vercel.app/api";

export type PagedResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

let isRefreshing = false;
let refreshPromise: Promise<void> | null = null;

/** 401 từ các route này không phải "token hết hạn" — không gọi refresh. */
const AUTH_PATHS_SKIP_TOKEN_REFRESH = [
  "/auth/login",
  "/auth/register",
  "/auth/refresh",
  "/auth/check",
  "/auth/logout",
];

function shouldAttemptTokenRefresh(path: string, status: number): boolean {
  if (status !== 401) return false;
  return !AUTH_PATHS_SKIP_TOKEN_REFRESH.some((p) => path.includes(p));
}

async function resolveAuthTokens(): Promise<{
  accessToken: string | null;
  refreshToken: string | null;
}> {
  const cached = getAuthTokens();
  if (cached.accessToken) {
    return cached;
  }

  if (typeof window !== "undefined") {
    const { getSession } = await import("next-auth/react");
    const session = await getSession();
    if (session?.accessToken) {
      setAuthTokens(session.accessToken, session.refreshToken ?? null);
      return {
        accessToken: session.accessToken,
        refreshToken: session.refreshToken ?? null,
      };
    }
  }

  return cached;
}

async function handleAuthFailure(): Promise<never> {
  if (typeof window !== "undefined") {
    const { signOut } = await import("next-auth/react");
    await signOut({ callbackUrl: "/auth" });
  }
  throw new Error("Session expired");
}

async function buildRequestHeaders(extra?: HeadersInit): Promise<HeadersInit> {
  const { accessToken } = await resolveAuthTokens();
  return {
    "Content-Type": "application/json",
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...extra,
  };
}

async function request<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const headers = await buildRequestHeaders(
    options?.headers as HeadersInit | undefined,
  );
  const defaultOptions: RequestInit = {
    ...options,
    credentials: "include",
    headers,
  };

  let res = await fetch(url, defaultOptions);

  if (shouldAttemptTokenRefresh(path, res.status)) {
    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = (async () => {
        try {
          const { refreshToken } = await resolveAuthTokens();
          if (!refreshToken) {
            throw new Error("No refresh token");
          }

          const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken }),
          });

          if (!refreshRes.ok) throw new Error("Refresh token expired");

          const data = (await refreshRes.json()) as { accessToken: string };
          setAuthTokens(data.accessToken, refreshToken);
        } catch {
          await handleAuthFailure();
        } finally {
          isRefreshing = false;
          refreshPromise = null;
        }
      })();
    }
    await refreshPromise;

    res = await fetch(url, {
      ...defaultOptions,
      headers: await buildRequestHeaders(
        options?.headers as HeadersInit | undefined,
      ),
    });
  }

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      message = body.error ?? message;
    } catch { }
    throw new Error(message);
  }

  if (res.status === 204 || res.status === 205) return undefined as T;

  const text = await res.text();
  if (!text.trim()) return undefined as T;

  return JSON.parse(text) as T;
}

async function downloadBlob(path: string, filename: string): Promise<void> {
  const url = `${API_BASE}${path}`;
  const headers = await buildRequestHeaders();
  const options: RequestInit = { credentials: "include", headers };

  let res = await fetch(url, options);

  if (shouldAttemptTokenRefresh(path, res.status)) {
    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = (async () => {
        try {
          const { refreshToken } = await resolveAuthTokens();
          if (!refreshToken) {
            throw new Error("No refresh token");
          }

          const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken }),
          });
          if (!refreshRes.ok) throw new Error("Refresh token expired");

          const data = (await refreshRes.json()) as { accessToken: string };
          setAuthTokens(data.accessToken, refreshToken);
        } catch {
          await handleAuthFailure();
        } finally {
          isRefreshing = false;
          refreshPromise = null;
        }
      })();
    }
    await refreshPromise;
    res = await fetch(url, {
      credentials: "include",
      headers: await buildRequestHeaders(),
    });
  }

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      message = body.error ?? message;
    } catch { }
    throw new Error(message);
  }

  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = blobUrl;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(blobUrl);
}

export const orderStatusesApi = {
  getAll: () =>
    request<{ statuses: OrderStatus[] }>("/order-statuses/all").then(
      (d) => d.statuses,
    ),
};

export const activitiesApi = {
  getAll: () =>
    request<{ activities: Activity[] }>("/activities/all").then(
      (d) => d.activities,
    ),
  getPage: (
    page: number,
    pageSize = 10,
    filters?: { search?: string; status?: string; debt?: string; fromDate?: string; toDate?: string },
  ) =>
    request<{ activities: Activity[]; total: number; page: number; pageSize: number }>(
      `/activities/all${buildQuery(page, pageSize, filters)}`,
    ).then((d) => ({
      items: d.activities,
      total: d.total,
      page: d.page,
      pageSize: d.pageSize,
    }) as PagedResult<Activity>),
  getOne: (id: number) =>
    request<{ activity: Activity }>(`/activities/${id}`).then((d) => d.activity),
  add: (activity: ActivityWrite) =>
    request<{ activity: Activity }>("/activities/add", {
      method: "POST",
      body: JSON.stringify({ activity }),
    }).then((d) => d.activity),
  update: (activity: ActivityWrite & { id: number }) =>
    request<{ activity: Activity }>("/activities/update", {
      method: "PUT",
      body: JSON.stringify({ activity }),
    }).then((d) => d.activity),
  confirm: (id: number) =>
    request<{ activity: Activity; invoiceId: number }>(
      `/activities/${id}/confirm`,
      { method: "POST" },
    ),
  advanceStatus: (
    id: number,
    body?: {
      pendingPayments?: { paidAmount: number; method: string }[];
      applyCustomerBalance?: boolean;
    },
  ) =>
    request<{
      activity: Activity;
      nextStatus: string;
      nextStatusName: string;
    }>(`/activities/${id}/advance-status`, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),
  delete: (id: number) =>
    request<void>(`/activities/delete/${id}`, { method: "DELETE" }),
  exportExcel: (fromDate: string, toDate: string) =>
    downloadBlob(
      `/activities/export?fromDate=${encodeURIComponent(fromDate)}&toDate=${encodeURIComponent(toDate)}`,
      `hoat-dong_${fromDate}_${toDate}.xlsx`,
    ),
};

export const paymentsApi = {
  getSummary: (activityId: number) =>
    request<{ summary: PaymentSummary }>(
      `/activities/${activityId}/payment-summary`,
    ).then((d) => d.summary),
  applyBalance: (activityId: number) =>
    request<{
      applied: number;
      paymentStatus: string;
      summary: PaymentSummary;
    }>(`/activities/${activityId}/payments/apply-balance`, { method: "POST" }),
  record: (
    activityId: number,
    payment: {
      paidAmount: number;
      method: string;
      applyCustomerBalance?: boolean;
    },
  ) =>
    request<{
      payment: unknown;
      excessToBalance: number;
      summary: PaymentSummary;
    }>(`/activities/${activityId}/payments`, {
      method: "POST",
      body: JSON.stringify({ payment }),
    }),
  delete: (paymentId: number) =>
    request<void>(`/activities/payments/${paymentId}`, { method: "DELETE" }),
};

export const activityDetailsApi = {
  getByActivity: (activityId: number) =>
    request<{ details: ActivityDetail[] }>(
      `/activities/${activityId}/details`,
    ).then((d) => d.details),
  add: (detail: {
    activityId: number;
    productId: number;
    quantity: number;
    salePrice: number;
  }) =>
    request<{ detail: ActivityDetail }>("/activities/details/add", {
      method: "POST",
      body: JSON.stringify({ detail }),
    }).then((d) => d.detail),
  update: (detail: {
    activityId: number;
    productId: number;
    quantity: number;
    salePrice: number;
  }) =>
    request<{ detail: ActivityDetail }>("/activities/details/update", {
      method: "PUT",
      body: JSON.stringify({ detail }),
    }).then((d) => d.detail),
  delete: (activityId: number, productId: number) =>
    request<void>(
      `/activities/details/delete/${activityId}/${productId}`,
      { method: "DELETE" },
    ),
};

export const invoicesApi = {
  getAll: () =>
    request<{ invoices: Invoice[] }>("/invoices/all").then((d) => d.invoices),
  add: (invoice: Omit<Invoice, "createdAt" | "updatedAt">) =>
    request<{ invoice: Invoice }>("/invoices/add", {
      method: "POST",
      body: JSON.stringify({ invoice }),
    }).then((d) => d.invoice),
  update: (invoice: Omit<Invoice, "createdAt" | "updatedAt">) =>
    request<{ invoice: Invoice }>("/invoices/update", {
      method: "PUT",
      body: JSON.stringify({ invoice }),
    }).then((d) => d.invoice),
  delete: (id: number) =>
    request<void>(`/invoices/delete/${id}`, { method: "DELETE" }),
};

export const productsApi = {
  getAll: () =>
    request<{ products: Product[] }>("/products/all").then((d) => d.products),
  getPage: (page: number, pageSize = 10, filters?: { search?: string }) =>
    request<{ products: Product[]; total: number; page: number; pageSize: number }>(
      `/products/all${buildQuery(page, pageSize, filters)}`,
    ).then((d) => ({
      items: d.products,
      total: d.total,
      page: d.page,
      pageSize: d.pageSize,
    }) as PagedResult<Product>),
  getOne: (id: number) =>
    request<{ product: Product }>(`/products/${id}`).then((d) => d.product),
  add: (product: Omit<Product, "id">) =>
    request<{ product: Product }>("/products/add", {
      method: "POST",
      body: JSON.stringify({ product: { ...product, id: 0 } }),
    }).then((d) => d.product),
  update: (product: Product) =>
    request<{ product: Product }>("/products/update", {
      method: "PUT",
      body: JSON.stringify({ product }),
    }).then((d) => d.product),
  delete: (id: number) =>
    request<void>(`/products/delete/${id}`, { method: "DELETE" }),
};

export const customersApi = {
  getAll: () =>
    request<{ customers: Customer[] }>("/customers/all").then(
      (d) => d.customers,
    ),
  getPage: (page: number, pageSize = 10, filters?: { search?: string }) =>
    request<{ customers: Customer[]; total: number; page: number; pageSize: number }>(
      `/customers/all${buildQuery(page, pageSize, filters)}`,
    ).then((d) => ({
      items: d.customers,
      total: d.total,
      page: d.page,
      pageSize: d.pageSize,
    }) as PagedResult<Customer>),
  getOne: (id: number) =>
    request<{ customer: Customer }>(`/customers/${id}`).then((d) => d.customer),
  getAccount: (id: number) =>
    request<{ account: CustomerAccount }>(`/customers/${id}/account`).then(
      (d) => d.account,
    ),
  receivePayment: (
    id: number,
    payment: { amount: number; method: string },
  ) =>
    request<CustomerReceivePaymentResult>(`/customers/${id}/receive-payment`, {
      method: "POST",
      body: JSON.stringify({ payment }),
    }),
  add: (customer: Omit<Customer, "id">) =>
    request<{ customer: Customer }>("/customers/add", {
      method: "POST",
      body: JSON.stringify({ customer: { ...customer, id: 0 } }),
    }).then((d) => d.customer),
  update: (customer: Customer) =>
    request<{ customer: Customer }>("/customers/update", {
      method: "PUT",
      body: JSON.stringify({ customer }),
    }).then((d) => d.customer),
  delete: (id: number) =>
    request<void>(`/customers/delete/${id}`, { method: "DELETE" }),
  getPendingApproval: () =>
    request<{ customers: Customer[] }>("/customers/pending").then(
      (d) => d.customers,
    ),
  approve: (id: number) =>
    request<{ customer: Customer }>(`/customers/approve/${id}`, {
      method: "POST",
    }).then((d) => d.customer), 
};

export const authApi = {
  register: (data: Pick<User, "username" | "password" | "email" | "role">) =>
    request<{ message: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  login: (data: Pick<User, "username" | "password">) =>
    request<{
      message: string;
      user: { userId: number; username: string; role: string };
      accessToken: string;
      refreshToken: string;
    }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  verifyEmail: (token: string) =>
    request<{ message: string }>(`/auth/verify-email?token=${encodeURIComponent(token)}`, {
      method: "GET",
    }),
  forgotPassword: (data: { email: string }) =>
    request<{ message: string }>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  resetPassword: (data: { token: string; password: string }) =>
    request<{ message: string }>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  refresh: (refreshToken: string) =>
    request<{
      message: string;
      accessToken: string;
      user: { userId: number; username: string; role: string };
    }>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    }),
  logout: (refreshToken?: string) =>
    request<void>("/auth/logout", {
      method: "POST",
      body: JSON.stringify(refreshToken ? { refreshToken } : {}),
    }),
  check: () =>
    request<{
      user: { userId: number; username: string; role: string };
      isLoggedIn: boolean;
    }>("/auth/check", {
      method: "GET",
    }),
};

export const salariesApi = {
  getAll: () =>
    request<{ salaries: SalaryWithUser[] }>("/salaries/all", {
      method: "GET",
    }),  
  getPage: (
    page: number,
    pageSize = 10,
    filters?: { month?: number | string; year?: number | string },
  ) =>
    request<{ salaries: SalaryWithUser[]; total: number; page: number; pageSize: number }>(
      `/salaries/all${buildQuery(page, pageSize, filters)}`,
      { method: "GET" },
    ).then((d) => ({
      items: d.salaries,
      total: d.total,
      page: d.page,
      pageSize: d.pageSize,
    }) as PagedResult<SalaryWithUser>),
  getByUserId: (userId: number) =>
    request<{ salaries: Salary[] }>(`/salaries/user/${userId}`, {
      method: "GET",
    }),
  getOne: (id: number) =>
    request<{ salary: Salary }>(`/salaries/${id}`, {
      method: "GET",
    }),
  add: (salary: Omit<Salary, "id" | "createdAt" | "updatedAt">) =>
    request<{ salary: Salary }>("/salaries/add", {
      method: "POST",
      body: JSON.stringify({ salary }),
    }),
  update: (salary: Salary) =>
    request<{ salary: Salary }>("/salaries/update", {
      method: "PUT",
      body: JSON.stringify({ salary }),
    }),
  delete: (id: number) =>
    request<void>(`/salaries/delete/${id}`, {
      method: "DELETE",
    }),
  calculate: (data: { month: number; year: number; commissionRate: number }) =>
    request<{ message: string }>("/salaries/calculate", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

export const locationsApi = {
  getAll: () =>
    request<{ locations: Location[] }>("/locations/all").then(
      (d) => d.locations,
    ),
};

export const employeeLocationsApi = {
  getAll: () =>
    request<{ assignments: EmployeeLocationView[] }>(
      "/employee-locations/all",
    ).then((d) => d.assignments),

  getByUser: (userId: number) =>
    request<{ assignments: EmployeeLocationView[] }>(
      `/employee-locations/user/${userId}`,
    ).then((d) => d.assignments),

  getAvailable: () =>
    request<{ locations: Location[] }>("/employee-locations/available").then(
      (d) => d.locations,
    ),

  setByUser: (userId: number, locationIds: number[]) =>
    request<{ assignments: EmployeeLocationView[] }>(
      `/employee-locations/user/${userId}`,
      {
        method: "PUT",
        body: JSON.stringify({ locationIds }),
      },
    ).then((d) => d.assignments),
};

type StatsPeriodOptions = {
  month?: string;
  year?: string;
  date?: string;
  province?: string;
  ward?: string;
};

function buildStatsQueryString(options?: StatsPeriodOptions) {
  const params = new URLSearchParams();
  if (options?.date) {
    params.set("date", options.date);
  } else {
    if (options?.month) params.set("month", options.month);
    if (options?.year) params.set("year", options.year);
  }
  if (options?.province) params.set("province", options.province);
  if (options?.ward) params.set("ward", options.ward);
  const query = params.toString();
  return query ? `?${query}` : "";
}

function buildQuery(
  page: number,
  pageSize: number,
  filters?: Record<string, string | number | boolean | undefined>,
) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== "") {
        params.set(key, String(value));
      }
    });
  }
  return `?${params.toString()}`;
}

function statsRequest<T>(path: string) {
  return request<T>(path, { cache: "no-store" });
}

export const usersApi = {
  getAll: () =>
    request<{ users: UserPublic[] }>("/users/all").then((d) => d.users),
  getPage: (page: number, pageSize = 10, filters?: { search?: string }) =>
    request<{ users: UserPublic[]; total: number; page: number; pageSize: number }>(
      `/users/all${buildQuery(page, pageSize, filters)}`,
    ).then((d) => ({
      items: d.users,
      total: d.total,
      page: d.page,
      pageSize: d.pageSize,
    }) as PagedResult<UserPublic>),
  getAllUnactivated: () =>
    request<{ users: UserPublic[] }>("/users/unactivated").then((d) => d.users),
  search: (query: string) =>
    request<{ users: UserPublic[] }>(`/users/search?query=${encodeURIComponent(query)}`).then((d) => d.users),

  add: (user: Partial<UserCreate>) =>
    request<{ user: UserPublic }>("/users/add", {
      method: "POST",
      body: JSON.stringify({ user }),
    }).then((d) => d.user),

  update: (user: Partial<User>) =>
    request<{ user: UserPublic }>("/users/update", {
      method: "PUT",
      body: JSON.stringify({ user }),
    }).then((d) => d.user),

  delete: (id: number) =>
    request<void>(`/users/delete/${id}`, {
      method: "DELETE",
    }),

  getProfile: () => 
    request<{ user: User; isLoggedIn: boolean }>(`/users/profile`),

  getOverviewStats: (userId: number | string) =>
    request<EmployeeOverviewStats>(`/users/stats/overview/${userId}`),

  getMonthlyStats: (userId: number | string, month?: number, year?: number) => {
    const params = new URLSearchParams();
    if (month !== undefined) params.append("month", month.toString());
    if (year !== undefined) params.append("year", year.toString());
    const queryString = params.toString() ? `?${params.toString()}` : "";
    return request<EmployeeMonthlyStats>(`/users/stats/monthly/${userId}${queryString}`);
  },

  getLocationStats: (userId: number | string, options?: StatsPeriodOptions) =>
    statsRequest<EmployeeLocationStats>(`/users/stats/locations/${userId}${buildStatsQueryString(options)}`),

  getTopProducts: (userId: number | string) =>
    request<TopProductsStats>(`/users/stats/top-products/${userId}`),

  getStatusBreakdown: (userId: number | string, options?: StatsPeriodOptions) =>
    statsRequest<StatusBreakdownStats>(`/users/stats/status-breakdown/${userId}${buildStatsQueryString(options)}`),

  getRecentSalesTimeline: (userId: number | string, options?: StatsPeriodOptions) =>
    statsRequest<RecentSalesTimelineStats>(`/users/stats/recent-sales/${userId}${buildStatsQueryString(options)}`),

  getSellerOverviewStats: (userId: number | string, options?: StatsPeriodOptions) =>
    statsRequest<SellerOverviewStats>(`/users/stats/seller/overview/${userId}${buildStatsQueryString(options)}`),

  getSellerRevenueSeries: (userId: number | string, options?: StatsPeriodOptions) =>
    statsRequest<SellerRevenueSeries>(`/users/stats/seller/revenue-series/${userId}${buildStatsQueryString(options)}`),

  getSellerMonthlyStats: (userId: number | string, month?: number, year?: number) => {
    const params = new URLSearchParams();
    if (month !== undefined) params.append("month", month.toString());
    if (year !== undefined) params.append("year", year.toString());
    const queryString = params.toString() ? `?${params.toString()}` : "";
    return request<SellerMonthlyStatItem[]>(`/users/stats/seller/monthly/${userId}${queryString}`);
  },

  getTopDebtors: (userId: number | string, options?: { province?: string, ward?: string }) => {
    const params = new URLSearchParams();
    if (options?.province) params.append("province", options.province);
    const queryString = params.toString() ? `?${params.toString()}` : "";
    return request<TopDebtorsStats>(`/users/stats/seller/top-debtors/${userId}${queryString}`);
  },
  
  getShipperOverviewStats: (userId: number | string, options?: StatsPeriodOptions) =>
    statsRequest<ShipperOverviewStats>(`/users/stats/shipper/overview/${userId}${buildStatsQueryString(options)}`),

  getShipperMonthlyStats: (userId: number | string, month?: number, year?: number, date?: string) => {
    const params = new URLSearchParams();
    if (date) {
      params.set("date", date);
    } else {
      if (month !== undefined) params.set("month", month.toString());
      if (year !== undefined) params.set("year", year.toString());
    }
    const queryString = params.toString() ? `?${params.toString()}` : "";
    return statsRequest<ShipperMonthlyStats>(`/users/stats/shipper/monthly/${userId}${queryString}`);
  },

  getMapStatus: (date: string) => {
    const params = new URLSearchParams();
    if (date) params.append("date", date);
    const queryString = params.toString() ? `?${params.toString()}` : "";
    return request<MapStatusStats>(`/users/stats/map${queryString}`);
  },
};

export const bankAccountsApi = {
  getAll: () =>
    request<{ bankAccounts: IBankAccount[] }>("/bank-accounts/all").then(
      (d) => d.bankAccounts,
    ),
  getByUserId: (userId: number) =>
    request<{ bankAccount: IBankAccount }>(`/bank-accounts/user/${userId}`).then(
      (d) => d.bankAccount,
    ),
  add: (bankAccount: IBankAccountCreate) =>
    request<{ bankAccount: IBankAccount }>("/bank-accounts/add", {
      method: "POST",
      body: JSON.stringify({ bankAccount }),
    }).then((d) => d.bankAccount),
  upsert: (userId: number, data: IBankAccountUpdate) =>
    request<{ bankAccount: IBankAccount }>(`/bank-accounts/upsert/${userId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }).then((d) => d.bankAccount),
  deleteByUserId: (userId: number) =>
    request<void>(`/bank-accounts/delete/${userId}`, { method: "DELETE" }),
};

export const suppliersApi = {
  getAll: () =>
    request<{ suppliers: Supplier[] }>("/suppliers/all").then(
      (d) => d.suppliers,
    ),
  getPage: (page: number, pageSize = 10, filters?: { search?: string }) =>
    request<{ suppliers: Supplier[]; total: number; page: number; pageSize: number }>(
      `/suppliers/all${buildQuery(page, pageSize, filters)}`,
    ).then((d) => ({
      items: d.suppliers,
      total: d.total,
      page: d.page,
      pageSize: d.pageSize,
    }) as PagedResult<Supplier>),
  getOne: (id: number) =>
    request<{ supplier: Supplier }>(`/suppliers/${id}`).then(
      (d) => d.supplier,
    ),
  add: (supplier: Omit<Supplier, "id" | "createdAt" | "updatedAt">) =>
    request<{ supplier: Supplier }>("/suppliers/add", {
      method: "POST",
      body: JSON.stringify({ supplier: { ...supplier, id: 0 } }),
    }).then((d) => d.supplier),
  update: (supplier: Supplier) =>
    request<{ supplier: Supplier }>("/suppliers/update", {
      method: "PUT",
      body: JSON.stringify({ supplier }),
    }).then((d) => d.supplier),
  delete: (id: number) =>
    request<void>(`/suppliers/delete/${id}`, { method: "DELETE" }),
};

export const importsApi = {
  getAll: () =>
    request<{ imports: ImportView[] }>("/imports/all").then((d) => d.imports),
  getPage: (
    page: number,
    pageSize = 10,
    filters?: { search?: string; fromDate?: string; toDate?: string },
  ) =>
    request<{ imports: ImportView[]; total: number; page: number; pageSize: number }>(
      `/imports/all${buildQuery(page, pageSize, filters)}`,
    ).then((d) => ({
      items: d.imports,
      total: d.total,
      page: d.page,
      pageSize: d.pageSize,
    }) as PagedResult<ImportView>),
  getOne: (id: number) =>
    request<{ import: Import }>(`/imports/${id}`).then((d) => d.import),
  add: (importRecord: ImportWrite) =>
    request<{ import: Import }>("/imports/add", {
      method: "POST",
      body: JSON.stringify({ import: importRecord }),
    }).then((d) => d.import),
  update: (id: number, importRecord: ImportWrite) =>
    request<{ import: Import }>(`/imports/update/${id}`, {
      method: "PUT",
      body: JSON.stringify({ import: importRecord }),
    }).then((d) => d.import),
  delete: (id: number) =>
    request<void>(`/imports/delete/${id}`, { method: "DELETE" }),
  exportExcel: (fromDate: string, toDate: string) =>
    downloadBlob(
      `/imports/export?fromDate=${encodeURIComponent(fromDate)}&toDate=${encodeURIComponent(toDate)}`,
      `nhap-hang_${fromDate}_${toDate}.xlsx`,
    ),
};

export const importDetailsApi = {
  getByImport: (importId: number) =>
    request<{ details: ImportDetail[] }>(
      `/imports/${importId}/details`,
    ).then((d) => d.details),
  add: (detail: {
    importId: number;
    productId: number;
    quantity: number;
    importPrice: number;
  }) =>
    request<{ detail: ImportDetail }>("/imports/details/add", {
      method: "POST",
      body: JSON.stringify({ detail }),
    }).then((d) => d.detail),
  update: (detail: {
    importId: number;
    productId: number;
    quantity: number;
    importPrice: number;
  }) =>
    request<{ detail: ImportDetail }>("/imports/details/update", {
      method: "PUT",
      body: JSON.stringify({ detail }),
    }).then((d) => d.detail),
  delete: (importId: number, productId: number) =>
    request<void>(
      `/imports/details/delete/${importId}/${productId}`,
      { method: "DELETE" },
    ),
};

export const lookupApi = {
  users: () => usersApi.getAll(),
  customers: () => customersApi.getAll(),
  invoices: () => invoicesApi.getAll(),
  products: () => productsApi.getAll(),
  suppliers: () => suppliersApi.getAll(),
};
