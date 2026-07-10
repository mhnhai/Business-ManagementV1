import { Prisma } from '@prisma/client';

import HttpStatusCodes from '@src/common/constants/HttpStatusCodes';
import { RouteError } from '@src/common/utils/route-errors';
import prisma from '@src/repos/common/prisma';

export const BACKUP_VERSION = 1;
export const BACKUP_APP_ID = 'business-management';

export type BackupTables = {
  order_statuses: Record<string, unknown>[];
  users: Record<string, unknown>[];
  locations: Record<string, unknown>[];
  products: Record<string, unknown>[];
  suppliers: Record<string, unknown>[];
  bank_accounts: Record<string, unknown>[];
  salaries: Record<string, unknown>[];
  employee_locations: Record<string, unknown>[];
  customers: Record<string, unknown>[];
  invoices: Record<string, unknown>[];
  imports: Record<string, unknown>[];
  import_details: Record<string, unknown>[];
  activities: Record<string, unknown>[];
  activity_details: Record<string, unknown>[];
  payments: Record<string, unknown>[];
  refresh_tokens: Record<string, unknown>[];
};

export type BackupPayload = {
  version: number;
  exportedAt: string;
  app: string;
  tables: BackupTables;
};

const TABLE_KEYS = [
  'order_statuses',
  'users',
  'locations',
  'products',
  'suppliers',
  'bank_accounts',
  'salaries',
  'employee_locations',
  'customers',
  'invoices',
  'imports',
  'import_details',
  'activities',
  'activity_details',
  'payments',
  'refresh_tokens',
] as const;

function isDecimal(value: unknown): value is Prisma.Decimal {
  return (
    typeof value === 'object' &&
    value !== null &&
    'toFixed' in value &&
    typeof (value as Prisma.Decimal).toFixed === 'function'
  );
}

function serializeValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (isDecimal(value)) {
    return value.toString();
  }
  return value;
}

function serializeRows(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.map((row) => {
    const serialized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      serialized[key] = serializeValue(value);
    }
    return serialized;
  });
}

function deserializeRows(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.map((row) => {
    const deserialized: Record<string, unknown> = { ...row };
    for (const [key, value] of Object.entries(deserialized)) {
      if (
        typeof value === 'string' &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)
      ) {
        const date = new Date(value);
        if (!Number.isNaN(date.getTime())) {
          deserialized[key] = date;
        }
      }
    }
    return deserialized;
  });
}

function assertBackupPayload(payload: unknown): BackupPayload {
  if (!payload || typeof payload !== 'object') {
    throw new RouteError(HttpStatusCodes.BAD_REQUEST, 'File backup không hợp lệ');
  }

  const data = payload as Partial<BackupPayload>;
  if (data.version !== BACKUP_VERSION) {
    throw new RouteError(
      HttpStatusCodes.BAD_REQUEST,
      `Phiên bản backup không được hỗ trợ (yêu cầu version ${BACKUP_VERSION})`,
    );
  }

  if (!data.tables || typeof data.tables !== 'object') {
    throw new RouteError(HttpStatusCodes.BAD_REQUEST, 'File backup thiếu dữ liệu bảng');
  }

  for (const key of TABLE_KEYS) {
    const rows = (data.tables as Record<string, unknown>)[key];
    if (rows !== undefined && !Array.isArray(rows)) {
      throw new RouteError(
        HttpStatusCodes.BAD_REQUEST,
        `Dữ liệu bảng "${key}" không hợp lệ`,
      );
    }
  }

  return data as BackupPayload;
}

function emptyTables(): BackupTables {
  return {
    order_statuses: [],
    users: [],
    locations: [],
    products: [],
    suppliers: [],
    bank_accounts: [],
    salaries: [],
    employee_locations: [],
    customers: [],
    invoices: [],
    imports: [],
    import_details: [],
    activities: [],
    activity_details: [],
    payments: [],
    refresh_tokens: [],
  };
}

function normalizeTables(payload: BackupPayload): BackupTables {
  const tables = emptyTables();
  for (const key of TABLE_KEYS) {
    const rows = payload.tables[key];
    tables[key] = Array.isArray(rows)
      ? deserializeRows(rows as Record<string, unknown>[])
      : [];
  }
  return tables;
}

async function clearAllTables(tx: Prisma.TransactionClient): Promise<void> {
  await tx.payment.deleteMany();
  await tx.activityDetail.deleteMany();
  await tx.activity.deleteMany();
  await tx.importDetail.deleteMany();
  await tx.import.deleteMany();
  await tx.invoice.deleteMany();
  await tx.customer.deleteMany();
  await tx.employeeLocation.deleteMany();
  await tx.salary.deleteMany();
  await tx.bankAccount.deleteMany();
  await tx.refreshToken.deleteMany();
  await tx.supplier.deleteMany();
  await tx.product.deleteMany();
  await tx.location.deleteMany();
  await tx.user.deleteMany();
  await tx.orderStatus.deleteMany();
}

async function insertAllTables(
  tx: Prisma.TransactionClient,
  tables: BackupTables,
): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};

  const insert = async (
    key: string,
    run: () => Promise<Prisma.BatchPayload>,
  ) => {
    const result = await run();
    counts[key] = result.count;
  };

  if (tables.order_statuses.length) {
    await insert('order_statuses', () =>
      tx.orderStatus.createMany({ data: tables.order_statuses as never[] }),
    );
  } else {
    counts.order_statuses = 0;
  }

  if (tables.users.length) {
    await insert('users', () =>
      tx.user.createMany({ data: tables.users as never[] }),
    );
  } else {
    counts.users = 0;
  }

  if (tables.locations.length) {
    await insert('locations', () =>
      tx.location.createMany({ data: tables.locations as never[] }),
    );
  } else {
    counts.locations = 0;
  }

  if (tables.products.length) {
    await insert('products', () =>
      tx.product.createMany({ data: tables.products as never[] }),
    );
  } else {
    counts.products = 0;
  }

  if (tables.suppliers.length) {
    await insert('suppliers', () =>
      tx.supplier.createMany({ data: tables.suppliers as never[] }),
    );
  } else {
    counts.suppliers = 0;
  }

  if (tables.bank_accounts.length) {
    await insert('bank_accounts', () =>
      tx.bankAccount.createMany({ data: tables.bank_accounts as never[] }),
    );
  } else {
    counts.bank_accounts = 0;
  }

  if (tables.salaries.length) {
    await insert('salaries', () =>
      tx.salary.createMany({ data: tables.salaries as never[] }),
    );
  } else {
    counts.salaries = 0;
  }

  if (tables.employee_locations.length) {
    await insert('employee_locations', () =>
      tx.employeeLocation.createMany({
        data: tables.employee_locations as never[],
      }),
    );
  } else {
    counts.employee_locations = 0;
  }

  if (tables.customers.length) {
    await insert('customers', () =>
      tx.customer.createMany({ data: tables.customers as never[] }),
    );
  } else {
    counts.customers = 0;
  }

  if (tables.invoices.length) {
    await insert('invoices', () =>
      tx.invoice.createMany({ data: tables.invoices as never[] }),
    );
  } else {
    counts.invoices = 0;
  }

  if (tables.imports.length) {
    await insert('imports', () =>
      tx.import.createMany({ data: tables.imports as never[] }),
    );
  } else {
    counts.imports = 0;
  }

  if (tables.import_details.length) {
    await insert('import_details', () =>
      tx.importDetail.createMany({ data: tables.import_details as never[] }),
    );
  } else {
    counts.import_details = 0;
  }

  if (tables.activities.length) {
    await insert('activities', () =>
      tx.activity.createMany({ data: tables.activities as never[] }),
    );
  } else {
    counts.activities = 0;
  }

  if (tables.activity_details.length) {
    await insert('activity_details', () =>
      tx.activityDetail.createMany({ data: tables.activity_details as never[] }),
    );
  } else {
    counts.activity_details = 0;
  }

  if (tables.payments.length) {
    await insert('payments', () =>
      tx.payment.createMany({ data: tables.payments as never[] }),
    );
  } else {
    counts.payments = 0;
  }

  if (tables.refresh_tokens.length) {
    await insert('refresh_tokens', () =>
      tx.refreshToken.createMany({ data: tables.refresh_tokens as never[] }),
    );
  } else {
    counts.refresh_tokens = 0;
  }

  return counts;
}

async function exportAll(): Promise<BackupPayload> {
  const [
    order_statuses,
    users,
    locations,
    products,
    suppliers,
    bank_accounts,
    salaries,
    employee_locations,
    customers,
    invoices,
    imports,
    import_details,
    activities,
    activity_details,
    payments,
    refresh_tokens,
  ] = await Promise.all([
    prisma.orderStatus.findMany(),
    prisma.user.findMany(),
    prisma.location.findMany(),
    prisma.product.findMany(),
    prisma.supplier.findMany(),
    prisma.bankAccount.findMany(),
    prisma.salary.findMany(),
    prisma.employeeLocation.findMany(),
    prisma.customer.findMany(),
    prisma.invoice.findMany(),
    prisma.import.findMany(),
    prisma.importDetail.findMany(),
    prisma.activity.findMany(),
    prisma.activityDetail.findMany(),
    prisma.payment.findMany(),
    prisma.refreshToken.findMany(),
  ]);

  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    app: BACKUP_APP_ID,
    tables: {
      order_statuses: serializeRows(order_statuses as Record<string, unknown>[]),
      users: serializeRows(users as Record<string, unknown>[]),
      locations: serializeRows(locations as Record<string, unknown>[]),
      products: serializeRows(products as Record<string, unknown>[]),
      suppliers: serializeRows(suppliers as Record<string, unknown>[]),
      bank_accounts: serializeRows(bank_accounts as Record<string, unknown>[]),
      salaries: serializeRows(salaries as Record<string, unknown>[]),
      employee_locations: serializeRows(
        employee_locations as Record<string, unknown>[],
      ),
      customers: serializeRows(customers as Record<string, unknown>[]),
      invoices: serializeRows(invoices as Record<string, unknown>[]),
      imports: serializeRows(imports as Record<string, unknown>[]),
      import_details: serializeRows(import_details as Record<string, unknown>[]),
      activities: serializeRows(activities as Record<string, unknown>[]),
      activity_details: serializeRows(activity_details as Record<string, unknown>[]),
      payments: serializeRows(payments as Record<string, unknown>[]),
      refresh_tokens: serializeRows(refresh_tokens as Record<string, unknown>[]),
    },
  };
}

function buildBackupFilename(date = new Date()): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `backup_seller_system_${yyyy}_${mm}_${dd}.json`;
}

async function restoreAll(payload: unknown): Promise<{
  restoredAt: string;
  counts: Record<string, number>;
}> {
  const backup = assertBackupPayload(payload);
  const tables = normalizeTables(backup);

  const counts = await prisma.$transaction(async (tx) => {
    await clearAllTables(tx);
    return insertAllTables(tx, tables);
  });

  return {
    restoredAt: new Date().toISOString(),
    counts,
  };
}

export default {
  BACKUP_VERSION,
  BACKUP_APP_ID,
  exportAll,
  restoreAll,
  buildBackupFilename,
};
