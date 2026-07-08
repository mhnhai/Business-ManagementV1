"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, RefreshCw, Users } from "lucide-react";

import { SellerStatistic } from "@/components/statistics/seller-statistic";
import { usersApi } from "@/lib/api";
import type { UserPublic } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

function isSalesEmployee(user: UserPublic) {
  const role = user.role?.toLowerCase() ?? "";
  return role === "employee" || (role !== "admin" && role !== "shipper");
}

export function AdminSalesDashboard() {
  const [sellers, setSellers] = useState<UserPublic[]>([]);
  const [selectedSellerId, setSelectedSellerId] = useState<string>("all");
  const [loadingSellers, setLoadingSellers] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const users = await usersApi.getAll();
        setSellers(users.filter(isSalesEmployee));
      } finally {
        setLoadingSellers(false);
      }
    })();
  }, []);

  const selectedLabel = useMemo(() => {
    if (selectedSellerId === "all") {
      return "Tất cả nhân viên kinh doanh";
    }
    const seller = sellers.find((s) => String(s.id) === selectedSellerId);
    return seller?.fullName || seller?.username || "Nhân viên";
  }, [selectedSellerId, sellers]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <Card className="bg-gradient-to-r from-indigo-50 via-white to-blue-50 border-indigo-100">
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <BarChart3 className="h-6 w-6 text-indigo-600" />
                Thống kê doanh số (Admin)
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Xem tổng hợp toàn bộ seller hoặc lọc theo từng nhân viên kinh doanh.
              </p>
            </div>

            <div className="grid gap-2 min-w-[240px]">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                Lọc theo seller
              </Label>
              <Select
                value={selectedSellerId}
                onValueChange={setSelectedSellerId}
                disabled={loadingSellers}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn seller" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả seller</SelectItem>
                  {sellers.map((seller) => (
                    <SelectItem key={seller.id} value={String(seller.id)}>
                      {seller.fullName || seller.username}
                      {seller.department ? ` · ${seller.department}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="bg-card rounded-xl border p-6 shadow-sm">
        {loadingSellers ? (
          <div className="flex justify-center py-16">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <SellerStatistic
            key={selectedSellerId}
            userId={selectedSellerId}
            userName={selectedLabel}
          />
        )}
      </div>
    </div>
  );
}
