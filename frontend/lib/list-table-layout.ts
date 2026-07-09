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
  representative: "w-[108px]",
  location: "w-[124px]",
  actionsWide: "w-[152px]",
} as const;

/** Căn lề tiêu đề cột — khớp với `listCell` tương ứng. */
export const listHead = {
  center: "text-center",
  right: "text-right",
} as const;

export const listCell = {
  truncate: "max-w-0 truncate",
  money: "text-right whitespace-nowrap tabular-nums",
  number: "text-right whitespace-nowrap tabular-nums",
  actions: "text-right whitespace-nowrap",
  actionsCenter: "text-center whitespace-nowrap",
  status: "text-center whitespace-nowrap",
  center: "text-center whitespace-nowrap",
  nowrap: "whitespace-nowrap",
} as const;
