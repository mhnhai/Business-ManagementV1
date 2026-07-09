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

import { listCol, listCell, listHead } from "@/lib/list-table-layout";



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
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

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

  const filteredActivities = activities;

  const load = useCallback(
    async (
      targetPage = page,
      overrides?: {
        searchQuery?: string;
        filterStatus?: string;
        filterDebt?: "all" | "debt" | "paid";
        filterFrom?: string;
        filterTo?: string;
      },
    ) => {
    const search = overrides?.searchQuery ?? searchQuery;
    const status = overrides?.filterStatus ?? filterStatus;
    const debt = overrides?.filterDebt ?? filterDebt;
    const from = overrides?.filterFrom ?? filterFrom;
    const to = overrides?.filterTo ?? filterTo;

    setLoading(true);

    setError(null);

    try {

      const [activityList, customerList, statuses] = await Promise.all([
        activitiesApi.getPage(targetPage, pageSize, {
          search: search.trim() || undefined,
          status: status !== "all" ? status : undefined,
          debt: debt !== "all" ? debt : undefined,
          fromDate: from || undefined,
          toDate: to || undefined,
        }),
        lookupApi.customers(),
        orderStatusesApi.getAll(),
      ]);

      const userList = isAdmin
        ? await lookupApi.users()
        : [];

      setActivities(activityList.items);
      setTotalItems(activityList.total);
      setTotalPages(Math.max(1, Math.ceil(activityList.total / activityList.pageSize)));
      setPage(activityList.page);

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

  }, [isAdmin, page, searchQuery, filterStatus, filterDebt, filterFrom, filterTo]);



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
            onChange={(value) => {
              setSearchQuery(value);
              void load(1, { searchQuery: value });
            }}
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
          <Select value={filterStatus} onValueChange={(value) => {
            setFilterStatus(value);
            void load(1, { filterStatus: value });
          }}>
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
            onValueChange={(v) => {
              setFilterDebt(v as "all" | "debt" | "paid");
              void load(1, { filterDebt: v as "all" | "debt" | "paid" });
            }}
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
            onChange={(e) => {
              setFilterFrom(e.target.value);
              void load(1, { filterFrom: e.target.value });
            }}
            className="h-8 w-[140px] bg-background text-xs"
          />
          <Input
            id="filter-to"
            type="date"
            title="Lọc đến ngày"
            value={filterTo}
            min={filterFrom || undefined}
            onChange={(e) => {
              setFilterTo(e.target.value);
              void load(1, { filterTo: e.target.value });
            }}
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
                onPageChange={(nextPage) => {
                  setPage(nextPage);
                  void load(nextPage);
                }}
              />
            }
          >
            <Table className="min-w-[960px]">
              <TableHeader>
                <TableRow>
                  <TableHead className={`${listCol.id} ${listHead.center}`}>ID</TableHead>
                  <TableHead className={listCol.name}>Khách hàng</TableHead>
                  <TableHead className={`${listCol.invoice} ${listHead.center}`}>Hóa đơn</TableHead>
                  <TableHead className={`${listCol.status} ${listHead.center}`}>Trạng thái</TableHead>
                  <TableHead className={`${listCol.payment} ${listHead.center}`}>Thanh toán</TableHead>
                  <TableHead className={`${listCol.money} ${listHead.right}`}>Tổng đơn</TableHead>
                  <TableHead className={`${listCol.money} ${listHead.right}`}>Đã thanh toán</TableHead>
                  <TableHead className={`${listCol.datetime} ${listHead.center}`}>Ngày tạo</TableHead>
                  <TableHead>Nội dung</TableHead>
                  <TableHead className={`${listCol.actionsWide} ${listHead.center}`}>Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredActivities.map((activity) => (
                  <TableRow key={activity.id}>
                    <TableCell className={`text-muted-foreground ${listCell.center}`}>
                      {activity.id}
                    </TableCell>
                    <TableCell className={`text-sm ${listCell.truncate}`}>
                      {customerMap[activity.customerId] ?? `#${activity.customerId}`}
                    </TableCell>
                    <TableCell className={listCell.center}>
                      {activity.invoiceId ? `#${activity.invoiceId}` : "—"}
                    </TableCell>
                    <TableCell className={listCell.status}>
                      <div className="flex justify-center">
                      <Badge variant="outline" className="text-xs">
                        {statusMap[activity.status] ?? activity.status}
                      </Badge>
                      </div>
                    </TableCell>
                    <TableCell className={`text-xs ${listCell.center}`}>
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
                    <TableCell className={`text-sm ${listCell.center}`}>
                      {formatDate(activity.activityDate)}
                    </TableCell>
                    <TableCell className={`text-sm ${listCell.truncate}`}>
                      {activity.content}
                    </TableCell>
                    <TableCell className={listCell.actionsCenter}>
                      <div className="flex flex-nowrap items-center justify-center gap-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 shrink-0 p-0"
                          title="Mở chi tiết"
                          onClick={() => openDetail(activity)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {activity.invoiceId ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 shrink-0 p-0"
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
                            className="h-8 w-8 shrink-0 p-0"
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

