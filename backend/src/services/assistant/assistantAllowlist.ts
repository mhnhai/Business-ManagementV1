export const ALLOWED_ASSISTANT_TOOLS = [
  'get_sales_summary',
  'search_customers',
  'get_customer_debt',
  'get_product_stock',
  'list_recent_activities',
  'get_import_summary',
  'get_order_status_help',
] as const;

export type AllowedAssistantTool = (typeof ALLOWED_ASSISTANT_TOOLS)[number];

const ALLOWED = new Set<string>(ALLOWED_ASSISTANT_TOOLS);

export function isAllowedAssistantTool(name: string): boolean {
  return ALLOWED.has(name);
}
