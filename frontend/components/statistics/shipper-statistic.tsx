"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { 
  Truck, DollarSign, CheckCircle2, RefreshCw, 
  BarChart3, ShieldCheck, MapPin
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer, LineChart, Line
} from "recharts";

import { usersApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DashboardDateFilter } from "@/components/statistics/dashboard-date-filter";
import {
  createDefaultDashboardTimeFilter,
  dashboardTimeFilterToQuery,
  formatDashboardPeriodLabel,
  type DashboardTimeFilterState,
} from "@/lib/dashboard-date-filter";

interface ShipperStatisticProps {
  userId: number | string;
  userName?: string;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0
  }).format(value);
}

export function ShipperStatistic({ userId, userName }: ShipperStatisticProps) {
  const [overview, setOverview] = useState<any>(null);
  const [monthlyStats, setMonthlyStats] = useState<any>(null);
  const [locations, setLocations] = useState<any[]>([]);

  const [timeFilter, setTimeFilter] = useState<DashboardTimeFilterState>(createDefaultDashboardTimeFilter);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const dateQuery = useMemo(() => dashboardTimeFilterToQuery(timeFilter), [timeFilter]);

  const loadStats = useCallback(async () => {
    if (!userId || userId === "NaN") {
      setError("ID Shipper không hợp lệ.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const safeId = typeof userId === 'string' ? encodeURIComponent(userId) : userId;
      const monthParam =
        dateQuery.date || dateQuery.month === "all"
          ? undefined
          : Number(dateQuery.month);
      const yearParam = dateQuery.date
        ? undefined
        : Number(dateQuery.year ?? new Date().getFullYear());

      const [overviewData, monthlyData, locationsData] = await Promise.all([
        usersApi.getShipperOverviewStats(safeId, dateQuery),
        usersApi.getShipperMonthlyStats(
          safeId,
          monthParam,
          yearParam,
          dateQuery.date,
        ),
        usersApi.getLocationStats(safeId, dateQuery),
      ]);

      setOverview(overviewData);
      setMonthlyStats(monthlyData);
      setLocations(locationsData?.locations || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể tải dữ liệu vận đơn");
    } finally {
      setLoading(false);
    }
  }, [userId, dateQuery]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

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

  // Chuyển dịch dữ liệu phân tích tháng thành đồ thị đường xu hướng thu tiền COD
  const trendChartData = Array.isArray(monthlyStats) ? monthlyStats.map((item: any) => ({
    name: `Tháng ${item.month || item.period}`,
    "Giao thành công": item.successfulDeliveries || item.count || 0,
    "Tiền mặt COD": item.collectedCod || item.revenue || 0
  })) : [
    { name: "Hiện tại", "Giao thành công": overview?.completedTrips || 0, "Tiền mặt COD": overview?.totalCodCollected || 0 }
  ];

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold tracking-tight">
            Logistics & Delivery Snapshot {userName ? ` - ${userName}` : ""}
          </h3>
          <p className="text-sm text-muted-foreground">
            Quản lý hành trình giao hàng, kiểm soát tiền thu hộ (COD) vật lý cầm về từ các đại lý.
            <span className="ml-1 font-medium text-foreground">
              (Kỳ: {formatDashboardPeriodLabel(timeFilter)})
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <DashboardDateFilter value={timeFilter} onChange={setTimeFilter} />

          <Button variant="outline" size="sm" onClick={() => void loadStats()} className="h-9">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      {overview && (
        <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-3">
          <Card>
            <CardContent className="p-6 flex items-center justify-between space-y-0">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Tổng Chuyến Đi (Trips)</p>
                <div className="text-3xl font-bold">{overview.totalTrips || overview.totalActivities || 0}</div>
              </div>
              <Truck className="h-10 w-10 text-orange-500 bg-orange-50 p-2 rounded-xl" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 flex items-center justify-between space-y-0">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Giao Thành Công</p>
                <div className="text-3xl font-bold text-emerald-600">{overview.completedTrips || overview.successfulHandovers || 0}</div>
              </div>
              <CheckCircle2 className="h-10 w-10 text-emerald-500 bg-emerald-50 p-2 rounded-xl" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 flex items-center justify-between space-y-0">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Tổng COD Thực Thu</p>
                <div className="text-3xl font-bold text-indigo-600">{formatCurrency(overview.totalCodCollected || overview.collectedRevenue || 0)}</div>
              </div>
              <ShieldCheck className="h-10 w-10 text-indigo-500 bg-indigo-50 p-2 rounded-xl" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Analytics Graph Panel */}
      <div className="grid gap-6 md:grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-md font-bold">
              <BarChart3 className="h-5 w-5 text-indigo-600" /> Xu Hướng Thu Hộ Tiền Mặt (COD) & Vận Tải
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" fontSize={12} tickLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} id="left-axis" />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} orientation="right" id="right-axis" tickFormatter={(val) => `${val / 1000000}M`} />
                  <Tooltip formatter={(value, name) => [name === "Tiền mặt COD" ? formatCurrency(Number(value)) : value, name]} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                  <Line yAxisId="left-axis" type="monotone" dataKey="Giao thành công" stroke="#f97316" strokeWidth={2.5} activeDot={{ r: 6 }} />
                  <Line yAxisId="right-axis" type="monotone" dataKey="Tiền mặt COD" stroke="#4f46e5" strokeWidth={2.5} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Regional Table Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-md font-bold">
            <MapPin className="h-5 w-5 text-orange-500" /> Khu Vực Phụ Trách Giao Vận
          </CardTitle>
        </CardHeader>
        <CardContent>
          {locations.length === 0 ? (
            <p className="text-center py-6 text-sm text-muted-foreground">Không tìm thấy tuyến đường được bàn giao.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tỉnh / Thành phố</TableHead>
                  <TableHead className="text-center">Số Đại lý / Điểm giao</TableHead>
                  <TableHead className="text-right">Ước tính COD đã bàn giao</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locations.map((loc, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-semibold">{loc.province}</TableCell>
                    <TableCell className="text-center font-medium">{loc.activeCustomersCount}</TableCell>
                    <TableCell className="text-right text-indigo-600 font-bold">{formatCurrency(loc.revenueGenerated)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}