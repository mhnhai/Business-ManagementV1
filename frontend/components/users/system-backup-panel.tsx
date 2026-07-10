"use client";

import { useCallback, useRef, useState } from "react";
import {
  AlertTriangle,
  Database,
  Download,
  FileJson,
  Loader2,
  Upload,
} from "lucide-react";
import { toast } from "react-toastify";

import { backupApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function buildBackupFilename() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `backup_seller_system_${yyyy}_${mm}_${dd}.json`;
}

function isBackupFile(file: File) {
  return file.name.endsWith(".json") || file.type === "application/json";
}

export function SystemBackupPanel() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [exporting, setExporting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      await backupApi.exportData();
      toast.success("Đã tải xuống file sao lưu thành công");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Không thể sao lưu dữ liệu";
      toast.error(message);
    } finally {
      setExporting(false);
    }
  };

  const pickFile = useCallback((file: File | null) => {
    if (!file) return;
    if (!isBackupFile(file)) {
      toast.error("Vui lòng chọn file JSON backup (.json)");
      return;
    }
    setSelectedFile(file);
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDragOver(false);
      const file = event.dataTransfer.files?.[0] ?? null;
      pickFile(file);
    },
    [pickFile],
  );

  const readBackupFile = (file: File): Promise<unknown> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const text = String(reader.result ?? "");
          resolve(JSON.parse(text));
        } catch {
          reject(new Error("File JSON không hợp lệ"));
        }
      };
      reader.onerror = () => reject(new Error("Không thể đọc file backup"));
      reader.readAsText(file, "utf-8");
    });

  const handleRestore = async () => {
    if (!selectedFile) {
      toast.error("Vui lòng chọn file backup trước khi phục hồi");
      return;
    }

    setConfirmOpen(false);
    setRestoring(true);
    try {
      const payload = await readBackupFile(selectedFile);
      const result = await backupApi.restore(payload);
      const total = Object.values(result.counts).reduce((sum, n) => sum + n, 0);
      toast.success(`Phục hồi thành công ${total} bản ghi`);
      setSelectedFile(null);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Phục hồi dữ liệu thất bại";
      toast.error(message);
    } finally {
      setRestoring(false);
    }
  };

  return (
    <>
      <Card className="border-amber-100 bg-gradient-to-r from-amber-50/80 via-white to-orange-50/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Database className="h-5 w-5 text-amber-600" />
            Sao lưu &amp; Phục hồi hệ thống
          </CardTitle>
          <CardDescription>
            Xuất toàn bộ dữ liệu ra file JSON hoặc phục hồi từ file backup khi
            gặp sự cố.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3 rounded-lg border bg-background/80 p-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Download className="h-4 w-4 text-indigo-600" />
              Sao lưu dữ liệu
            </h3>
            <p className="text-sm text-muted-foreground">
              Tải xuống file{" "}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">
                {buildBackupFilename()}
              </code>{" "}
              chứa toàn bộ bảng dữ liệu hệ thống.
            </p>
            <Button onClick={handleExport} disabled={exporting || restoring}>
              {exporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Sao lưu dữ liệu ngay
            </Button>
          </div>

          <div className="space-y-3 rounded-lg border bg-background/80 p-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Upload className="h-4 w-4 text-orange-600" />
              Phục hồi hệ thống
            </h3>
            <p className="text-sm text-muted-foreground">
              Kéo-thả hoặc chọn file backup JSON đã lưu trước đó. Thao tác này
              sẽ xóa dữ liệu hiện tại và nạp lại từ file.
            </p>

            <div
              role="button"
              tabIndex={0}
              onDragOver={(event) => {
                event.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  inputRef.current?.click();
                }
              }}
              className={`flex min-h-[120px] cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-4 text-center transition-colors ${
                dragOver
                  ? "border-amber-500 bg-amber-50"
                  : "border-muted-foreground/30 hover:border-amber-400 hover:bg-muted/40"
              }`}
            >
              <FileJson className="h-8 w-8 text-muted-foreground" />
              {selectedFile ? (
                <span className="text-sm font-medium">{selectedFile.name}</span>
              ) : (
                <span className="text-sm text-muted-foreground">
                  Kéo-thả file backup vào đây hoặc bấm để chọn
                </span>
              )}
              <input
                ref={inputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={(event) =>
                  pickFile(event.target.files?.[0] ?? null)
                }
              />
            </div>

            <Button
              variant="destructive"
              onClick={() => setConfirmOpen(true)}
              disabled={!selectedFile || restoring || exporting}
            >
              {restoring ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Bắt đầu phục hồi
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Xác nhận phục hồi dữ liệu
            </DialogTitle>
            <DialogDescription>
              Hành động này sẽ xóa toàn bộ dữ liệu hiện tại trong database và
              thay thế bằng dữ liệu từ file{" "}
              <strong>{selectedFile?.name ?? "backup"}</strong>. Bạn không thể
              hoàn tác sau khi bắt đầu.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Hủy
            </Button>
            <Button variant="destructive" onClick={handleRestore}>
              Xác nhận phục hồi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
