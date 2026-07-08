export type DashboardTimeFilterMode = "month" | "day";

export type DashboardTimeFilterState = {
  mode: DashboardTimeFilterMode;
  month: string;
  year: string;
  date: string;
};

export type DashboardStatsDateQuery = {
  month?: string;
  year?: string;
  date?: string;
};

const currentYear = new Date().getFullYear();

export const DASHBOARD_YEAR_OPTIONS = [
  String(currentYear - 1),
  String(currentYear),
  String(currentYear + 1),
];

function localDateInputValue(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function createDefaultDashboardTimeFilter(): DashboardTimeFilterState {
  const now = new Date();
  return {
    mode: "month",
    month: String(now.getMonth() + 1),
    year: String(now.getFullYear()),
    date: localDateInputValue(now),
  };
}

export function dashboardTimeFilterToQuery(
  state: DashboardTimeFilterState,
): DashboardStatsDateQuery {
  if (state.mode === "day" && state.date) {
    return { date: state.date };
  }

  return {
    month: state.month,
    year: state.year,
  };
}

export function formatDashboardPeriodLabel(state: DashboardTimeFilterState) {
  if (state.mode === "day" && state.date) {
    const [y, m, d] = state.date.split("-");
    return `ngày ${d}/${m}/${y}`;
  }
  if (state.month === "all") {
    return `năm ${state.year}`;
  }
  return `tháng ${state.month}/${state.year}`;
}
