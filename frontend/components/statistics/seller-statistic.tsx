"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { 
  Activity, TrendingUp, MapPin,
  RefreshCw, Percent, BarChart3, PieChart as PieIcon, 
  Users, AlertCircle
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";

import { usersApi } from "@/lib/api";
import type { SellerRevenueSeries } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DashboardDateFilter } from "@/components/statistics/dashboard-date-filter";
import {
  createDefaultDashboardTimeFilter,
  dashboardTimeFilterToQuery,
  formatDashboardPeriodLabel,
  type DashboardTimeFilterState,
} from "@/lib/dashboard-date-filter";

interface SellerStatisticProps {
  userId: number | string;
  userName?: string;
}

const PIE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

function formatCurrency(value: number) {
  return `${new Intl.NumberFormat("vi-VN").format(value)} đ`;
}

const extractArray = (data: any, expectedKey: string): any[] => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (data[expectedKey] && data[expectedKey][expectedKey] && Array.isArray(data[expectedKey][expectedKey])) {
    return data[expectedKey][expectedKey];
  }
  if (data[expectedKey] && Array.isArray(data[expectedKey])) {
    return data[expectedKey];
  }
  return [];
};

const CustomChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-background p-2.5 shadow-sm text-xs">
        <p className="font-bold text-muted-foreground mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color }} className="font-medium">
            {entry.name}: {typeof entry.value === "number" ? formatCurrency(entry.value) : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const formatYAxis = (val: number) => {
  if (val >= 1000000000) return `${(val / 1000000000).toFixed(1)} Tỷ`;
  if (val >= 1000000) return `${val / 1000000} Tr`;
  return val.toLocaleString("vi-VN");
};

export function SellerStatistic({ userId, userName }: SellerStatisticProps) {
  const [overview, setOverview] = useState<any>(null);
  const [revenueSeries, setRevenueSeries] = useState<SellerRevenueSeries | null>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [statusBreakdown, setStatusBreakdown] = useState<any[]>([]);
  const [debtors, setDebtors] = useState<any[]>([]);
  
  const [masterLocations, setMasterLocations] = useState<any[]>([]);
  const [availableProvinces, setAvailableProvinces] = useState<string[]>([]);
  const [availableWards, setAvailableWards] = useState<string[]>([]);

  const [timeFilter, setTimeFilter] = useState<DashboardTimeFilterState>(createDefaultDashboardTimeFilter);
  const [selectedProvince, setSelectedProvince] = useState<string>("all");
  const [selectedWard, setSelectedWard] = useState<string>("all");
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function initMasterFilters() {
      if (!userId || userId === "NaN") return;
      try {
        const safeId = typeof userId === 'string' ? encodeURIComponent(userId) : userId;
        const data = await usersApi.getLocationStats(safeId, {
          month: "all",
          year: timeFilter.year,
          province: "all",
          ward: "all",
        });
        const locArray = extractArray(data, 'locations');
        setMasterLocations(locArray);
        
        const provinces = Array.from(new Set(locArray.map((l: any) => l.province).filter(Boolean))) as string[];
        setAvailableProvinces(provinces);
      } catch (e) {
        console.error(e);
      }
    }
    void initMasterFilters();
  }, [userId, timeFilter.year]);

  const dateQuery = useMemo(() => dashboardTimeFilterToQuery(timeFilter), [timeFilter]);
  const showRevenueChart = timeFilter.mode === "month";
  const revenueChartTitle =
    timeFilter.month === "all"
      ? "Doanh số mang về theo tháng"
      : "Doanh số mang về theo ngày";

  useEffect(() => {
    if (masterLocations.length > 0) {
      const filteredWards = masterLocations
        .filter((l: any) => selectedProvince === "all" || l.province === selectedProvince)
        .map((l: any) => l.ward)
        .filter(Boolean);
      
      setAvailableWards(Array.from(new Set(filteredWards)) as string[]);
    } else {
      setAvailableWards([]);
    }
  }, [masterLocations, selectedProvince]);

  const loadStats = useCallback(async () => {
    if (!userId || userId === "NaN") {
      setError("ID người dùng không hợp lệ.");
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const safeId = typeof userId === 'string' ? encodeURIComponent(userId) : userId;
      const params = {
        ...dateQuery,
        province: selectedProvince,
        ward: selectedWard,
      };

      const requests: Promise<unknown>[] = [
        usersApi.getSellerOverviewStats(safeId, params),
        usersApi.getLocationStats(safeId, params),
        usersApi.getStatusBreakdown(safeId, params),
        usersApi.getTopDebtors(safeId, { province: selectedProvince, ward: selectedWard }),
      ];

      if (timeFilter.mode === "month") {
        requests.push(
          usersApi.getSellerRevenueSeries(safeId, {
            month: timeFilter.month,
            year: timeFilter.year,
            province: selectedProvince,
            ward: selectedWard,
          }),
        );
      }

      const results = await Promise.all(requests);
      const [
        overviewData,
        locationsData,
        statusData,
        debtorsData,
        revenueSeriesData,
      ] = results;

      setOverview(overviewData);
      setLocations(extractArray(locationsData, 'locations'));
      setStatusBreakdown(extractArray(statusData, 'breakdown'));
      setDebtors(extractArray(debtorsData, 'debtors'));
      setRevenueSeries(
        timeFilter.mode === "month"
          ? (revenueSeriesData as SellerRevenueSeries)
          : null,
      );

    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể tải dữ liệu báo cáo");
    } finally {
      setLoading(false);
    }
  }, [userId, dateQuery, selectedProvince, selectedWard, timeFilter.mode, timeFilter.month, timeFilter.year]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const handleProvinceChange = (province: string) => {
    setSelectedProvince(province);
    setSelectedWard("all"); 
  };

  // BIẾN ĐỔI DỮ LIỆU BIỂU ĐỒ: Phân tách rõ ràng 3 cột để tránh chồng lấn logic
  const locationChartData = locations.reduce((acc: any[], loc: any) => {
    const labelName = loc.ward 
      ? `${loc.ward} - ${loc.province || ""}`.replace(/ - $/, "")
      : (loc.province || "Địa bàn chung");
      
    const totalSales = Number(loc.revenueGenerated) || 0; // Tổng giá trị đơn hàng phát sinh
    const realPaid = Number(loc.collectedAmount) || 0;    // Số tiền mặt thực tế đã thu về
    const realDebt = Number(loc.outstandingDebt) || 0;     // Tiền khách còn nợ lại

    const existingGroup = acc.find(item => item.name === labelName);
    if (existingGroup) {
      existingGroup["Doanh số phát sinh"] += totalSales;
      existingGroup["Tiền thực thu"] += realPaid;
      existingGroup["Tiền khách đang nợ"] += realDebt;
    } else {
      acc.push({
        name: labelName,
        "Doanh số phát sinh": totalSales,
        "Tiền thực thu": realPaid,
        "Tiền khách đang nợ": realDebt
      });
    }
    return acc;
  }, []);

  const statusOrder = ["draft", "pending", "confirmed", "processing", "shipping", "completed", "cancelled"];
  const statusLabelMap: Record<string, string> = {
    draft: "1. Đang báo giá",
    pending: "2. Chờ duyệt",
    confirmed: "3. Khách đã chốt",
    processing: "4. Lên hợp đồng",
    shipping: "5. Đang bàn giao",
    completed: "6. Hoàn thành",
    cancelled: "7. Đã hủy"
  };

  const funnelChartData = statusBreakdown
    .map(sb => {
      const rawStatus = sb.statusName || sb.status || "Chưa rõ";
      return {
        rawStatus,
        name: statusLabelMap[rawStatus] || rawStatus,
        value: Number(sb.count) || 0
      };
    })
    .sort((a, b) => statusOrder.indexOf(a.rawStatus) - statusOrder.indexOf(b.rawStatus));

  const revenueSeriesTotals = useMemo(() => {
    if (!revenueSeries?.series.length) {
      return { revenue: 0, cost: 0, profit: 0 };
    }
    return revenueSeries.series.reduce(
      (acc, point) => ({
        revenue: acc.revenue + point.revenue,
        cost: acc.cost + point.cost,
        profit: acc.profit + point.profit,
      }),
      { revenue: 0, cost: 0, profit: 0 },
    );
  }, [revenueSeries]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive font-medium mb-4">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tiêu đề & Bộ lọc */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold tracking-tight">
            Sổ Theo Dõi Bán Hàng {userName ? ` - ${userName}` : ""}
          </h3>
          <p className="text-sm text-muted-foreground">
            Xem danh sách hợp đồng mang về, tiến độ dòng tiền thu hồi và quản lý rủi ro công nợ khách hàng.
            <span className="ml-1 font-medium text-foreground">
              (Kỳ: {formatDashboardPeriodLabel(timeFilter)})
            </span>
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 border rounded-md px-2.5 py-1.5 bg-background h-9 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            <span className="font-medium hidden sm:inline">Tỉnh thành:</span>
            <Select value={selectedProvince} onValueChange={handleProvinceChange}>
              <SelectTrigger className="border-0 p-0 h-auto w-[110px] focus:ring-0 shadow-none text-foreground font-semibold">
                <SelectValue placeholder="Tất cả tỉnh" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả tỉnh</SelectItem>
                {availableProvinces.map((prov) => (
                  <SelectItem key={prov} value={prov}>{prov}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1.5 border rounded-md px-2.5 py-1.5 bg-background h-9 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 text-indigo-500" />
            <span className="font-medium hidden sm:inline">Xã/Phường:</span>
            <Select value={selectedWard} onValueChange={setSelectedWard}>
              <SelectTrigger className="border-0 p-0 h-auto w-[120px] focus:ring-0 shadow-none text-foreground font-semibold">
                <SelectValue placeholder="Tất cả xã" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả xã</SelectItem>
                {availableWards.map((ward) => (
                  <SelectItem key={ward} value={ward}>{ward}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DashboardDateFilter value={timeFilter} onChange={setTimeFilter} />

          <Button variant="outline" size="sm" onClick={() => void loadStats()} className="h-9 w-9 p-0">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Thẻ thống kê tổng quan */}
      {overview && (
        <div className="space-y-4">
          <div
            className={
              showRevenueChart
                ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                : "grid gap-4 md:grid-cols-2 lg:grid-cols-4"
            }
          >
            <Card>
              <CardContent className="p-6 flex items-center justify-between space-y-0">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Tổng số hợp đồng</p>
                  <div className="text-2xl font-bold">{overview.totalActivities || 0}</div>
                </div>
                <Activity className="h-8 w-8 text-blue-500 bg-blue-50 p-1.5 rounded-lg shrink-0" />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 flex items-center justify-between space-y-0">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Tỷ lệ chốt thành công</p>
                  <div className="text-2xl font-bold">{overview.conversionRate || 0}%</div>
                </div>
                <Percent className="h-8 w-8 text-purple-500 bg-purple-50 p-1.5 rounded-lg shrink-0" />
              </CardContent>
            </Card>

            {!showRevenueChart && (
              <Card>
                <CardContent className="p-6 flex items-center justify-between space-y-0">
                  <div className="space-y-1 w-full">
                    <p className="text-sm font-medium text-muted-foreground">Doanh số mang về</p>
                    <div className="text-2xl font-bold text-blue-600">
                      {formatCurrency(overview.grossRevenue || 0)}
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 pt-1 text-[11px]">
                      <span>
                        <span className="text-muted-foreground">Chi phí: </span>
                        <span className="font-semibold text-orange-600">
                          {formatCurrency(overview.totalCost || 0)}
                        </span>
                      </span>
                      <span>
                        <span className="text-muted-foreground">Lợi nhuận: </span>
                        <span className="font-semibold text-emerald-600">
                          {formatCurrency(overview.totalProfit || 0)}
                        </span>
                      </span>
                    </div>
                  </div>
                  <TrendingUp className="h-8 w-8 text-blue-500 bg-blue-50 p-1.5 rounded-lg shrink-0" />
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="p-6 flex items-center justify-between space-y-0">
                <div className="space-y-1 w-full">
                  <p className="text-sm font-medium text-muted-foreground">Tài chính kỳ bộ lọc</p>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[11px] text-muted-foreground font-medium">Nợ phát sinh:</span>
                    <span className="text-xl font-bold text-red-600">
                      {formatCurrency(overview.outstandingDebt || 0)}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-1.5 border-t pt-1 mt-1 border-dashed">
                    <span className="text-[10px] text-muted-foreground">Ví dư hiện tại:</span>
                    <span className="text-xs font-semibold text-emerald-600">
                      {formatCurrency(overview.currentBalance || 0)}
                    </span>
                  </div>
                </div>
                <AlertCircle className="h-8 w-8 text-amber-600 bg-amber-50 p-1.5 rounded-lg shrink-0" />
              </CardContent>
            </Card>
          </div>

          {showRevenueChart && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-bold">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  {revenueChartTitle}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Tổng doanh thu kỳ: {formatCurrency(revenueSeriesTotals.revenue || overview.grossRevenue || 0)}
                </p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  <span>
                    <span className="text-muted-foreground">Tổng chi phí: </span>
                    <span className="font-semibold text-orange-600">
                      {formatCurrency(revenueSeriesTotals.cost)}
                    </span>
                  </span>
                  <span>
                    <span className="text-muted-foreground">Tổng lợi nhuận: </span>
                    <span className="font-semibold text-emerald-600">
                      {formatCurrency(revenueSeriesTotals.profit)}
                    </span>
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                {!revenueSeries?.series.length ? (
                  <p className="text-center py-10 text-sm text-muted-foreground">
                    Chưa có dữ liệu doanh số trong kỳ.
                  </p>
                ) : (
                  <div className="h-[260px] w-full">
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={revenueSeries.series} barCategoryGap="20%">
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="label" fontSize={10} tickLine={false} />
                        <YAxis
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={formatYAxis}
                        />
                        <Tooltip content={<CustomChartTooltip />} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: "11px" }} />
                        <Bar
                          dataKey="cost"
                          name="Chi phí"
                          stackId="revenue"
                          fill="#f97316"
                        />
                        <Bar
                          dataKey="profit"
                          name="Lợi nhuận"
                          stackId="revenue"
                          fill="#10b981"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Biểu Đồ */}
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-bold">
              <BarChart3 className="h-5 w-5 text-indigo-600" /> Địa bàn hoạt động & Tình hình công nợ
            </CardTitle>
          </CardHeader>
          <CardContent>
            {locations.length === 0 ? (
              <p className="text-center py-16 text-sm text-muted-foreground">Chưa có dữ liệu vùng miền.</p>
            ) : (
              <div className="h-[300px] min-h-[300px] w-full pt-4">
                <ResponsiveContainer width="100%" height={300}>
                  {/* Cấu trúc 3 cột giải quyết hoàn toàn mâu thuẫn số liệu */}
                  <BarChart data={locationChartData} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" fontSize={10} tickLine={false} />
                    <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={formatYAxis} />
                    <Tooltip content={<CustomChartTooltip />} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="Doanh số phát sinh" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Tiền thực thu" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Tiền khách đang nợ" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-bold">
              <PieIcon className="h-5 w-5 text-blue-600" /> Trạng thái xử lý các đơn hàng
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statusBreakdown.length === 0 ? (
              <p className="text-center py-16 text-sm text-muted-foreground">Chưa có dữ liệu trạng thái.</p>
            ) : (
              <div className="h-[300px] min-h-[300px] w-full flex flex-col sm:flex-row items-center justify-center gap-4">
                <div className="w-full sm:w-[50%] min-h-[240px]">
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie data={funnelChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={4} dataKey="value">
                        {funnelChartData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-2 w-full sm:w-[50%] text-xs">
                  {funnelChartData.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                      <span className="font-medium text-muted-foreground truncate max-w-[120px]">{item.name}</span>
                      <span className="ml-auto font-bold">{item.value} đơn</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bảng Dữ Liệu Chi Tiết */}
      <div className="grid gap-6 md:grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-bold">
              <Users className="h-5 w-5 text-amber-500" /> Theo dõi số dư & Công nợ Khách hàng
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Công nợ tích lũy theo toàn bộ đơn hàng (không giới hạn theo kỳ lọc).
            </p>
          </CardHeader>
          <CardContent>
            {debtors.length === 0 ? (
              <p className="text-center py-6 text-sm text-muted-foreground">Không có biến động số dư khách hàng nào.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tên khách hàng / Công ty</TableHead>
                    <TableHead>Số điện thoại</TableHead>
                    <TableHead className="text-right">Tình trạng tài khoản</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {debtors.map((debtor, idx) => {
                    const realDebt = Number(debtor.outstandingDebt ?? debtor.totalDebt ?? 0);
                    const realBalance = Number(debtor.currentBalance) || 0;

                    return (
                      <TableRow key={idx}>
                        <TableCell className="font-semibold">{debtor.customerName || debtor.companyName}</TableCell>
                        <TableCell>{debtor.phoneNumber || "Không có số"}</TableCell>
                        <TableCell className="text-right space-y-0.5">
                          {realDebt > 0 ? (
                            <div className="text-xs text-red-600 font-bold">
                              Nợ tích lũy: {formatCurrency(realDebt)}
                            </div>
                          ) : (
                            <div className="text-xs text-slate-400 italic">Không nợ</div>
                          )}
                          <div className="text-[10px] text-muted-foreground font-medium">
                            Quỹ dư hiện tại: {formatCurrency(realBalance)}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}