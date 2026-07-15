import { describe, expect, it } from 'vitest';

import { isAllowedAssistantTool } from './assistantAllowlist';

describe('assistantAllowlist', () => {
  it('allows live-data tools from the plan', () => {
    expect(isAllowedAssistantTool('get_sales_summary')).toBe(true);
    expect(isAllowedAssistantTool('get_customer_debt')).toBe(true);
  });

  it('blocks salary and bank tools', () => {
    expect(isAllowedAssistantTool('get_salaries')).toBe(false);
    expect(isAllowedAssistantTool('get_bank_accounts')).toBe(false);
    expect(isAllowedAssistantTool('export_backup')).toBe(false);
  });
});
