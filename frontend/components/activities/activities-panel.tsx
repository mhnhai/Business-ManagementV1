"use client";



import { useCallback, useEffect, useMemo, useState } from "react";

import { Eye, FileDown, Plus, Printer, RefreshCw, Trash2, X } from "lucide-react";

import { ActivityDetailDialog } from "@/components/activities/activity-detail-dialog";

import { activitiesApi, activityDetailsApi, lookupApi, orderStatusesApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  buildSalesInvoicePrintData,
  printSalesInvoice,
} from "@/lib/print-sales-invoice";

import type { Activity, Customer, OrderStatus, User } from "@/lib/types";

import { Badge } from "@/components/ui/badge";

import { Button } from "@/components/ui/button";

import { Card, CardContent, CardHeader } from "@/components/ui/card";

import { Input } from "@/components/ui/input";

import { ListSearchBar } from "@/components/ui/list-search-bar";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { TablePagination } from "@/components/ui/table-pagination";
import { ListTableShell } from "@/components/ui/list-table-shell";

import { usePagination } from "@/hooks/use-pagination";

import { listCol, listCell } from "@/lib/list-table-layout";
import { matchesAnySearchField } from "@/lib/list-search";



function formatDate(value: string) {

  return new Date(value).toLocaleString("vi-VN");

}

function formatMoney(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}



function defaultFromDate() {

  const now = new Date();

  const month = String(now.getMonth() + 1).padStart(2, "0");

  return `${now.getFullYear()}-${month}-01`;

}



function defaultToDate() {

  return new Date().toISOString().slice(0, 10);

}



function activityDateKey(value: string) {

  const d = new Date(value);

  const month = String(d.getMonth() + 1).padStart(2, "0");

  const day = String(d.getDate()).padStart(2, "0");

  return `${d.getFullYear()}-${month}-${day}`;

}



function matchesDateFilter(
  activityDate: string,
  from: string,
  to: string,
) {

  if (!from && !to) return true;

  const key = activityDateKey(activityDate);

  if (from && key < from) return false;

  if (to && key > to) return false;

  return true;

}



function matchesDebtFilter(
  activity: Activity,
  filterDebt: "all" | "debt" | "paid",
) {
  if (filterDebt === "all") return true;
  if (!activity.invoiceId) return false;
  const remaining = activity.remaining ?? 0;
  if (filterDebt === "debt") return remaining > 0;
  return remaining <= 0;
}

export function ActivitiesPanel() {
  const { user, isAdmin } = useAuth();

  const [activities, setActivities] = useState<Activity[]>([]);

  const [users, setUsers] = useState<User[]>([]);

  const [customers, setCustomers] = useState<Customer[]>([]);

  const [statusMap, setStatusMap] = useState<Record<string, string>>({});

  const [orderStatuses, setOrderStatuses] = useState<OrderStatus[]>([]);

  const [filterStatus, setFilterStatus] = useState("all");

  const [filterDebt, setFilterDebt] = useState<"all" | "debt" | "paid">("all");

  const [filterFrom, setFilterFrom] = useState("");

  const [filterTo, setFilterTo] = useState("");

  const [searchQuery, setSearchQuery] = useState("");

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);

  const [createMode, setCreateMode] = useState(false);

  const [selectedId, setSelectedId] = useState<number | null>(null);

  const [exportFrom, setExportFrom] = useState(defaultFromDate);

  const [exportTo, setExportTo] = useState(defaultToDate);

  const [exporting, setExporting] = useState(false);
  const [printingId, setPrintingId] = useState<number | null>(null);

  const userMap = useMemo(
    () => Object.fromEntries(users.map((u) => [u.id, u.fullName])),
    [users],
  );

  const customerMap = useMemo(
    () => Object.fromEntries(customers.map((c) => [c.id, c.companyName])),
    [customers],
  );

  const customerById = useMemo(
    () => Object.fromEntries(customers.map((c) => [c.id, c])),
    [customers],
  );

  const filteredActivities = useMemo(
    () =>
      activities.filter((activity) => {
        const statusMatch =
          filterStatus === "all" || activity.status === filterStatus;
        const dateMatch = matchesDateFilter(
          activity.activityDate,
          filterFrom,
          filterTo,
        );
        const debtMatch = matchesDebtFilter(activity, filterDebt);
        if (!statusMatch || !dateMatch || !debtMatch) return false;

        return matchesAnySearchField(
          [
            activity.id,
            customerMap[activity.customerId],
            activity.customerId,
            userMap[activity.userId],
            activity.userId,
            statusMap[activity.status],
            activity.status,
            activity.content,
            formatDate(activity.activityDate),
          ],
          searchQuery,
        );
      }),
    [
      activities,
      filterStatus,
      filterDebt,
      filterFrom,
      filterTo,
      searchQuery,
      customerMap,
      userMap,
      statusMap,
    ],
  );

  const filterKey = `${filterStatus}|${filterDebt}|${filterFrom}|${filterTo}|${searchQuery}`;

  const {
    page,
    setPage,
    pageSize,
    totalItems,
    totalPages,
    paginatedItems: paginatedActivities,
  } = usePagination(filteredActivities, undefined, filterKey);



  const load = useCallback(async () => {

    setLoading(true);

    setError(null);

    try {

      const [activityList, customerList, statuses] = await Promise.all([
        activitiesApi.getAll(),
        lookupApi.customers(),
        orderStatusesApi.getAll(),
      ]);

      const userList = isAdmin
        ? await lookupApi.users()
        : [];

      setActivities(activityList);

      setUsers(userList);

      setCustomers(customerList);

      setOrderStatuses(statuses);

      setStatusMap(

        Object.fromEntries(

          statuses.map((s) => [s.statusCode, s.statusName]),

        ),

      );

    } catch (e) {

      setError(e instanceof Error ? e.message : "Không tải được dữ liệu");

    } finally {

      setLoading(false);

    }

  }, [isAdmin]);



  useEffect(() => {

    void load();

  }, [load]);



  function openDetail(activity: Activity) {

    setCreateMode(false);

    setSelectedId(activity.id);

    setDetailOpen(true);

  }



  function openCreate() {

    setSelectedId(null);

    setCreateMode(true);

    setDetailOpen(true);

  }



  function clearFilters() {

    setFilterStatus("all");

    setFilterDebt("all");

    setFilterFrom("");

    setFilterTo("");

    setSearchQuery("");

  }



  const hasActiveFilters =
    filterStatus !== "all" ||
    filterDebt !== "all" ||
    filterFrom !== "" ||
    filterTo !== "" ||
    searchQuery.trim() !== "";



  async function handleExport() {

    if (!exportFrom || !exportTo) {

      setError("Vui lòng chọn khoảng ngày xuất");

      return;

    }

    if (exportTo < exportFrom) {

      setError("Ngày kết thúc không được trước ngày bắt đầu");

      return;

    }

    setExporting(true);

    setError(null);

    try {

      await activitiesApi.exportExcel(exportFrom, exportTo);

    } catch (err) {

      setError(err instanceof Error ? err.message : "Xuất Excel thất bại");

    } finally {

      setExporting(false);

    }

  }



  async function handlePrint(activity: Activity) {
    if (!activity.invoiceId) return;

    setPrintingId(activity.id);
    setError(null);

    try {
      const [act, detailList] = await Promise.all([
        activitiesApi.getOne(activity.id),
        activityDetailsApi.getByActivity(activity.id),
      ]);

      const sellerName =
        userMap[act.userId] ??
        (user?.userId === act.userId ? user.username : `#${act.userId}`);

      printSalesInvoice(
        buildSalesInvoicePrintData({
          activity: act,
          details: detailList,
          customer: customerById[act.customerId],
          sellerName,
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "In hóa đơn thất bại");
    } finally {
      setPrintingId(null);
    }
  }



  async function handleDelete(id: number) {

    if (!confirm("Xóa hoạt động này?")) return;

    setError(null);

    try {

      await activitiesApi.delete(id);

      await load();

    } catch (err) {

      setError(err instanceof Error ? err.message : "Xóa thất bại");

    }

  }



  return (
    <Card>
      <CardHeader className="space-y-3 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <ListSearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Tìm theo khách hàng, nhân viên, nội dung, trạng thái..."
          />
          <div className="flex flex-wrap gap-2 sm:ml-auto">
            <Button variant="outline" size="sm" onClick={() => void load()}>
              <RefreshCw className="h-4 w-4" />
              Tải lại
            </Button>
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Thêm
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            {!loading && (
              <>
                {filteredActivities.length}
                {hasActiveFilters ? " kết quả" : " mục"}
              </>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-2 rounded-lg border bg-muted/20 px-3 py-2">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger id="filter-status" className="h-8 w-[150px] bg-background text-xs">
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả trạng thái</SelectItem>
              {orderStatuses.map((status) => (
                <SelectItem key={status.statusCode} value={status.statusCode}>
                  {status.statusName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filterDebt}
            onValueChange={(v) => setFilterDebt(v as "all" | "debt" | "paid")}
          >
            <SelectTrigger
              id="filter-debt"
              className="h-8 w-[150px] bg-background text-xs"
            >
              <SelectValue placeholder="Công nợ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả công nợ</SelectItem>
              <SelectItem value="debt">Còn nợ</SelectItem>
              <SelectItem value="paid">Đã trả đủ</SelectItem>
            </SelectContent>
          </Select>

          <Input
            id="filter-from"
            type="date"
            value={filterFrom}
            onChange={(e) => setFilterFrom(e.target.value)}
            className="h-8 w-[140px] bg-background text-xs"
          />
          <Input
            id="filter-to"
            type="date"
            title="Lọc đến ngày"
            value={filterTo}
            min={filterFrom || undefined}
            onChange={(e) => setFilterTo(e.target.value)}
            className="h-8 w-[140px] bg-background text-xs"
          />

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="h-8 px-2" onClick={clearFilters}>
              <X className="h-4 w-4" />
            </Button>
          )}

          <div className="mx-1 hidden h-6 w-px bg-border sm:block" />

          <Input
            id="export-from"
            type="date"
            title="Xuất từ ngày"
            value={exportFrom}
            onChange={(e) => setExportFrom(e.target.value)}
            className="h-8 w-[140px] bg-background text-xs"
          />
          <Input
            id="export-to"
            type="date"
            title="Xuất đến ngày"
            value={exportTo}
            min={exportFrom}
            onChange={(e) => setExportTo(e.target.value)}
            className="h-8 w-[140px] bg-background text-xs"
          />
          <Button
            variant="secondary"
            size="sm"
            className="h-8"
            disabled={exporting}
            onClick={() => void handleExport()}
          >
            <FileDown className="h-4 w-4" />
            {exporting ? "Đang xuất..." : "Xuất Excel"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {error && (
          <p className="mb-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground">Đang tải...</p>
        ) : activities.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có dữ liệu.</p>
        ) : filteredActivities.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Không có kết quả phù hợp.
          </p>
        ) : (
          <ListTableShell
            pagination={
              <TablePagination
                page={page}
                totalPages={totalPages}
                totalItems={totalItems}
                pageSize={pageSize}
                onPageChange={setPage}
              />
            }
          >
            <Table className="min-w-[960px]">
              <TableHeader>
                <TableRow>
                  <TableHead className={listCol.id}>ID</TableHead>
                  <TableHead className={listCol.name}>Khách hàng</TableHead>
                  <TableHead className={listCol.invoice}>Hóa đơn</TableHead>
                  <TableHead className={listCol.status}>Trạng thái</TableHead>
                  <TableHead className={listCol.payment}>Thanh toán</TableHead>
                  <TableHead className={listCol.money}>Tổng đơn</TableHead>
                  <TableHead className={listCol.money}>Đã thanh toán</TableHead>
                  <TableHead className={listCol.datetime}>Ngày tạo</TableHead>
                  <TableHead>Nội dung</TableHead>
                  <TableHead className={listCol.actions}>Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedActivities.map((activity) => (
                  <TableRow key={activity.id}>
                    <TableCell className={`text-muted-foreground ${listCell.nowrap}`}>
                      {activity.id}
                    </TableCell>
                    <TableCell className={`text-sm ${listCell.truncate}`}>
                      {customerMap[activity.customerId] ?? `#${activity.customerId}`}
                    </TableCell>
                    <TableCell className={listCell.nowrap}>
                      {activity.invoiceId ? `#${activity.invoiceId}` : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {statusMap[activity.status] ?? activity.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {activity.invoiceId
                        ? activity.paymentStatusLabel ?? activity.paymentStatus
                        : "—"}
                    </TableCell>
                    <TableCell className={listCell.money}>
                      {activity.invoiceId && activity.invoiceTotal != null
                        ? `${formatMoney(activity.invoiceTotal)} đ`
                        : "—"}
                    </TableCell>
                    <TableCell className={`${listCell.money} font-medium text-emerald-700`}>
                      {activity.invoiceId && activity.paidTotal != null
                        ? `${formatMoney(activity.paidTotal)} đ`
                        : "—"}
                    </TableCell>
                    <TableCell className={`text-sm ${listCell.nowrap}`}>
                      {formatDate(activity.activityDate)}
                    </TableCell>
                    <TableCell className={`text-sm ${listCell.truncate}`}>
                      {activity.content}
                    </TableCell>
                    <TableCell className={listCell.actions}>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Mở chi tiết"
                          onClick={() => openDetail(activity)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {activity.invoiceId ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            title="In hóa đơn A5"
                            disabled={printingId === activity.id}
                            onClick={() => void handlePrint(activity)}
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                        ) : null}
                        {isAdmin ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Xóa"
                            onClick={() => void handleDelete(activity.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ListTableShell>
        )}
      </CardContent>



      <ActivityDetailDialog

        activityId={selectedId}

        createMode={createMode}

        defaultUserId={user?.userId}

        open={detailOpen}

        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) {
            setCreateMode(false);
            setSelectedId(null);
          }
        }}

        onCreated={(id) => {
          setSelectedId(id);
          setCreateMode(false);
        }}

        onChanged={() => void load()}

        users={users}

        customers={customers}

        canManageOrder={isAdmin}

      />

    </Card>

  );

}

