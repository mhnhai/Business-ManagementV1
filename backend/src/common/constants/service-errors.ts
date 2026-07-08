/** Auth & user */
export const AuthErrors = {
  USER_NOT_FOUND: 'User not found',
  EMPLOYEE_NOT_FOUND: 'Employee not found',
  INVALID_CREDENTIALS: 'Invalid username or password',
} as const;

/** Activity / order header */
export const ActivityErrors = {
  ACTIVITY_NOT_FOUND: 'Activity not found',
  USER_NOT_FOUND: 'User not found',
  CUSTOMER_NOT_FOUND: 'Customer not found',
  INVALID_STATUS: 'Invalid order status',
  ORDER_NOT_DRAFT: 'Order can only be edited in draft status',
  ORDER_EMPTY: 'Order must have at least one product line',
  NO_NEXT_STATUS: 'No next status available',
  STATUS_IS_TERMINAL: 'Order is already in a terminal status',
  MUST_CONFIRM_FIRST: 'Confirm the order before advancing status',
} as const;

/** Activity order lines */
export const ActivityDetailErrors = {
  ACTIVITY_NOT_FOUND: 'Activity not found',
  PRODUCT_NOT_FOUND: 'Product not found',
  DETAIL_NOT_FOUND: 'Activity detail not found',
  DETAIL_ALREADY_EXISTS: 'Product already exists in this activity order',
  INVALID_QUANTITY: 'Quantity must be greater than 0',
  ORDER_NOT_DRAFT: 'Order lines can only be changed in draft status',
} as const;

/** Activity stock validation / deduction */
export const ActivityStockErrors = {
  NO_ORDER_LINES: 'Order has no product lines',
  PRODUCT_NOT_FOUND: 'Product not found',
  INSUFFICIENT_STOCK_CONFIRM: 'Insufficient stock to confirm this order',
  INSUFFICIENT_STOCK_COMPLETE: 'Insufficient stock to complete this order',
} as const;

/** Payments */
export const PaymentErrors = {
  ACTIVITY_NOT_FOUND: 'Activity not found',
  PAYMENT_NOT_FOUND: 'Payment not found',
  NO_INVOICE: 'Activity has no invoice yet',
  NOT_PROCESSING: 'Order is not in processing status',
  PAYMENTS_DEFERRED:
    'Payments are only saved when completing the order. Use advance to completed with pending payments.',
  INVALID_AMOUNT: 'Payment amount must be greater than zero',
  CUSTOMER_NOT_FOUND: 'Customer not found',
} as const;

/** Customers */
export const CustomerErrors = {
  CUSTOMER_NOT_FOUND: 'Customer not found',
  LOCATION_NOT_FOUND: 'Location not found',
  CUSTOMER_HAS_ACTIVITIES: 'Cannot delete customer that has activities',
  CUSTOMER_OUTSIDE_TERRITORY: 'Customer is outside your assigned territory',
  INVALID_AMOUNT: 'Payment amount must be greater than zero',
  INVALID_METHOD: 'Payment method is required',
} as const;

/** Products */
export const ProductErrors = {
  PRODUCT_NOT_FOUND: 'Product not found',
} as const;

/** Invoices */
export const InvoiceErrors = {
  INVOICE_NOT_FOUND: 'Invoice not found',
  INVOICE_LINKED_TO_ACTIVITY: 'Cannot delete invoice linked to an activity',
} as const;

/** Locations */
export const LocationErrors = {
  LOCATION_NOT_FOUND: 'Location not found',
  LOCATION_IN_USE: 'Cannot delete location that has customers',
  LOCATION_ASSIGNED: 'Cannot delete location assigned to an employee',
  ONLY_CAN_THO: 'Only locations in Thành phố Cần Thơ are allowed',
} as const;

/** Employee zone assignments */
export const EmployeeLocationErrors = {
  USER_NOT_FOUND: 'User not found',
  LOCATION_NOT_FOUND: 'Location not found',
  ASSIGNMENT_NOT_FOUND: 'Assignment not found',
  LOCATION_ALREADY_ASSIGNED: 'Location is already assigned to another employee',
  DUPLICATE_LOCATION_IDS: 'Duplicate location ids in request',
} as const;

/** Suppliers */
export const SupplierErrors = {
  SUPPLIER_NOT_FOUND: 'Supplier not found',
  SUPPLIER_HAS_IMPORTS: 'Cannot delete supplier that has imports',
} as const;

/** Import receipts */
export const ImportErrors = {
  IMPORT_NOT_FOUND: 'Import not found',
  SUPPLIER_NOT_FOUND: 'Supplier not found',
  HAS_DETAILS: 'Cannot delete import that has detail lines',
} as const;

/** Import receipt lines */
export const ImportDetailErrors = {
  IMPORT_NOT_FOUND: 'Import not found',
  PRODUCT_NOT_FOUND: 'Product not found',
  DETAIL_NOT_FOUND: 'Import detail not found',
  DETAIL_ALREADY_EXISTS: 'Product already exists in this import',
  INVALID_QUANTITY: 'Quantity must be greater than 0',
  INVALID_PRICE: 'Import price must be greater than zero',
  INSUFFICIENT_STOCK: 'Insufficient stock to remove this quantity',
} as const;

export const BankAccountErrors = {
  BANK_ACCOUNT_NOT_FOUND: "Bank account not found"
}