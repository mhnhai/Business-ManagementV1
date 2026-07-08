"use client";

import { useEffect, useRef, useState } from "react";
import type { Map, Marker } from "leaflet";
import { MapPin, RefreshCw, Loader2, Store, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const CACHE_KEY = "last_known_field_coords";

interface OsmStore {
  id: number;
  type: string;
  lat: number;
  lng: number;
  name: string;
  phone: string;
}

interface OsmTags {
  name?: string;
  "name:vi"?: string;
  brand?: string;
  alt_name?: string;
  shop?: string;
  amenity?: string;
  craft?: string;
  phone?: string;
  mobile?: string;
  "contact:phone"?: string;
  "contact:mobile"?: string;
}

interface OverpassElement {
  id: number;
  lat: number;
  lon: number;
  tags?: OsmTags;
}

function normalizeStoreData(tags: OsmTags, elId: number) {
  const finalName =
    tags["name:vi"] ||
    tags.name ||
    tags.brand ||
    tags.alt_name ||
    `Cửa hàng chưa đặt tên (#${elId})`;
  const finalType = tags.shop || tags.amenity || tags.craft || "Đại lý";
  let finalPhone =
    tags.phone ||
    tags.mobile ||
    tags["contact:phone"] ||
    tags["contact:mobile"] ||
    "";

  finalPhone = finalPhone.replace(/[\s\.\-\(\)]/g, "");
  if (finalPhone.startsWith("+84")) {
    finalPhone = "0" + finalPhone.substring(3);
  }

  return {
    name: finalName,
    type: finalType.toUpperCase(),
    phone: finalPhone,
  };
}

interface FieldScanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectStore: (storeData: {
    companyName: string;
    businessType: string;
    lat: string;
    lng: string;
    phoneNumber: string;
  }) => void;
}

export function FieldScanDialog({ open, onOpenChange, onSelectStore }: FieldScanDialogProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const storeMarkersRef = useRef<Marker[]>([]);
  
  const isScanningRef = useRef<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [scanStatus, setScanStatus] = useState<string>("Đang chuẩn bị...");
  const [loading, setLoading] = useState<boolean>(false);
  const [nearbyStores, setNearbyStores] = useState<OsmStore[]>([]);

  // Hàm quét chính - Đã đưa về dạng gọi callback trực tiếp chống chặn GPS
  const startFieldScan = () => {
    if (isScanningRef.current) return;
    
    if (typeof window === "undefined" || !navigator.geolocation) {
      setScanStatus("Trình duyệt không hỗ trợ định vị GPS.");
      return;
    }

    isScanningRef.current = true;
    setLoading(true);
    setScanStatus("Đang thiết lập kết nối vệ tinh GPS (Vui lòng chờ phê duyệt quyền)...");

    // Hủy request Overpass cũ nếu có
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();
    const currentSignal = abortControllerRef.current.signal;

    // Gọi TRỰC TIẾP đồng bộ tại đây để trình duyệt chấp nhận quyền click của User
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude: lat, longitude: lng } = position.coords;

        try {
          // Lưu vị trí vào cache lập tức
          localStorage.setItem(CACHE_KEY, JSON.stringify({ lat, lng }));

          const L = (await import("leaflet")).default;
          await import("leaflet/dist/leaflet.css");

          if (!mapContainerRef.current || currentSignal.aborted) {
            isScanningRef.current = false;
            setLoading(false);
            return;
          }

          // Dọn sạch các marker cũ
          storeMarkersRef.current.forEach((m) => m.remove());
          storeMarkersRef.current = [];

          // Khởi tạo hoặc cập nhật Map Instance
          if (!mapInstanceRef.current) {
            const createdMap = L.map(mapContainerRef.current).setView([lat, lng], 18);
            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
              attribution: "© OpenStreetMap contributors",
            }).addTo(createdMap);
            mapInstanceRef.current = createdMap;
          } else {
            mapInstanceRef.current.setView([lat, lng], 18);
          }
          const map = mapInstanceRef.current;
          if (!map) {
            isScanningRef.current = false;
            setLoading(false);
            return;
          }

          if (markerRef.current) {
            markerRef.current.setLatLng([lat, lng]);
          } else {
            markerRef.current = L.marker([lat, lng]).addTo(map);
          }
          markerRef.current.bindPopup("<b>📍 Vị trí hiện tại của bạn</b>").openPopup();

          setScanStatus("Tín hiệu GPS tốt! Đang tìm kiếm hệ thống cửa hàng xung quanh...");

          const radius = 500; 
          const overpassQuery = `
            [out:json][timeout:30];
            (
              node["shop"](around:${radius},${lat},${lng});
              node["amenity"](around:${radius},${lat},${lng});
              node["craft"](around:${radius},${lat},${lng});
            );
            out body;
          `;

          const overpassUrl = `https://overpass.openstreetmap.fr/api/interpreter?data=${encodeURIComponent(overpassQuery)}`;
          const overpassRes = await fetch(overpassUrl, { signal: currentSignal });

          if (overpassRes.ok) {
            const overpassData = await overpassRes.json();
            const elements = (overpassData.elements ?? []) as OverpassElement[];
            const storesFound: OsmStore[] = [];

            const storeIcon = L.icon({
              iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
              shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
              iconSize: [25, 41],
              iconAnchor: [12, 41],
              popupAnchor: [1, -34],
              shadowSize: [41, 41],
            });

            elements.forEach((el) => {
              const tags = el.tags ?? {};
              const cleanData = normalizeStoreData(tags, el.id);

              storesFound.push({
                id: el.id,
                name: cleanData.name,
                type: cleanData.type,
                phone: cleanData.phone,
                lat: el.lat,
                lng: el.lon
              });

              const sMarker = L.marker([el.lat, el.lon], { icon: storeIcon })
                .addTo(map)
                .bindPopup(`<b>${cleanData.name}</b><br/><span style="color:#ef4444;">${cleanData.type}</span>`);
              
              storeMarkersRef.current.push(sMarker);
            });

            setNearbyStores(storesFound);
            setScanStatus(`Quét hoàn tất! Phát hiện ${elements.length} địa điểm trong bán kính 500m.`);
          } else {
            setScanStatus("Không thể kết nối tới hệ thống dữ liệu Overpass.");
          }
        } catch (err: unknown) {
          const isAbort =
            typeof err === "object" &&
            err !== null &&
            "name" in err &&
            (err as { name: unknown }).name === "AbortError";
          if (!isAbort) {
            console.error(err);
            setScanStatus("Lỗi đồng bộ bản đồ vệ tinh.");
          }
        } finally {
          isScanningRef.current = false;
          setLoading(false);
        }
      },
      (err) => {
        console.error(err);
        if (err.code === 1) {
          setScanStatus("Bị từ chối quyền truy cập GPS. Vui lòng cho phép định vị trên trình duyệt.");
        } else if (err.code === 3) {
          setScanStatus("Tìm kiếm vị trí quá giờ (Timeout). Hãy thử bấm 'Quét lại khu vực'.");
        } else {
          setScanStatus("Lỗi phần cứng GPS hoặc không có tín hiệu mạng.");
        }
        isScanningRef.current = false;
        setLoading(false);
      },
      { 
        enableHighAccuracy: true, 
        timeout: 25000, 
        maximumAge: 0 
      }
    );
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setNearbyStores([]);
      isScanningRef.current = false;
      abortControllerRef.current?.abort();
    }
    onOpenChange(nextOpen);
  };

  // Load trước bản đồ từ Cache lúc vừa mở Dialog (Nếu có cache) để tối ưu UX tốc độ
  useEffect(() => {
    if (!open) return;

    const cachedData = localStorage.getItem(CACHE_KEY);
    if (cachedData && mapContainerRef.current && !mapInstanceRef.current) {
      const cachedCoords = JSON.parse(cachedData) as { lat: number; lng: number };
      import("leaflet").then((LModule) => {
        const L = LModule.default;
        import("leaflet/dist/leaflet.css").then(() => {
          if (!mapInstanceRef.current && mapContainerRef.current) {
            const map = L.map(mapContainerRef.current).setView(
              [cachedCoords.lat, cachedCoords.lng],
              18,
            );
            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
              attribution: "© OpenStreetMap contributors",
            }).addTo(map);
            mapInstanceRef.current = map;
            markerRef.current = L.marker([cachedCoords.lat, cachedCoords.lng]).addTo(map);
            markerRef.current.bindPopup("<b>📍 Vị trí quét gần nhất</b>").openPopup();
          }
        });
      });
    }

    const scanTimer = window.setTimeout(() => {
      startFieldScan();
    }, 0);

    return () => {
      window.clearTimeout(scanTimer);
    };
  }, [open]);

  // Hủy map instance khi component unmount hẳn khỏi DOM
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
        storeMarkersRef.current = [];
      }
    };
  }, []);

  const handleSelectClick = (store: OsmStore) => {
    onSelectStore({
      companyName: store.name,
      businessType: store.type,
      lat: String(store.lat),
      lng: String(store.lng),
      phoneNumber: store.phone
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex flex-row items-center justify-between border-b pb-3 space-y-0 shrink-0">
          <DialogTitle className="text-md font-bold flex items-center gap-2">
            <MapPin className="h-5 w-5 text-indigo-600" />
            Trợ lý định vị thực địa (Bán kính 500m)
          </DialogTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={startFieldScan} 
            disabled={loading} 
            className="h-8 gap-1 text-xs select-none min-w-[150px] transition-all"
          >
            {loading ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin text-indigo-600" />
                Đang giữ kết nối GPS...
              </>
            ) : (
              <>
                <RefreshCw className="h-3 w-3" />
                Quét lại khu vực
              </>
            )}
          </Button>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-3 flex-1 overflow-hidden min-h-[500px]">
          
          {/* CỘT TRÁI: Bản đồ */}
          <div className="lg:col-span-7 flex flex-col space-y-2">
            <div className="text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100 font-medium text-slate-700 transition-all duration-200">
              Trạng thái: <span className={loading ? "text-amber-600 font-semibold animate-pulse" : "text-indigo-600"}>{scanStatus}</span>
            </div>
            <div
              ref={mapContainerRef}
              className="w-full flex-1 rounded-xl border border-slate-200 bg-slate-50 relative z-0 shadow-inner min-h-[250px] lg:min-h-0"
            />
          </div>

          {/* CỘT PHẢI: Danh sách các ô thông tin để bấm */}
          <div className="lg:col-span-5 flex flex-col space-y-3 overflow-hidden">
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 shrink-0 px-1">
              <Store className="h-4 w-4 text-indigo-600" />
              Danh sách cửa hàng thực địa:
            </h4>

            {nearbyStores.length > 0 ? (
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 pb-2">
                {nearbyStores.map((store) => (
                  <div 
                    key={store.id} 
                    className="p-3 bg-white rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-sm transition-all flex flex-col justify-between space-y-3 group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <h5 className="font-bold text-slate-900 text-sm leading-snug group-hover:text-indigo-600 transition-colors">
                          {store.name}
                        </h5>
                        {store.phone && (
                          <div className="text-xs font-medium text-emerald-600">
                            📞 SĐT hệ thống: {store.phone}
                          </div>
                        )}
                        <div className="text-[10px] text-slate-400 font-mono">
                          Tọa độ: {store.lat.toFixed(5)}, {store.lng.toFixed(5)}
                        </div>
                      </div>
                      <Badge className="text-[9px] bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-md uppercase tracking-wider font-semibold shrink-0">
                        {store.type}
                      </Badge>
                    </div>

                    <Button 
                      size="sm" 
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 w-full gap-1.5 shadow-sm font-medium shrink-0"
                      onClick={() => handleSelectClick(store)}
                    >
                      <CheckCircle2 className="h-4 w-4" /> Chọn đại lý này & Điền Form
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-xs text-muted-foreground bg-slate-50 p-6 text-center rounded-xl border border-dashed">
                {loading ? (
                  <>
                    <Loader2 className="h-6 w-6 animate-spin text-indigo-600 mb-2" />
                    Đang giữ luồng định vị, vui lòng đợi trong giây lát...
                  </>
                ) : (
                  "Nhấp vào nút 'Quét lại khu vực' phía trên nếu thiết bị chưa kích hoạt kịp định vị GPS."
                )}
              </div>
            )}
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}