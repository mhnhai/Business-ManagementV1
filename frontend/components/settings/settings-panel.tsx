"use client";

import { Settings } from "lucide-react";

import { SystemBackupPanel } from "@/components/users/system-backup-panel";
import { Card, CardContent } from "@/components/ui/card";

export function SettingsPanel() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <Card className="border-slate-200 bg-gradient-to-r from-slate-50 via-white to-slate-50">
        <CardContent className="p-6">
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Settings className="h-6 w-6 text-slate-600" />
            Cài đặt hệ thống
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Quản lý sao lưu, phục hồi dữ liệu và các tùy chọn quản trị.
          </p>
        </CardContent>
      </Card>

      <SystemBackupPanel />
    </div>
  );
}
