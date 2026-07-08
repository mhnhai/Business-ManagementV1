"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Printer, RefreshCw, Trash2 } from "lucide-react";

import {
  activitiesApi,
  activityDetailsApi,
  lookupApi,
  orderStatusesApi,
  paymentsApi,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  computePaymentPreview,
  type PendingPaymentLine,
} from "@/lib/payment-preview";
import {
  buildSalesInvoicePrintData,
  printSalesInvoice,
} from "@/lib/print-sales-invoice";
import type {
  Activity,
  ActivityDetail,
  ActivityWrite,
  Customer,
  User,
  OrderStatus,
  PaymentSummary,
  Product,
} from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ActivityDetailDialogProps = {
  activityId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
  users: User[];
  customers: Customer[];
  /** Mở dialog tạo mới — nhập header và chi tiết trong cùng một màn hình */
  createMode?: boolean;
  defaultUserId?: number;
  onCreated?: (id: number) => void;
  /** Admin: xác nhận đơn, chuyển trạng thái, thanh toán */
  canManageOrder?: boolean;
};

const emptyLineForm = {
  productId: "",
  quantity: "1",
  salePrice: "",
};

const emptyPaymentForm = {
  paidAmount: "",
  method: "Tien mat",
  applyCustomerBalance: true,
};

const PAYMENT_METHODS = [
  { value: "Tien mat", label: "Tiền mặt" },
  { value: "Chuyen khoan", label: "Chuyển khoản" },
  { value: "The", label: "Thẻ" },
  { value: "Khac", label: "Khác" },
];

function formatDate(value: string) {
  return new Date(value).toLocaleString("vi-VN");
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

/** Next status by sort_order (same rule as backend OrderStatusRepo.getNext). */
function getNextOrderStatus(
  statuses: OrderStatus[],
  currentCode: string | undefined,
): OrderStatus | undefined {
  if (!currentCode || statuses.length === 0) return undefined;
  const sorted = [...statuses].sort((a, b) => a.sortOrder - b.sortOrder);
  const current = sorted.find((s) => s.statusCode === currentCode);
  if (!current || current.isTerminal) return undefined;
  return sorted.find((s) => s.sortOrder > current.sortOrder);
}

function buildDraftActivity(userId: number): Activity {
  const now = new Date().toISOString();
  return {
    id: 0,
    userId,
    customerId: 0,
    invoiceId: null,
    status: "draft",
    paymentStatus: "unpaid",
    activityDate: now,
    deliveryDate: null,
    content: "",
    createdAt: now,
    updatedAt: now,
  };
}

export function ActivityDetailDialog({
  activityId,
  open,
  onOpenChange,
  onChanged,
  users,
  customers,
  createMode = false,
  defaultUserId,
  onCreated,
  canManageOrder = false,
}: ActivityDetailDialogProps) {
  const { user: sessionUser } = useAuth();
  const [resolvedActivityId, setResolvedActivityId] = useState<number | null>(
    null,
  );
  const effectiveActivityId = activityId ?? resolvedActivityId;
  const [activity, setActivity] = useState<Activity | null>(null);
  const [details, setDetails] = useState<ActivityDetail[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [statuses, setStatuses] = useState<OrderStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [lineForm, setLineForm] = useState(emptyLineForm);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary | null>(
    null,
  );
  const [paymentForm, setPaymentForm] = useState(emptyPaymentForm);
  const [pendingPayments, setPendingPayments] = useState<PendingPaymentLine[]>(
    [],
  );
  const [useBalanceOnComplete, setUseBalanceOnComplete] = useState(true);

  const [headerForm, setHeaderForm] = useState({
    userId: "",
    customerId: "",
    content: "",
  });

  const isDraft = activity?.status === "draft";
  const isProcessing = activity?.status === "processing";
  const statusLabel =
    statuses.find((s) => s.statusCode === activity?.status)?.statusName ??
    activity?.status ??
    "";
  const currentStatus = statuses.find((s) => s.statusCode === activity?.status);
  const nextStatus = getNextOrderStatus(statuses, activity?.status);
  const canAdvance =
    activity != null &&
    activity.status !== "draft" &&
    nextStatus != null &&
    !currentStatus?.isTerminal;

  const isCompleting =
    isProcessing && nextStatus?.statusCode === "completed";

  const paymentPreview = useMemo(() => {
    if (!paymentSummary || !isProcessing) return null;
    return computePaymentPreview(
      paymentSummary.invoiceTotal,
      paymentSummary.customerBalance,
      paymentSummary.customerDebtOtherOrders,
      pendingPayments,
      useBalanceOnComplete,
    );
  }, [paymentSummary, isProcessing, pendingPayments, useBalanceOnComplete]);

  const customerOptions = useMemo(
    () =>
      customers.map((c) => ({
        value: String(c.id),
        label: c.companyName,
        keywords: `${c.representativeName} ${c.phoneNumber} ${c.businessType}`,
      })),
    [customers],
  );

  const productOptions = useMemo(
    () =>
      products.map((p) => ({
        value: String(p.id),
        label: p.productName,
        keywords: String(p.unitPrice),
      })),
    [products],
  );

  const load = useCallback(async (overrideId?: number) => {
    const id = overrideId ?? effectiveActivityId;
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [act, detailList, productList, statusList] = await Promise.all([
        activitiesApi.getOne(id),
        activityDetailsApi.getByActivity(id),
        lookupApi.products(),
        orderStatusesApi.getAll(),
      ]);
      const summary =
        canManageOrder && act.invoiceId
          ? await paymentsApi.getSummary(id)
          : null;
      setActivity(act);
      setDetails(detailList);
      setProducts(productList);
      setStatuses(statusList);
      setPaymentSummary(summary);
      setHeaderForm({
        userId: String(act.userId),
        customerId: String(act.customerId),
        content: act.content,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được dữ liệu");
    } finally {
      setLoading(false);
    }
  }, [effectiveActivityId, canManageOrder]);

  const initCreateMode = useCallback(async () => {
    const userId = defaultUserId ?? sessionUser?.userId ?? 0;
    setLoading(true);
    setError(null);
    try {
      const [productList, statusList] = await Promise.all([
        lookupApi.products(),
        orderStatusesApi.getAll(),
      ]);
      setActivity(buildDraftActivity(userId));
      setDetails([]);
      setProducts(productList);
      setStatuses(statusList);
      setPaymentSummary(null);
      setHeaderForm({
        userId: String(userId),
        customerId: "",
        content: "",
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được dữ liệu");
    } finally {
      setLoading(false);
    }
  }, [defaultUserId, sessionUser?.userId]);

  useEffect(() => {
    if (!open) {
      setResolvedActivityId(null);
      return;
    }
    setLineForm(emptyLineForm);
    setEditingProductId(null);
    setPaymentForm(emptyPaymentForm);
    setPendingPayments([]);
    setUseBalanceOnComplete(true);

    if (createMode && !activityId) {
      void initCreateMode();
      return;
    }
    if (effectiveActivityId) {
      void load();
    }
  }, [open, activityId, createMode, effectiveActivityId, load, initCreateMode]);

  function validateHeaderForCreate() {
    if (!headerForm.userId) {
      throw new Error("Vui lòng chọn nhân viên");
    }
    if (!headerForm.customerId) {
      throw new Error("Vui lòng chọn khách hàng");
    }
    if (!headerForm.content.trim()) {
      throw new Error("Vui lòng nhập nội dung");
    }
  }

  async function ensureActivityCreated(): Promise<Activity> {
    if (activity && activity.id > 0) {
      return activity;
    }
    validateHeaderForCreate();
    const payload: ActivityWrite = {
      userId: Number(headerForm.userId),
      customerId: Number(headerForm.customerId),
      content: headerForm.content.trim(),
    };
    const created = await activitiesApi.add(payload);
    setActivity(created);
    setResolvedActivityId(created.id);
    onCreated?.(created.id);
    onChanged();
    return created;
  }

  function addPendingPayment(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(paymentForm.paidAmount);
    if (!amount || amount <= 0) {
      setError("Số tiền thu phải lớn hơn 0");
      return;
    }
    setError(null);
    setPendingPayments((list) => [
      ...list,
      {
        clientId: `p-${Date.now()}-${list.length}`,
        paidAmount: amount,
        method: paymentForm.method,
      },
    ]);
    setPaymentForm(emptyPaymentForm);
  }

  function removePendingPayment(clientId: string) {
    setPendingPayments((list) => list.filter((p) => p.clientId !== clientId));
  }

  async function saveHeader() {
    if (!activity) return;
    setSaving(true);
    setError(null);
    try {
      if (activity.id === 0) {
        await ensureActivityCreated();
        return;
      }
      const payload = {
        id: activity.id,
        userId: Number(headerForm.userId),
        customerId: Number(headerForm.customerId),
        content: headerForm.content,
      };
      const updated = await activitiesApi.update(payload);
      setActivity(updated);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lưu thông tin thất bại");
    } finally {
      setSaving(false);
    }
  }

  function onProductChange(productId: string) {
    const product = products.find((p) => p.id === Number(productId));
    setLineForm((f) => ({
      ...f,
      productId,
      salePrice: product ? String(product.unitPrice) : f.salePrice,
    }));
  }

  async function saveLine(e: React.FormEvent) {
    e.preventDefault();
    if (!activity) return;
    setSaving(true);
    setError(null);
    try {
      const act = await ensureActivityCreated();
      const payload = {
        activityId: act.id,
        productId: Number(lineForm.productId),
        quantity: Number(lineForm.quantity),
        salePrice: Number(lineForm.salePrice),
      };
      if (editingProductId !== null) {
        await activityDetailsApi.update(payload);
      } else {
        await activityDetailsApi.add(payload);
      }
      setLineForm(emptyLineForm);
      setEditingProductId(null);
      await load(act.id);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lưu dòng hàng thất bại");
    } finally {
      setSaving(false);
    }
  }

  async function deleteLine(productId: number) {
    if (!activity || !confirm("Xóa sản phẩm khỏi đơn?")) return;
    setError(null);
    try {
      await activityDetailsApi.delete(activity.id, productId);
      await load();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xóa thất bại");
    }
  }

  async function confirmOrder() {
    if (!activity) return;
    setSaving(true);
    setError(null);
    try {
      const act = await ensureActivityCreated();
      await activitiesApi.confirm(act.id);
      await load(act.id);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xác nhận đơn thất bại");
    } finally {
      setSaving(false);
    }
  }

  async function advanceStatus() {
    if (!activity) return;
    setSaving(true);
    setError(null);
    try {
      const body = isCompleting
        ? {
            pendingPayments: pendingPayments.map((p) => ({
              paidAmount: p.paidAmount,
              method: p.method,
            })),
            applyCustomerBalance: useBalanceOnComplete,
          }
        : undefined;
      await activitiesApi.advanceStatus(activity.id, body);
      setPendingPayments([]);
      setUseBalanceOnComplete(true);
      await load();
      onChanged();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Chuyển trạng thái thất bại",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handlePrintInvoice() {
    if (!activity?.invoiceId) return;
    setError(null);
    try {
      printSalesInvoice(
        buildSalesInvoicePrintData({
          activity,
          details,
          customer: customers.find((c) => c.id === activity.customerId),
          sellerName: userName,
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "In hóa đơn thất bại");
    }
  }

  const orderTotal = details.reduce((sum, d) => sum + d.lineTotal, 0);
  const userName =
    users.find((u) => u.id === activity?.userId)?.fullName ??
    sessionUser?.username ??
    "—";
  const customerName =
    customers.find((c) => c.id === activity?.customerId)?.companyName ?? "—";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {createMode && activity?.id === 0
              ? "Tạo hoạt động mới"
              : `Chi tiết hoạt động #${effectiveActivityId ?? activityId}`}
          </DialogTitle>
        </DialogHeader>

        {loading || !activity ? (
          <p className="text-sm text-muted-foreground">Đang tải...</p>
        ) : (
          <div className="space-y-6">
            {error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <section className="space-y-3 rounded-lg border p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge>{statusLabel}</Badge>
                {canManageOrder && activity.invoiceId && (
                  <Badge variant="secondary">
                    {isProcessing && paymentPreview
                      ? `${paymentPreview.paymentStatusLabel} (dự kiến)`
                      : paymentSummary?.paymentStatusLabel ??
                        activity.paymentStatus}
                  </Badge>
                )}
                {canManageOrder && activity.invoiceId && (
                  <Badge variant="outline">Hóa đơn #{activity.invoiceId}</Badge>
                )}
                {!activity.invoiceId && (
                  <Badge variant="secondary">Chưa có hóa đơn</Badge>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">Nhân viên</p>
                  {isDraft && canManageOrder ? (
                    <Select
                      value={headerForm.userId}
                      onValueChange={(v) =>
                        setHeaderForm((f) => ({ ...f, userId: v }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((u) => (
                          <SelectItem key={u.id} value={String(u.id)}>
                            {u.fullName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-sm font-medium">{userName}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Khách hàng</p>
                  {isDraft ? (
                    <SearchableSelect
                      options={customerOptions}
                      value={headerForm.customerId}
                      onValueChange={(v) =>
                        setHeaderForm((f) => ({ ...f, customerId: v }))
                      }
                      placeholder="Chọn khách hàng"
                      searchPlaceholder="Tìm theo tên công ty, người đại diện, SĐT..."
                    />
                  ) : (
                    <p className="text-sm font-medium">{customerName}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Ngày tạo</p>
                  <p className="text-sm">{formatDate(activity.activityDate)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Ngày giao hàng</p>
                  <p className="text-sm">
                    {activity.deliveryDate
                      ? formatDate(activity.deliveryDate)
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Nội dung</p>
                  {isDraft ? (
                    <Input
                      value={headerForm.content}
                      onChange={(e) =>
                        setHeaderForm((f) => ({ ...f, content: e.target.value }))
                      }
                    />
                  ) : (
                    <p className="text-sm">{activity.content}</p>
                  )}
                </div>
              </div>
              {isDraft && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={saving}
                    onClick={() => void saveHeader()}
                  >
                    {activity.id === 0 ? "Lưu hoạt động" : "Lưu thông tin hoạt động"}
                  </Button>
                  {activity.id === 0 && (
                    <p className="text-xs text-muted-foreground">
                      Chọn khách hàng và nội dung trước khi thêm sản phẩm, hoặc
                      nhấn &quot;Lưu hoạt động&quot; để tạo đơn nháp.
                    </p>
                  )}
                </>
              )}
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Chi tiết đơn hàng</h3>

              {isDraft && (
                <form
                  className="grid gap-3 rounded-lg border p-4"
                  onSubmit={(e) => void saveLine(e)}
                >
                  <p className="text-sm font-medium">
                    {editingProductId !== null
                      ? "Sửa sản phẩm"
                      : "Thêm sản phẩm"}
                  </p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="grid gap-2 sm:col-span-3">
                      <Label>Sản phẩm</Label>
                      <SearchableSelect
                        options={productOptions}
                        value={lineForm.productId}
                        onValueChange={onProductChange}
                        disabled={editingProductId !== null}
                        placeholder="Chọn sản phẩm"
                        searchPlaceholder="Tìm theo tên sản phẩm..."
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Số lượng</Label>
                      <Input
                        type="number"
                        min={1}
                        required
                        value={lineForm.quantity}
                        onChange={(e) =>
                          setLineForm((f) => ({
                            ...f,
                            quantity: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Giá bán</Label>
                      <Input
                        type="number"
                        min={0}
                        required
                        value={lineForm.salePrice}
                        onChange={(e) =>
                          setLineForm((f) => ({
                            ...f,
                            salePrice: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" disabled={saving}>
                      <Plus className="h-4 w-4" />
                      {editingProductId !== null ? "Cập nhật" : "Thêm"}
                    </Button>
                    {editingProductId !== null && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingProductId(null);
                          setLineForm(emptyLineForm);
                        }}
                      >
                        Hủy
                      </Button>
                    )}
                  </div>
                </form>
              )}

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sản phẩm</TableHead>
                    <TableHead>Giá gốc</TableHead>
                    <TableHead>Giá bán</TableHead>
                    <TableHead>SL</TableHead>
                    <TableHead>Thành tiền</TableHead>
                    {isDraft && (
                      <TableHead className="text-right">Thao tác</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {details.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={isDraft ? 6 : 5}
                        className="text-center text-muted-foreground"
                      >
                        Chưa có sản phẩm
                      </TableCell>
                    </TableRow>
                  ) : (
                    details.map((d) => (
                      <TableRow key={d.productId}>
                        <TableCell>{d.productName}</TableCell>
                        <TableCell>{formatMoney(d.unitPrice)}</TableCell>
                        <TableCell>{formatMoney(d.salePrice)}</TableCell>
                        <TableCell>{d.quantity}</TableCell>
                        <TableCell>{formatMoney(d.lineTotal)}</TableCell>
                        {isDraft && (
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingProductId(d.productId);
                                setLineForm({
                                  productId: String(d.productId),
                                  quantity: String(d.quantity),
                                  salePrice: String(d.salePrice),
                                });
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => void deleteLine(d.productId)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              <p className="text-right text-sm font-semibold">
                Tổng tạm tính: {formatMoney(orderTotal)} đ
              </p>
            </section>

            {canManageOrder && activity.invoiceId && paymentSummary && (
              <section className="space-y-3 rounded-lg border p-4">
                <h3 className="text-sm font-semibold">Thanh toán</h3>
                {isProcessing && (
                  <p className="text-xs text-amber-700">
                    Các khoản thu chỉ được lưu vào hệ thống khi bạn chuyển trạng
                    thái sang &quot;Hoàn thành&quot;. Số dư khách hàng chưa thay
                    đổi cho đến lúc đó.
                  </p>
                )}
                <div className="grid gap-2 text-sm sm:grid-cols-2">
                  <p>
                    <span className="text-muted-foreground">Tổng đơn: </span>
                    <span className="font-medium">
                      {formatMoney(paymentSummary.invoiceTotal)} đ
                    </span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">
                      {isProcessing ? "Sẽ thu (dự kiến): " : "Đã thu: "}
                    </span>
                    <span className="font-medium">
                      {formatMoney(
                        isProcessing && paymentPreview
                          ? paymentPreview.paidTotal
                          : paymentSummary.paidTotal,
                      )}{" "}
                      đ
                    </span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Còn lại (đơn này): </span>
                    <span className="font-medium">
                      {formatMoney(
                        isProcessing && paymentPreview
                          ? paymentPreview.remaining
                          : paymentSummary.remaining,
                      )}{" "}
                      đ
                    </span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">
                      Nợ các đơn khác:{" "}
                    </span>
                    <span className="font-medium text-amber-700">
                      {formatMoney(
                        isProcessing && paymentPreview
                          ? paymentSummary.customerDebtOtherOrders
                          : paymentSummary.customerDebtOtherOrders,
                      )}{" "}
                      đ
                    </span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">
                      {isProcessing
                        ? "Tổng nợ KH sau HT (dự kiến): "
                        : "Tổng nợ KH: "}
                    </span>
                    <span className="font-medium text-destructive">
                      {formatMoney(
                        isProcessing && paymentPreview
                          ? paymentPreview.projectedCustomerTotalDebt
                          : paymentSummary.customerTotalDebt,
                      )}{" "}
                      đ
                    </span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">
                      {isProcessing ? "Số dư KH sau HT (dự kiến): " : "Số dư KH: "}
                    </span>
                    <span className="font-medium">
                      {formatMoney(
                        isProcessing && paymentPreview
                          ? paymentPreview.projectedCustomerBalance
                          : paymentSummary.customerBalance,
                      )}{" "}
                      đ
                    </span>
                  </p>
                </div>

                {((isProcessing && paymentPreview && paymentPreview.displayRows.length > 0) ||
                  (!isProcessing && paymentSummary.payments.length > 0)) && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {!isProcessing && <TableHead>Ngày</TableHead>}
                        <TableHead>Số tiền</TableHead>
                        <TableHead>Hình thức</TableHead>
                        {isProcessing && (
                          <TableHead className="text-right">Xóa</TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isProcessing && paymentPreview
                        ? paymentPreview.displayRows.map((p) => (
                            <TableRow key={p.clientId}>
                              <TableCell>{formatMoney(p.paidAmount)} đ</TableCell>
                              <TableCell>
                                {p.isBalance ? "Số dư khách hàng" : p.method}
                                {p.note ? (
                                  <span className="block text-[10px] text-muted-foreground">
                                    {p.note}
                                  </span>
                                ) : null}
                              </TableCell>
                              <TableCell className="text-right">
                                {!p.isBalance &&
                                  !p.clientId.includes("_other") &&
                                  !p.clientId.includes("_excess") && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      removePendingPayment(p.clientId)
                                    }
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        : paymentSummary.payments.map((p) => (
                            <TableRow key={p.id}>
                              <TableCell>{formatDate(p.paymentDate)}</TableCell>
                              <TableCell>{formatMoney(p.paidAmount)} đ</TableCell>
                              <TableCell>{p.method}</TableCell>
                            </TableRow>
                          ))}
                    </TableBody>
                  </Table>
                )}

                {isProcessing && paymentSummary.canRecordPayment && (
                  <div className="space-y-3 border-t pt-3">
                    <p className="text-xs text-muted-foreground">
                      Thêm các hình thức thanh toán (chưa lưu). Tiền thu sẽ trừ
                      nợ đơn này trước, sau đó các đơn còn nợ khác (cũ trước);
                      phần thừa mới cộng vào số dư khi hoàn thành.
                    </p>
                    {paymentSummary.customerBalance > 0 && (
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={useBalanceOnComplete}
                          onChange={(e) =>
                            setUseBalanceOnComplete(e.target.checked)
                          }
                        />
                        Khi hoàn thành: dùng số dư trừ nợ các đơn cũ trước, sau đó
                        đơn này (tối đa{" "}
                        {formatMoney(
                          Math.min(
                            paymentSummary.customerBalance,
                            paymentSummary.customerTotalDebt,
                          ),
                        )}{" "}
                        đ)
                      </label>
                    )}
                    <form
                      className="grid gap-3 sm:grid-cols-3"
                      onSubmit={addPendingPayment}
                    >
                      <div className="grid gap-2">
                        <Label>Số tiền thu</Label>
                        <Input
                          type="number"
                          min={1}
                          required
                          value={paymentForm.paidAmount}
                          onChange={(e) =>
                            setPaymentForm((f) => ({
                              ...f,
                              paidAmount: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Hình thức</Label>
                        <Select
                          value={paymentForm.method}
                          onValueChange={(v) =>
                            setPaymentForm((f) => ({ ...f, method: v }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PAYMENT_METHODS.map((m) => (
                              <SelectItem key={m.value} value={m.value}>
                                {m.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex flex-col justify-end">
                        <Button type="submit" variant="outline" disabled={saving}>
                          Thêm hình thức thanh toán
                        </Button>
                      </div>
                    </form>
                  </div>
                )}

                {!isProcessing && activity.invoiceId && (
                  <p className="text-xs text-muted-foreground">
                    Chuyển đơn sang &quot;Đang xử lý&quot; để thu tiền.
                  </p>
                )}
              </section>
            )}

            <section className="flex flex-col gap-2 border-t pt-4">
              {activity.invoiceId && (
                <Button
                  variant="outline"
                  disabled={saving || details.length === 0}
                  onClick={() => void handlePrintInvoice()}
                >
                  <Printer className="h-4 w-4" />
                  In hóa đơn (A5)
                </Button>
              )}
              {canManageOrder && isDraft && (
                <>
                  <Button disabled={saving} onClick={() => void confirmOrder()}>
                    Xác nhận đơn (tạo hóa đơn)
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Đơn nháp dùng nút xác nhận để chuyển sang &quot;Đã xác nhận&quot;
                    và tạo hóa đơn. Sau đó mới dùng nút chuyển trạng thái tiếp theo.
                  </p>
                </>
              )}
              {canManageOrder && canAdvance && nextStatus && (
                <>
                  <Button
                    variant="secondary"
                    disabled={saving}
                    onClick={() => void advanceStatus()}
                  >
                    Chuyển sang: {nextStatus.statusName}
                  </Button>
                  {isCompleting && (
                    <p className="text-xs text-muted-foreground">
                      Khi chuyển sang Hoàn thành, hệ thống sẽ lưu{" "}
                      {pendingPayments.length} khoản thu
                      {useBalanceOnComplete ? " và áp dụng số dư khách hàng" : ""}
                      , cập nhật trạng thái thanh toán và số dư.
                    </p>
                  )}
                </>
              )}
              {!isDraft &&
                !canAdvance &&
                !currentStatus?.isTerminal &&
                statuses.length === 0 && (
                  <p className="text-xs text-amber-600">
                    Chưa có danh mục trạng thái đơn. Chạy seed backend (
                    <code className="text-xs">node prisma/seed.js</code>).
                  </p>
                )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => void load()}
              >
                <RefreshCw className="h-4 w-4" />
                Tải lại
              </Button>
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
