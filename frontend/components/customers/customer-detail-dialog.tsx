"use client";

import { useEffect, useState } from "react";
import { Banknote, Loader2, MapPin } from "lucide-react"; // Thêm icon MapPin

import { customersApi, locationsApi, orderStatusesApi } from "@/lib/api";
import type { CustomerAccount, Location } from "@/lib/types";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const PAYMENT_METHODS = [
  { value: "Tien mat", label: "Tiền mặt" },
  { value: "Chuyen khoan", label: "Chuyển khoản" },
  { value: "The", label: "Thẻ" },
  { value: "Khac", label: "Khác" },
];

function formatMoney(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("vi-VN");
}

function locationLabel(loc: Location) {
  return `${loc.ward}, ${loc.province}`;
}

interface CustomerDetailDialogProps {
  customerId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Admin: tài khoản, đơn hàng, trả tiền */
  canManageAccount?: boolean;
  onAccountUpdated?: () => void;
}

export function CustomerDetailDialog({
  customerId,
  open,
  onOpenChange,
  canManageAccount = false,
  onAccountUpdated,
}: CustomerDetailDialogProps) {
  const [account, setAccount] = useState<CustomerAccount | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [statusMap, setStatusMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("Tien mat");
  const [paying, setPaying] = useState(false);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setAccount(null);
      setError(null);
      setPayDialogOpen(false);
      setPayAmount("");
    }
    onOpenChange(nextOpen);
  };

  useEffect(() => {
    if (!open || !customerId) return;

    let cancelled = false;

    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const locs = await locationsApi.getAll();
        if (cancelled) return;
        setLocations(locs);

        const [acc, statuses] = await Promise.all([
          customersApi.getAccount(customerId),
          orderStatusesApi.getAll(),
        ]);
        if (cancelled) return;
        setAccount(acc);
        setStatusMap(
          Object.fromEntries(statuses.map((s) => [s.statusCode, s.statusName])),
        );
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Không tải được dữ liệu");
        setAccount(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, customerId]);

  async function handleReceivePayment(e: React.FormEvent) {
    e.preventDefault();
    if (!customerId) return;
    const amount = Number(payAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Số tiền phải lớn hơn 0");
      return;
    }
    setPaying(true);
    setError(null);
    try {
      const result = await customersApi.receivePayment(customerId, {
        amount,
        method: payMethod,
      });
      setAccount(result.account);
      setPayDialogOpen(false);
      setPayAmount("");
      onAccountUpdated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Thanh toán thất bại");
    } finally {
      setPaying(false);
    }
  }

  const customer = account?.customer;
  const locationName =
    customer &&
    locations.find((l) => l.id === customer.locationId);

  // Xây dựng URL bản đồ nhúng dựa trên tọa độ lat, lng của khách hàng
  const hasCoordinates = customer?.lat && customer?.lng;
  const mapUrl = hasCoordinates
    ? `https://maps.google.com/maps?q=${customer.lat},${customer.lng}&t=&z=16&ie=UTF8&iwloc=&output=embed`
    : null;

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {customer?.companyName ?? "Chi tiết khách hàng"}
            </DialogTitle>
          </DialogHeader>

          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Đang tải...
            </div>
          ) : customer ? (
            <Tabs defaultValue="info" className="w-full">
              <TabsList>
                <TabsTrigger value="info">Thông tin</TabsTrigger>
                <TabsTrigger value="orders">Đơn hàng & nợ</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-4 text-sm pt-2">
                {/* Khối chia đôi: Trái hiển thị chữ, Phải hiển thị Bản đồ thực địa */}
                <div className="grid gap-4 md:grid-cols-5">
                  <div className="grid gap-3 sm:grid-cols-2 md:col-span-3">
                    <InfoRow label="ID" value={String(customer.id)} />
                    <InfoRow label="Tên công ty" value={customer.companyName} />
                    <InfoRow label="Loại hình" value={customer.businessType} />
                    <InfoRow
                      label="Người đại diện"
                      value={`${customer.representativeName} (${customer.position})`}
                    />
                    <InfoRow label="Số điện thoại" value={customer.phoneNumber} />
                    <InfoRow
                      label="Địa điểm"
                      value={
                        locationName
                          ? locationLabel(locationName)
                          : String(customer.locationId)
                      }
                    />
                    <InfoRow
                      label="Số dư hiện tại"
                      value={`${formatMoney(account!.currentBalance)} đ`}
                    />
                    <InfoRow
                      label="Tổng nợ"
                      value={`${formatMoney(account!.totalDebt)} đ`}
                    />
                    <InfoRow
                      label="Tọa độ"
                      value={hasCoordinates ? `${customer.lat}, ${customer.lng}` : "Chưa có tọa độ"}
                    />
                  </div>

                  {/* Khu vực nhúng Bản đồ số định vị khách hàng */}
                  <div className="md:col-span-2 flex flex-col">
                    <span className="text-xs text-muted-foreground mb-1 block font-medium flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-indigo-600" /> Vị trí thực địa
                    </span>
                    <div className="w-full flex-1 min-h-[200px] rounded-lg border bg-muted overflow-hidden relative">
                      {mapUrl ? (
                        <iframe
                          title="Customer Location Map"
                          width="100%"
                          height="100%"
                          className="absolute inset-0 border-0"
                          src={mapUrl}
                          allowFullScreen
                          loading="lazy"
                        />
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center text-muted-foreground text-xs">
                          <MapPin className="h-8 w-8 text-muted-foreground/40 mb-2" />
                          Khách hàng này chưa được cập nhật tọa độ GPS.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="orders" className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/40 p-4">
                  <div className="grid gap-1 text-sm">
                    <p>
                      <span className="text-muted-foreground">Số dư: </span>
                      <span className="font-semibold text-emerald-700">
                        {formatMoney(account!.currentBalance)} đ
                      </span>
                    </p>
                    <p>
                      <span className="text-muted-foreground">Tổng nợ: </span>
                      <span className="font-semibold text-destructive">
                        {formatMoney(account!.totalDebt)} đ
                      </span>
                    </p>
                  </div>
                  {canManageAccount && (
                  <Button size="sm" onClick={() => setPayDialogOpen(true)}>
                    <Banknote className="mr-2 h-4 w-4" />
                    Trả tiền
                  </Button>
                  )}
                </div>

                {account!.orders.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Chưa có đơn hàng có hóa đơn.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mã đơn</TableHead>
                        <TableHead>Ngày tạo</TableHead>
                        <TableHead>Trạng thái đơn</TableHead>
                        <TableHead>Thanh toán</TableHead>
                        <TableHead className="text-right">Tổng HĐ</TableHead>
                        <TableHead className="text-right">Đã trả</TableHead>
                        <TableHead className="text-right">Còn nợ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {account!.orders.map((order) => (
                        <TableRow key={order.activityId}>
                          <TableCell>#{order.activityId}</TableCell>
                          <TableCell className="whitespace-nowrap text-xs">
                            {formatDate(order.createdAt)}
                          </TableCell>
                          <TableCell className="text-xs">
                            {statusMap[order.status] ?? order.status}
                          </TableCell>
                          <TableCell className="text-xs">
                            {order.paymentStatusLabel}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatMoney(order.invoiceTotal)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatMoney(order.paidTotal)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatMoney(order.remaining)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>
            </Tabs>
          ) : (
            !loading &&
            !error && (
              <p className="text-sm text-muted-foreground">
                Không có dữ liệu khách hàng.
              </p>
            )
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Trả tiền</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Số tiền sẽ trừ nợ các đơn chưa thanh toán (đơn cũ trước), phần thừa
            mới cộng vào số dư khách hàng.
          </p>
          <form className="grid gap-4" onSubmit={(e) => void handleReceivePayment(e)}>
            <div className="grid gap-2">
              <Label htmlFor="payAmount">Số tiền khách trả</Label>
              <Input
                id="payAmount"
                type="number"
                min={1}
                required
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                placeholder="Nhập số tiền"
              />
            </div>
            <div className="grid gap-2">
              <Label>Hình thức</Label>
              <Select value={payMethod} onValueChange={setPayMethod}>
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
            <Button type="submit" disabled={paying}>
              {paying ? "Đang xử lý..." : "Xác nhận trả tiền"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}