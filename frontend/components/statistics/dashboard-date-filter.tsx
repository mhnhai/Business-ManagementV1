"use client";

import { Calendar } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DASHBOARD_YEAR_OPTIONS,
  type DashboardTimeFilterState,
} from "@/lib/dashboard-date-filter";

type DashboardDateFilterProps = {
  value: DashboardTimeFilterState;
  onChange: (value: DashboardTimeFilterState) => void;
};

export function DashboardDateFilter({ value, onChange }: DashboardDateFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1.5 border rounded-md px-2.5 py-1.5 bg-background h-9 text-xs text-muted-foreground">
        <Calendar className="h-3.5 w-3.5" />
        <span className="font-medium hidden sm:inline">Kiểu lọc:</span>
        <Select
          value={value.mode}
          onValueChange={(mode) =>
            onChange({ ...value, mode: mode as DashboardTimeFilterState["mode"] })
          }
        >
          <SelectTrigger className="border-0 p-0 h-auto w-[96px] focus:ring-0 shadow-none text-foreground font-semibold">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="month">Theo tháng</SelectItem>
            <SelectItem value="day">Theo ngày</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {value.mode === "month" ? (
        <div className="flex items-center gap-1.5 border rounded-md px-2.5 py-1.5 bg-background h-9 text-xs text-muted-foreground">
          <span className="font-medium hidden sm:inline">Tháng:</span>
          <Select
            value={value.month}
            onValueChange={(month) => onChange({ ...value, month })}
          >
            <SelectTrigger className="border-0 p-0 h-auto w-[80px] focus:ring-0 shadow-none text-foreground font-semibold">
              <SelectValue placeholder="Tháng" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Cả năm</SelectItem>
              {Array.from({ length: 12 }, (_, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>
                  Tháng {i + 1}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <span className="text-muted-foreground/40">/</span>

          <Select
            value={value.year}
            onValueChange={(year) => onChange({ ...value, year })}
          >
            <SelectTrigger className="border-0 p-0 h-auto w-[55px] focus:ring-0 shadow-none text-foreground font-semibold">
              <SelectValue placeholder="Năm" />
            </SelectTrigger>
            <SelectContent>
              {DASHBOARD_YEAR_OPTIONS.map((year) => (
                <SelectItem key={year} value={year}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 border rounded-md px-2.5 py-1.5 bg-background h-9 text-xs text-muted-foreground">
          <span className="font-medium hidden sm:inline">Ngày:</span>
          <Input
            type="date"
            value={value.date}
            onChange={(e) => onChange({ ...value, date: e.target.value })}
            className="h-7 w-[140px] border-0 p-0 shadow-none text-foreground font-semibold focus-visible:ring-0"
          />
        </div>
      )}
    </div>
  );
}
