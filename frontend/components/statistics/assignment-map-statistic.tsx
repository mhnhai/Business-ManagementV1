"use client";

import { useCallback, useEffect, useState } from "react";
import { 
  MapPin, RefreshCw, Calendar, Users, 
  Map, ClipboardList, Info, Eye, CheckCircle2, Search
} from "lucide-react";

import { usersApi, locationsApi } from "@/lib/api";
import { type Location } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface OccupiedProvince {
  employeeName: string;
  activityContent: string;
  customerName: string;
}

export function AssignmentMap() {
  const [isOpen, setIsOpen] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]); 
  const [occupiedProvinces, setOccupiedProvinces] = useState<Record<string, OccupiedProvince>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Nạp đồng thời danh sách địa bàn hệ thống và trạng thái bám chốt
  const loadMapStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [locationsData, statsData] = await Promise.all([
        locationsApi.getAll(),
        usersApi.getMapStatus(selectedDate)
      ]);
      
      setLocations(locationsData || []);
      setOccupiedProvinces(statsData?.occupiedProvinces || {});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể tải dữ liệu bản đồ phân công");
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    if (isOpen) {
      void loadMapStats();
    }
  }, [isOpen, loadMapStats]);

  // Kiểm tra so khớp xem xã/phường có ai đăng ký chưa
  const getAreaDetails = (wardName: string) => {
    const matchedKey = Object.keys(occupiedProvinces).find(key => 
      key.toLowerCase().includes(wardName.toLowerCase()) || 
      wardName.toLowerCase().includes(key.toLowerCase())
    );
    return matchedKey ? occupiedProvinces[matchedKey] : null;
  };

  // Nhóm các xã/phường theo từng Quận/Huyện để hiển thị dạng sơ đồ khối
  const groupedLocations = locations.reduce((acc, loc) => {
    const district = loc.province || "Chưa phân loại"; // Tên Quận/Huyện
    if (!acc[district]) acc[district] = [];
    
    // Tránh trùng lặp xã trong cùng 1 quận
    if (!acc[district].some(item => item.ward === loc.ward)) {
      acc[district].push(loc);
    }
    return acc;
  }, {} as Record<string, Location[]>);

  const activeAssignmentsArray = Object.entries(occupiedProvinces);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 transition-all shadow-sm">
          <Map className="h-4 w-4 text-indigo-500" />
          <span>Xem Sơ Đồ Địa Bàn Cần Thơ</span>
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse ml-1" />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-7xl w-[95vw] max-h-[92vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Eye className="h-5 w-5 text-indigo-600" /> Hệ Thống Check Địa Bàn & Tránh Trùng Lịch
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
            Bản đồ lưới hiển thị toàn bộ Xã/Phường được đồng bộ trực tiếp từ API hệ thống. Ô <span className="text-red-600 font-bold">Màu Đỏ</span> là đã có người đăng ký chốt lịch, ô <span className="text-slate-500 font-bold">Màu Trắng</span> là địa bàn trống.
          </DialogDescription>
        </DialogHeader>

        {/* Bộ lọc Ngày & Thanh tìm kiếm nhanh địa bàn */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-lg border my-2">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <Calendar className="h-4 w-4 text-slate-500" />
              <span className="font-semibold">Lịch trình ngày:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="border rounded px-2 py-1 bg-background text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            
            <div className="relative w-60">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Tìm nhanh xã/phường..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
          </div>

          <Button variant="ghost" size="sm" onClick={() => void loadMapStats()} disabled={loading} className="h-8 gap-1 text-xs">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Tải lại dữ liệu
          </Button>
        </div>

        {loading ? (
          <div className="flex flex-col justify-center items-center py-32 space-y-2">
            <RefreshCw className="h-8 w-8 animate-spin text-indigo-600" />
            <p className="text-xs text-muted-foreground font-medium">Đang tải danh sách địa bàn và đối soát lịch trùng...</p>
          </div>
        ) : error ? (
          <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive font-medium my-4">
            {error}
          </div>
        ) : (
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-3 items-start mt-2">
            
            {/* Cột 1 & 2: SƠ ĐỒ LƯỚI PHÂN RÃ TOÀN BỘ ĐỊA BÀN THEO QUẬN HUYỆN */}
            <div className="lg:col-span-2 space-y-6">
              {Object.entries(groupedLocations).map(([district, wards]) => {
                // Lọc phường xã theo ô tìm kiếm nếu có
                const filteredWards = wards.filter(w => 
                  w.ward.toLowerCase().includes(searchTerm.toLowerCase())
                );

                if (filteredWards.length === 0) return null;

                return (
                  <Card key={district} className="shadow-sm border-slate-200 overflow-hidden">
                    <CardHeader className="py-2.5 bg-slate-100/70 border-b">
                      <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
                        <span>📍 {district}</span>
                        <Badge variant="secondary" className="text-[10px] bg-slate-200/60 text-slate-600">
                          {filteredWards.length} Xã/Phường
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3">
                      {/* Grid chứa các xã/phường */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {filteredWards.map((loc) => {
                          const assignment = getAreaDetails(loc.ward);
                          const isOccupied = !!assignment;

                          return (
                            <div
                              key={loc.ward}
                              title={isOccupied ? `Đã trùng: ${assignment.employeeName} (${assignment.activityContent})` : "Địa bàn trống"}
                              className={`p-2.5 rounded-md border text-left transition-all relative overflow-hidden group select-none ${
                                isOccupied
                                  ? "bg-red-50/90 border-red-200 hover:bg-red-100/80"
                                  : "bg-white border-slate-200 hover:border-indigo-400 hover:shadow-sm"
                              }`}
                            >
                              <div className="font-bold text-slate-800 text-[11px] truncate">
                                {loc.ward}
                              </div>
                              
                              {isOccupied ? (
                                <div className="mt-1 text-[10px] leading-tight text-red-700">
                                  <p className="font-semibold truncate">👤 {assignment.employeeName}</p>
                                  <p className="text-[9px] text-red-600/80 truncate">{assignment.activityContent}</p>
                                </div>
                              ) : (
                                <span className="inline-block mt-1 text-[9px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                                  Trống
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Cột 3: BẢNG SỐ LIỆU VÀ NHẬT KÝ CHI TIẾT */}
            <div className="space-y-4 sticky top-2">
              <Card className="shadow-sm border-slate-200">
                <CardHeader className="py-3 bg-slate-50/50 border-b">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <ClipboardList className="h-4 w-4 text-blue-500" /> Thống kê độ phủ
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-2.5 flex justify-between items-center text-xs">
                  <span className="text-muted-foreground font-medium">Tổng số xã/phường hệ thống:</span>
                  <Badge variant="outline" className="font-bold text-slate-700 bg-slate-50">{locations.length}</Badge>
                </CardContent>
                <CardContent className="py-2.5 border-t flex justify-between items-center text-xs">
                  <span className="text-muted-foreground font-medium">Địa bàn đã có lịch bám chốt:</span>
                  <Badge className="font-bold bg-red-500 text-white hover:bg-red-500">{activeAssignmentsArray.length} vùng</Badge>
                </CardContent>
              </Card>

              <Card className="shadow-sm border-slate-200">
                <CardHeader className="py-3 bg-slate-50/50 border-b">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-amber-500" /> Danh sách nhân sự thực địa hôm nay
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 max-h-[400px] overflow-y-auto">
                  {activeAssignmentsArray.length === 0 ? (
                    <div className="text-center py-12 text-xs text-muted-foreground space-y-1 p-4">
                      <Info className="h-6 w-6 text-muted-foreground/40 mx-auto mb-1" />
                      <p className="font-medium text-emerald-600 flex items-center justify-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Toàn bộ địa bàn đang trống!
                      </p>
                      <p className="text-[11px] text-muted-foreground/70">Mọi người có thể thoải mái chọn tuyến công tác phù hợp.</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader className="bg-slate-50 sticky top-0 z-10">
                        <TableRow>
                          <TableHead className="text-[11px] h-8">Địa bàn</TableHead>
                          <TableHead className="text-[11px] h-8">Nhân sự</TableHead>
                          <TableHead className="text-[11px] h-8">Tác vụ</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {activeAssignmentsArray.map(([wardName, details], idx) => (
                          <TableRow key={idx} className="hover:bg-slate-50/80">
                            <TableCell className="font-bold text-slate-900 text-[11px] py-2">
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3 text-red-500 shrink-0" />
                                <span className="truncate max-w-[85px]" title={wardName}>{wardName}</span>
                              </div>
                            </TableCell>
                            <TableCell className="font-semibold text-indigo-600 text-[11px] py-2">
                              {details.employeeName}
                            </TableCell>
                            <TableCell className="py-2">
                              <div className="text-[10px] space-y-0.5 leading-tight">
                                <p className="font-medium text-slate-700 truncate max-w-[110px]" title={details.activityContent}>
                                  {details.activityContent}
                                </p>
                                <p className="text-[9px] text-muted-foreground truncate max-w-[110px]" title={details.customerName}>
                                  Khách: {details.customerName}
                                </p>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>

          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}