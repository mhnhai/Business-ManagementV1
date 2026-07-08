"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import type { LeafletMouseEvent, Map as LeafletMap, Marker as LeafletMarker } from "leaflet";
import { Eye, Pencil, Plus, RefreshCw, Trash2, Check, Map, MapPin } from "lucide-react";

import { CustomerDetailDialog } from "@/components/customers/customer-detail-dialog";
import { customersApi, locationsApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Customer, Location } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { FieldScanDialog } from "./customer-scan-dialog";

const emptyForm = {
  id: 0,
  locationId: "",
  companyName: "",
  businessType: "",
  representativeName: "",
  position: "",
  phoneNumber: "",
  currentBalance: "",
  lat: "",
  lng: "",
  isApproved: true,
};

const CAN_THO_COORDS = { lat: 10.0383, lng: 105.7838 };

function formatMoney(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

function locationLabel(loc: Location) {
  return `${loc.ward}, ${loc.province}`;
}

export function CustomersPanel() {
  const { isAdmin } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mapDialogOpen, setMapDialogOpen] = useState(false);
  const [detailCustomerId, setDetailCustomerId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [searchQuery, setSearchQuery] = useState("");

  // Trạng thái cho Bản đồ nhỏ ghim điểm
  const [innerMapOpen, setInnerMapOpen] = useState(false);
  const [pickedCoords, setPickedCoords] = useState(CAN_THO_COORDS);
  const innerMapContainerRef = useRef<HTMLDivElement>(null);
  const innerMapInstanceRef = useRef<LeafletMap | null>(null);
  const innerMarkerRef = useRef<LeafletMarker | null>(null);

  const locationMap = useMemo(
    () =>
      Object.fromEntries(
        locations.map((l) => [l.id, locationLabel(l)]),
      ),
    [locations],
  );

  const filteredCustomers = useMemo(
    () =>
      customers.filter((customer) =>
        matchesAnySearchField(
          [
            customer.id,
            customer.companyName,
            customer.businessType,
            customer.representativeName,
            customer.position,
            customer.phoneNumber,
            customer.currentBalance,
            locationMap[customer.locationId],
            customer.locationId,
            customer.lat,
            customer.lng,
          ],
          searchQuery,
        ),
      ),
    [customers, locationMap, searchQuery],
  );

  const {
    page,
    setPage,
    pageSize,
    totalItems,
    totalPages,
    paginatedItems: paginatedCustomers,
  } = usePagination(filteredCustomers, undefined, searchQuery);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [customerList, locationList] = await Promise.all([
        customersApi.getAll(),
        locationsApi.getAll(),
      ]);
      let pendingCustomers: Customer[] = [];
      if(isAdmin)
        pendingCustomers = await customersApi.getPendingApproval(); 

      setCustomers([...pendingCustomers, ...customerList]);
      setLocations(locationList);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được dữ liệu");
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [load]);

  // Khởi tạo bản đồ nhỏ và định vị GPS bản thân
  useEffect(() => {
    if (!innerMapOpen) return;

    const initMap = async () => {
      try {
        const L = (await import("leaflet")).default;
        await import("leaflet/dist/leaflet.css");

        // KHẮC PHỤC LỖI ICON: Định nghĩa lại Marker Icon mặc định của Leaflet bằng CDN chuẩn
        delete (L.Icon.Default.prototype as unknown as { _getIconUrl: unknown })._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
          iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
          shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
        });

        if (!innerMapContainerRef.current) return;

        if (innerMapInstanceRef.current) {
          innerMapInstanceRef.current.remove();
          innerMapInstanceRef.current = null;
          innerMarkerRef.current = null;
        }

        const initLat = form.lat ? Number(form.lat) : null;
        const initLng = form.lng ? Number(form.lng) : null;

        const setupLeaflet = (lat: number, lng: number) => {
          setPickedCoords({ lat, lng });

          if (!innerMapContainerRef.current) return;
          const map = L.map(innerMapContainerRef.current).setView([lat, lng], 16);
          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "© OpenStreetMap contributors",
          }).addTo(map);

          innerMapInstanceRef.current = map;
          innerMarkerRef.current = L.marker([lat, lng]).addTo(map);

          map.on("click", (e: LeafletMouseEvent) => {
            const { lat: clickLat, lng: clickLng } = e.latlng;
            setPickedCoords({ lat: clickLat, lng: clickLng });
            if (innerMarkerRef.current) {
              innerMarkerRef.current.setLatLng([clickLat, clickLng]);
            }
          });
        };

        if (!initLat || !initLng) {
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                setupLeaflet(position.coords.latitude, position.coords.longitude);
              },
              (err) => {
                console.warn("Không lấy được GPS, lùi về tâm Cần Thơ làm mặc định", err);
                setupLeaflet(CAN_THO_COORDS.lat, CAN_THO_COORDS.lng);
              },
              { enableHighAccuracy: true, timeout: 8000 }
            );
          } else {
            setupLeaflet(CAN_THO_COORDS.lat, CAN_THO_COORDS.lng);
          }
        } else {
          setupLeaflet(initLat, initLng);
        }

      } catch (err) {
        console.error("Lỗi khởi tạo bản đồ:", err);
      }
    };

    void initMap();
  }, [innerMapOpen, form.lat, form.lng]);

  const confirmPickedCoords = () => {
    setForm((f) => ({
      ...f,
      lat: String(pickedCoords.lat.toFixed(6)),
      lng: String(pickedCoords.lng.toFixed(6)),
    }));
    setInnerMapOpen(false);
  };

  function openCreate() {
    setForm({
      ...emptyForm,
      locationId: locations[0] ? String(locations[0].id) : "",
    });
    setDialogOpen(true);
  }

  const handleSelectFieldData = (data: {
    companyName: string;
    businessType: string;
    lat: string;
    lng: string;
    phoneNumber: string;
  }) => {
    setForm({
      id: 0,
      locationId: locations[0] ? String(locations[0].id) : "",
      companyName: data.companyName,
      businessType: data.businessType,
      representativeName: "",
      position: "Chủ cửa hàng",
      phoneNumber: data.phoneNumber,
      currentBalance: "0",
      lat: data.lat,
      lng: data.lng,
      isApproved: false,
    });
    setDialogOpen(true);
  };

  function openDetail(customer: Customer) {
    setDetailCustomerId(customer.id);
    setDetailOpen(true);
  }

  function openEdit(customer: Customer) {
    setForm({
      id: customer.id,
      locationId: String(customer.locationId),
      companyName: customer.companyName,
      businessType: customer.businessType,
      representativeName: customer.representativeName,
      position: customer.position,
      phoneNumber: customer.phoneNumber,
      currentBalance: String(customer.currentBalance),
      lat: customer.lat ? String(customer.lat) : "",
      lng: customer.lng ? String(customer.lng) : "",
      isApproved: customer.isApproved ?? true,
    });
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        id: form.id,
        locationId: Number(form.locationId),
        companyName: form.companyName,
        businessType: form.businessType,
        representativeName: form.representativeName,
        position: form.position,
        phoneNumber: form.phoneNumber,
        currentBalance: Number(form.currentBalance),
        lat: form.lat ? Number(form.lat) : undefined,
        lng: form.lng ? Number(form.lng) : undefined,
        isApproved: isAdmin ? form.isApproved : false,
      };
      if (form.id === 0) {
        const { id: _id, ...createPayload } = payload;
        await customersApi.add(createPayload);
      } else {
        await customersApi.update(payload);
      }
      setDialogOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lưu thất bại");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Xóa khách hàng này?")) return;
    setError(null);
    try {
      await customersApi.delete(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xóa thất bại");
    }
  }

  async function handleApprove(id: number) {
    if (!confirm("Phê duyệt hoạt động chính thức cho đại lý này?")) return;
    setError(null);
    try {
      await customersApi.approve(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Phê duyệt thất bại");
    }
  }

  return (
    <Card>
      <CardHeader className="space-y-3 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <ListSearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Tìm theo công ty, người đại diện, SĐT, địa điểm..."
          />
          <div className="flex flex-wrap gap-2 sm:ml-auto">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setMapDialogOpen(true)}
            className="border-indigo-200 hover:bg-indigo-50 text-indigo-700 gap-1.5 font-medium shadow-sm"
          >
            <Map className="h-4 w-4" />
            Bản đồ thực địa
          </Button>

          <Button variant="outline" size="sm" onClick={() => void load()}>
            <RefreshCw className="h-4 w-4" />
            Tải lại
          </Button>

          <Button
            size="sm"
            onClick={openCreate}
            disabled={locations.length === 0}
          >
            <Plus className="h-4 w-4" />
            Thêm bằng tay
          </Button>
          </div>
        </div>
        {!loading && customers.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {filteredCustomers.length}
            {searchQuery.trim() ? " kết quả" : " khách hàng"}
          </p>
        )}
      </CardHeader>
      <CardContent>
        {error && (
          <p className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        {locations.length === 0 && !loading && (
          <p className="mb-4 text-sm text-amber-700">
            Chưa có địa điểm. Hãy đồng bộ hoặc thêm location trước khi tạo khách hàng.
          </p>
        )}
        {loading ? (
          <p className="text-sm text-muted-foreground">Đang tải...</p>
        ) : customers.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có khách hàng.</p>
        ) : filteredCustomers.length === 0 ? (
          <p className="text-sm text-muted-foreground">Không có kết quả phù hợp.</p>
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
          <Table className="min-w-[1080px]">
            <TableHeader>
              <TableRow>
                <TableHead className={listCol.id}>ID</TableHead>
                <TableHead className={listCol.name}>Công ty</TableHead>
                <TableHead className={listCol.type}>Loại hình</TableHead>
                <TableHead>Người đại diện</TableHead>
                <TableHead className={listCol.phone}>SĐT</TableHead>
                <TableHead className={listCol.balance}>Số dư</TableHead>
                <TableHead>Địa điểm</TableHead>
                <TableHead className={listCol.coords}>Tọa độ</TableHead>
                {isAdmin && <TableHead className={listCol.status}>Trạng thái</TableHead>}
                <TableHead className={listCol.actions}>Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedCustomers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className={listCell.nowrap}>{customer.id}</TableCell>
                  <TableCell className={`font-medium ${listCell.truncate}`}>
                    <button
                      type="button"
                      className="truncate text-left hover:underline"
                      onClick={() => openDetail(customer)}
                    >
                      {customer.companyName}
                    </button>
                  </TableCell>
                  <TableCell className={listCell.truncate}>{customer.businessType}</TableCell>
                  <TableCell className={listCell.truncate}>
                    {customer.representativeName}
                    <span className="block truncate text-xs text-muted-foreground">
                      {customer.position}
                    </span>
                  </TableCell>
                  <TableCell className={listCell.nowrap}>{customer.phoneNumber}</TableCell>
                  <TableCell className={listCell.money}>{formatMoney(customer.currentBalance)}</TableCell>
                  <TableCell className={`text-sm ${listCell.truncate}`}>
                    {locationMap[customer.locationId] ?? customer.locationId}
                  </TableCell>
                  <TableCell className={`text-xs text-muted-foreground ${listCell.nowrap}`}>
                    {customer.lat && customer.lng ? (
                      <span>{customer.lat}, {customer.lng}</span>
                    ) : (
                      <span className="text-muted-foreground/50">---</span>
                    )}
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      {customer.isApproved ? (
                        <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                          Đã duyệt
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-800 ring-1 ring-inset ring-yellow-600/20">
                          Chờ duyệt
                        </span>
                      )}
                    </TableCell>
                  )}
                  <TableCell className={listCell.actions}>
                    {isAdmin && !customer.isApproved && (
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Phê duyệt"
                        onClick={() => void handleApprove(customer.id)}
                      >
                        <Check className="h-4 w-4 text-green-600" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Xem chi tiết"
                      onClick={() => openDetail(customer)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {isAdmin && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Sửa"
                          onClick={() => openEdit(customer)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Xóa"
                          onClick={() => void handleDelete(customer.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </ListTableShell>
        )}
      </CardContent>

      <CustomerDetailDialog
        customerId={detailCustomerId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        canManageAccount={isAdmin}
        onAccountUpdated={() => void load()}
      />

      <FieldScanDialog
        open={mapDialogOpen}
        onOpenChange={setMapDialogOpen}
        onSelectStore={handleSelectFieldData}
      />

      {/* DIALOG CHÍNH ĐỂ THÊM / SỬA KHÁCH HÀNG */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {form.id === 0 ? "Thêm khách hàng (Chờ duyệt)" : "Sửa khách hàng"}
            </DialogTitle>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={(e) => void handleSubmit(e)}>
            <div className="grid gap-2">
              <Label>Địa điểm (Khu vực quản lý)</Label>
              <Select
                value={form.locationId}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, locationId: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn địa điểm" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={String(loc.id)}>
                      {locationLabel(loc)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="companyName">Tên công ty / Đại lý</Label>
              <Input
                id="companyName"
                required
                value={form.companyName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, companyName: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="businessType">Loại hình kinh doanh</Label>
              <Input
                id="businessType"
                required
                value={form.businessType}
                onChange={(e) =>
                  setForm((f) => ({ ...f, businessType: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2 optimiz-grid sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="representativeName">Người đại diện</Label>
                <Input
                  id="representativeName"
                  required
                  placeholder="Nhập tên người đại diện"
                  value={form.representativeName}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      representativeName: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="position">Chức vụ</Label>
                <Input
                  id="position"
                  required
                  value={form.position}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, position: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="phoneNumber">Số điện thoại</Label>
                <Input
                  id="phoneNumber"
                  required
                  placeholder="Nhập số điện thoại liên hệ"
                  value={form.phoneNumber}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, phoneNumber: e.target.value }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="currentBalance">Số dư ban đầu</Label>
                <Input
                  id="currentBalance"
                  type="number"
                  required
                  value={form.currentBalance}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, currentBalance: e.target.value }))
                  }
                />
              </div>
            </div>

            {/* PHẦN TỌA ĐỘ: Đồng bộ border chuẩn Slate nhẹ */}
            <div className="grid gap-2">
              <Label>Tọa độ đại lý</Label>
              <div className="flex items-center gap-2">
                <div className="grid grid-cols-2 gap-2 flex-1">
                  <Input
                    id="lat"
                    type="number"
                    step="any"
                    required
                    placeholder="Vĩ độ (Lat)"
                    value={form.lat}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, lat: e.target.value }))
                    }
                  />
                  <Input
                    id="lng"
                    type="number"
                    step="any"
                    required
                    placeholder="Kinh độ (Lng)"
                    value={form.lng}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, lng: e.target.value }))
                    }
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  title="Mở bản đồ lấy vị trí"
                  onClick={() => setInnerMapOpen(true)}
                  className="h-10 w-10 shrink-0 border-slate-200 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700"
                >
                  <MapPin className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {isAdmin && form.id !== 0 && (
              <Label
                htmlFor="isApproved"
                className="flex cursor-pointer select-none items-center gap-2 py-2"
              >
                <input
                  id="isApproved"
                  type="checkbox"
                  title="Kích hoạt trạng thái Đã duyệt"
                  aria-label="Kích hoạt trạng thái Đã duyệt"
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  checked={form.isApproved}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, isApproved: e.target.checked }))
                  }
                />
                Kích hoạt trạng thái Đã duyệt
              </Label>
            )}
            <Button type="submit" disabled={saving || !form.locationId}>
              {saving ? "Đang lưu..." : "Gửi yêu cầu lưu khách hàng"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG BẢN ĐỒ PHỤ */}
      <Dialog open={innerMapOpen} onOpenChange={setInnerMapOpen}>
        <DialogContent className="max-w-2xl h-[70vh] flex flex-col p-4 border-slate-200">
          <DialogHeader className="pb-2 shrink-0">
            <DialogTitle className="text-sm font-bold flex items-center gap-2 text-slate-800">
              <MapPin className="w-5 h-5 text-indigo-600" />
              Ghim tọa độ thực địa
            </DialogTitle>
          </DialogHeader>
          
          {/* ĐÃ LƯỢC BỎ TEXT TRẠNG THÁI GPS PHÍA PHẢI, CHỈ HIỂN THỊ TỌA ĐỘ ĐANG CHỌN */}
          <div className="text-xs font-mono p-2 bg-slate-50 text-slate-600 rounded border border-slate-200 shrink-0">
            📍 Điểm ghim: <span className="text-indigo-600 font-bold">{pickedCoords.lat.toFixed(6)}, {pickedCoords.lng.toFixed(6)}</span>
          </div>

          <div className="flex-1 w-full rounded-lg border border-slate-200 bg-slate-50 relative overflow-hidden z-0 mt-2">
            <div ref={innerMapContainerRef} className="w-full h-full" />
          </div>

          <div className="flex justify-end gap-2 pt-3 shrink-0">
            <Button variant="outline" size="sm" className="border-slate-200" onClick={() => setInnerMapOpen(false)}>
              Hủy bỏ
            </Button>
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={confirmPickedCoords}>
              Xác nhận & Áp dụng
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}