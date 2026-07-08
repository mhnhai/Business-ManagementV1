"use client";

import { useEffect, useState } from "react";
import { RefreshCw, MapPin } from "lucide-react";

import { usersApi, employeeLocationsApi } from "@/lib/api"; 
import { type User, type EmployeeLocationView } from "@/lib/types"; 
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShipperStatistic } from "../statistics/shipper-statistic";
import { SellerStatistic } from "../statistics/seller-statistic";
import { AssignmentMap } from "../statistics/assignment-map-statistic";

export function UserDashboard() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [myZones, setMyZones] = useState<EmployeeLocationView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function initDashboard() {
      try {
        setLoading(true);
        
        // 1. Lấy thông tin cá nhân của người đang đăng nhập trước
        const profileData = await usersApi.getProfile();
        const user = profileData.user;
        setCurrentUser(user);

        // 2. Sử dụng ID của chính user đó để gọi API lấy phân vùng tương ứng
        if (user?.id) {
          const userZones = await employeeLocationsApi.getByUser(user.id);
          setMyZones(userZones || []);
        }
      } catch (e) {
        console.error("Dashboard error:", e);
        setError(e instanceof Error ? e.message : "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    }
    void initDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-32">
        <RefreshCw className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error || !currentUser) {
    return (
      <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive font-medium max-w-md mx-auto mt-10 border border-destructive/20 text-center">
        {error || "Phiên làm việc hết hạn. Vui lòng đăng nhập lại."}
      </div>
    );
  }

  const userRole = currentUser.role?.toLowerCase();

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 mb-12">
      {/* PROFILE BANNER */}
      <Card className="bg-gradient-to-r from-slate-50 via-white to-slate-50 border-slate-200/80 shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-1">
              <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-indigo-50 flex items-center justify-center text-xl sm:text-2xl font-bold text-indigo-600 border border-indigo-100 shrink-0 mx-auto sm:mx-0">
                {currentUser.username?.[0]?.toUpperCase() || "E"}
              </div>
              <div className="space-y-2 text-center sm:text-left">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                    Chào mừng trở lại, {currentUser.fullName || currentUser.username}!
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground">Phân hệ đồng bộ hóa và quản lý thực địa tuyến đường.</p>
                </div>
                
                {/* HIỂN THỊ PHÂN VÙNG HOẠT ĐỘNG CỦA NHÂN VIÊN */}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 pt-1">
                  <span className="text-xs font-semibold text-slate-500 flex items-center gap-1 mr-1">
                    <MapPin className="h-3.5 w-3.5 text-indigo-500" /> Địa bàn phụ trách:
                  </span>
                  {myZones.length > 0 ? (
                    myZones.map((zone) => (
                      <Badge 
                        key={`${zone.userId}-${zone.locationId}`} // Khóa phức hợp duy nhất cho từng phân vùng của user
                        variant="secondary" 
                        className="bg-indigo-50 text-indigo-700 border border-indigo-100/80 text-xs px-2 py-0.5"
                      >
                        {zone.location?.ward || "N/A"}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                      Chưa được phân vùng hoạt động
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center justify-center lg:justify-end gap-2.5">
              <Badge variant="outline" className="bg-white px-3 py-1">Quyền: {currentUser.role}</Badge>
              <AssignmentMap />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* STATISTICS CONTENT */}
      <Card className="shadow-sm border-slate-200 overflow-hidden">
        <CardContent className="p-4 sm:p-6">
          {userRole === "shipper" ? (
            <ShipperStatistic userId={currentUser.id} userName={currentUser.fullName || currentUser.username} />
          ) : (
            <SellerStatistic userId={currentUser.id} userName={currentUser.fullName || currentUser.username} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}