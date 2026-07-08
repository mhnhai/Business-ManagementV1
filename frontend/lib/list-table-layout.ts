/** Độ rộng cột cố định — dùng với Table `table-fixed` trên mọi module danh sách. */
export const listCol = {
  id: "w-[72px]",
  actions: "w-[112px]",
  date: "w-[140px]",
  datetime: "w-[158px]",
  money: "w-[108px]",
  status: "w-[118px]",
  payment: "w-[118px]",
  phone: "w-[104px]",
  invoice: "w-[84px]",
  number: "w-[80px]",
  role: "w-[100px]",
  email: "w-[168px]",
  type: "w-[120px]",
  coords: "w-[128px]",
  balance: "w-[108px]",
  name: "w-[180px]",
} as const;

export const listCell = {
  truncate: "max-w-0 truncate",
  money: "text-right whitespace-nowrap tabular-nums",
  number: "text-right whitespace-nowrap tabular-nums",
  actions: "text-right whitespace-nowrap",
  nowrap: "whitespace-nowrap",
} as const;
