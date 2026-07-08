import type {
  Activity,
  ActivityDetail,
  Customer,
  EmployeeLocation,
  Import,
  ImportDetail,
  Invoice,
  Location,
  OrderStatus,
  Payment,
  Product,
  Supplier,
  User,
} from '@prisma/client';

import type { PaymentStatusCode } from '@src/common/constants/payment-status';
import type { IActivity, IActivityWrite } from '@src/models/Activity.model';
import type { IActivityDetail, IActivityDetailView } from '@src/models/ActivityDetail.model';
import type { ICustomer } from '@src/models/Customer.model';
import type {
  IEmployeeLocation,
  IEmployeeLocationUserSummary,
  IEmployeeLocationView,
} from '@src/models/EmployeeLocation.model';
import type { IImport, IImportWrite } from '@src/models/Import.model';
import type { IImportDetail, IImportDetailView } from '@src/models/ImportDetail.model';
import type { IInvoice } from '@src/models/Invoice.model';
import type { IPayment } from '@src/models/Payment.model';
import type { ILocation } from '@src/models/Location.model';
import type { IProduct } from '@src/models/Product.model';
import type { ISupplier } from '@src/models/Supplier.model';
import type { IUser } from '@src/models/User.model';

/** Domain shape for order_statuses (camelCase). */
export interface IOrderStatus {
  statusCode: string;
  statusName: string;
  sortOrder: number;
  isTerminal: boolean;
}

/******************************************************************************
  Prisma + DB (snake_case, e.g. created_at) → Domain/API (camelCase, Entity.id)
******************************************************************************/

export function toUser(row: User): IUser {
  return {
    id: row.user_id,
    username: row.username,
    password: row.password,
    role: row.role,
    fullName: row.full_name,
    department: row.department,
    phoneNumber: row.phone_number,
    email: row.email,
    isActivated: row.is_activated,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export function toProduct(row: Product): IProduct {
  return {
    id: row.product_id,
    productName: row.product_name,
    unitPrice: Number(row.unit_price),
    stockQuantity: row.stock_quantity,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toLocation(row: Location): ILocation {
  return {
    id: row.location_id,
    province: row.province,
    ward: row.ward,
    wardCode: row.ward_code,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

type EmployeeLocationWithRelations = EmployeeLocation & {
  location: Location;
  user?: Pick<User, 'user_id' | 'username' | 'full_name' | 'role' | 'department'>;
};

export function toEmployeeLocation(row: EmployeeLocation): IEmployeeLocation {
  return {
    userId: row.user_id,
    locationId: row.location_id,
    createdAt: row.created_at,
  };
}

function toEmployeeLocationUserSummary(
  row: Pick<User, 'user_id' | 'username' | 'full_name' | 'role' | 'department'>,
): IEmployeeLocationUserSummary {
  return {
    id: row.user_id,
    username: row.username,
    fullName: row.full_name,
    role: row.role,
    department: row.department,
  };
}

export function toEmployeeLocationView(
  row: EmployeeLocationWithRelations,
): IEmployeeLocationView {
  return {
    ...toEmployeeLocation(row),
    location: toLocation(row.location),
    user: row.user ? toEmployeeLocationUserSummary(row.user) : undefined,
  };
}

export function toCustomer(row: Customer): ICustomer {
  return {
    id: row.customer_id,
    locationId: row.location_id,
    companyName: row.company_name,
    businessType: row.business_type,
    representativeName: row.representative_name,
    position: row.position,
    phoneNumber: row.phone_number,
    currentBalance: Number(row.current_balance),
    
    lat: row.lat,
    lng: row.lng,
    isApproved: row.is_approved,
    approvedAt: row.approved_at,
    
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toInvoice(row: Invoice): IInvoice {
  return {
    id: row.invoice_id,
    totalAmount: Number(row.total_amount),
    date: row.date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toPayment(row: Payment): IPayment {
  return {
    id: row.payment_id,
    activityId: row.activity_id,
    paidAmount: Number(row.paid_amount),
    paymentDate: row.payment_date,
    method: row.method,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toActivity(row: Activity): IActivity {
  return {
    id: row.activity_id,
    userId: row.user_id,
    customerId: row.customer_id,
    invoiceId: row.invoice_id,
    status: row.status,
    paymentStatus: row.payment_status,
    activityDate: row.activity_date,
    deliveryDate: row.delivery_date,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toOrderStatus(row: OrderStatus): IOrderStatus {
  return {
    statusCode: row.status_code,
    statusName: row.status_name,
    sortOrder: row.sort_order,
    isTerminal: row.is_terminal,
  };
}

type ActivityDetailWithProduct = ActivityDetail & {
  product: Product;
};

export function toActivityDetailView(
  row: ActivityDetailWithProduct,
): IActivityDetailView {
  const salePrice = Number(row.sale_price);
  return {
    activityId: row.activity_id,
    productId: row.product_id,
    quantity: row.quantity,
    salePrice,
    productName: row.product.product_name,
    unitPrice: Number(row.product.unit_price),
    lineTotal: salePrice * row.quantity,
  };
}

/******************************************************************************
  Domain (camelCase) → Prisma write payloads (snake_case)
******************************************************************************/

export function productToPrismaData(product: Pick<IProduct, 'productName' | 'unitPrice' | 'stockQuantity'>) {
  return {
    product_name: product.productName,
    unit_price: product.unitPrice,
    stock_quantity: product.stockQuantity,
  };
}

export function locationToPrismaData(location: Pick<ILocation, 'province' | 'ward' | 'wardCode'>) {
  return {
    province: location.province,
    ward: location.ward,
    ward_code: location.wardCode,
  };
}

export function customerToPrismaData(
  customer: Pick<
    ICustomer,
    | 'locationId'
    | 'companyName'
    | 'businessType'
    | 'representativeName'
    | 'position'
    | 'phoneNumber'
    | 'currentBalance'
    | 'lat'
    | 'lng'
    | 'isApproved'
    | 'approvedAt'
  >,
) {
  return {
    location_id: customer.locationId,
    company_name: customer.companyName,
    business_type: customer.businessType,
    representative_name: customer.representativeName,
    position: customer.position,
    phone_number: customer.phoneNumber,
    current_balance: customer.currentBalance,
  
    lat: customer.lat ?? null,
    lng: customer.lng ?? null,

    is_approved: customer.isApproved,
    approved_at: customer.approvedAt ? new Date(customer.approvedAt) : null,
  };
}

export function invoiceToPrismaData(invoice: Pick<IInvoice, 'totalAmount' | 'date'>) {
  return {
    total_amount: invoice.totalAmount,
    date: invoice.date,
  };
}

export function paymentToPrismaData(
  payment: Pick<IPayment, 'activityId' | 'paidAmount' | 'paymentDate' | 'method'>,
) {
  return {
    activity_id: payment.activityId,
    paid_amount: payment.paidAmount,
    payment_date: payment.paymentDate,
    method: payment.method,
  };
}

export function activityWriteToPrismaData(input: IActivityWrite) {
  return {
    user_id: input.userId,
    customer_id: input.customerId,
    content: input.content,
  };
}

export function activityDetailToPrismaData(detail: IActivityDetail) {
  return {
    activity_id: detail.activityId,
    product_id: detail.productId,
    quantity: detail.quantity,
    sale_price: detail.salePrice,
  };
}

export function toSupplier(row: Supplier): ISupplier {
  return {
    id: row.supplier_id,
    supplierName: row.supplier_name,
    businessType: row.business_type,
    address: row.address,
    phoneNumber: row.phone_number,
    email: row.email,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function supplierToPrismaData(
  supplier: Pick<
    ISupplier,
    'supplierName' | 'businessType' | 'address' | 'phoneNumber' | 'email'
  >,
) {
  return {
    supplier_name: supplier.supplierName,
    business_type: supplier.businessType,
    address: supplier.address,
    phone_number: supplier.phoneNumber,
    email: supplier.email,
  };
}

export function toImport(row: Import): IImport {
  return {
    id: row.import_id,
    supplierId: row.supplier_id,
    importDate: row.import_date,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function importWriteToPrismaData(input: IImportWrite) {
  return {
    supplier_id: input.supplierId,
    content: input.content,
  };
}

type ImportDetailWithProduct = ImportDetail & { product: Product };

export function toImportDetailView(
  row: ImportDetailWithProduct,
): IImportDetailView {
  const importPrice = Number(row.import_price);
  return {
    importId: row.import_id,
    productId: row.product_id,
    quantity: row.quantity,
    importPrice,
    productName: row.product.product_name,
    unitPrice: Number(row.product.unit_price),
    lineTotal: importPrice * row.quantity,
  };
}

export function importDetailToPrismaData(detail: IImportDetail) {
  return {
    import_id: detail.importId,
    product_id: detail.productId,
    quantity: detail.quantity,
    import_price: detail.importPrice,
  };
}