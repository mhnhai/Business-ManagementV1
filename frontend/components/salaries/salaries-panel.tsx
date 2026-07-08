"use client";

import { useCallback, useEffect, useState } from "react";
import { 
  Pencil, Plus, RefreshCw, Trash2, DollarSign, User as UserIcon, 
  Mail, Phone, Briefcase, Calculator, CheckCircle2, Clock, Filter,
  QrCode, CreditCard, Copy, Check
} from "lucide-react";

import { salariesApi, usersApi } from "@/lib/api";
import type { Salary, SalaryWithUser, User } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { ListTableShell } from "@/components/ui/list-table-shell";
import { listCol, listCell } from "@/lib/list-table-layout";
import { Badge } from "@/components/ui/badge";

const emptyForm = {
  id: 0,
  userId: "",
  month: String(new Date().getMonth() + 1),
  year: String(new Date().getFullYear()),
  baseSalary: "0",
  commission: "0",
  bonus: "0",
  isPaid: false,
  createdAt: String(new Date()),
  updatedAt: String(new Date())
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(value);
}

export function SalariesPanel() {
  const [salaries, setSalaries] = useState<SalaryWithUser[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterMonth, setFilterMonth] = useState<string>(String(new Date().getMonth() + 1));
  const [filterYear, setFilterYear] = useState<string>(String(new Date().getFullYear()));
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const [calcDialogOpen, setCalcDialogOpen] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [calcMonth, setCalcMonth] = useState(String(new Date().getMonth() + 1));
  const [calcYear, setCalcYear] = useState(String(new Date().getFullYear()));
  const [calcRate, setCalcRate] = useState("5"); 

  const [selectedUser, setSelectedUser] = useState<SalaryWithUser["user"] | null>(null);
  const [userModalOpen, setUserModalOpen] = useState(false);

  // --- THÊM STATE CHO MODAL QR CODE ---
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrData, setQrData] = useState<{
    qrUrl: string;
    accountName: string;
    accountNumber: string;
    bankName: string;
    amount: number;
    description: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [{ salaries: salaryList }, userList] = await Promise.all([
        salariesApi.getAll(),
        usersApi.getAll(),
      ]);
      setSalaries(salaryList);
      setUsers(userList);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setForm({
      ...emptyForm,
      userId: users[0] ? String(users[0].id) : "",
      month: filterMonth,
      year: filterYear,
    });
    setDialogOpen(true);
  }

  function openEdit(salary: Salary & { isPaid?: boolean | number }) {
    setForm({
      id: salary.id,
      userId: String(salary.userId),
      month: String(salary.month),
      year: String(salary.year),
      baseSalary: String(salary.baseSalary),
      commission: String(salary.commission),
      bonus: String(salary.bonus),
      isPaid: salary.isPaid === true,
      createdAt: String(salary.createdAt),
      updatedAt: String(salary.updatedAt)
    });
    setDialogOpen(true);
  }

  function showUserProfile(user: SalaryWithUser["user"]) {
    setSelectedUser(user);
    setUserModalOpen(true);
  }

  // --- SỬA LOGIC TRÍCH XUẤT THÔNG TIN NGÂN HÀNG (USERBANK) TẠI ĐÂY ---
  function handleGenerateQR(salary: SalaryWithUser) {
    const totalAmount = salary.baseSalary + salary.commission + salary.bonus;
    const userRaw = salary.user as any;

    if (!userRaw) {
      alert("Không tìm thấy dữ liệu nhân viên đính kèm với bản ghi lương này.");
      return;
    }

    // Dự phòng (Fallback) kiểm tra chéo: Nếu backend trả về dạng user.bankAccount hoặc user dạng phẳng (user.bankName, user.accountNumber)
    const bankName = userRaw.bankAccount?.bankName || userRaw.bankName || userRaw.bankCode;
    const accountNumber = userRaw.bankAccount?.accountNumber || userRaw.accountNumber || userRaw.bankAccountNumber;

    if (!bankName || !accountNumber) {
      console.log("Dữ liệu User nhận được bị thiếu trường ngân hàng:", userRaw);
      alert(`Nhân viên ${userRaw.fullName || 'này'} chưa được Admin cấu hình đầy đủ Ngân hàng và Số tài khoản thụ hưởng.`);
      return;
    }

    const description = `THANH TOAN LUONG KY ${salary.month}_${salary.year} NV ${userRaw.username || salary.userId}`;
    
    // Sử dụng API VietQR Template Compact (Sinh mã QR động)
    const encodedBank = encodeURIComponent(bankName);
    const encodedDesc = encodeURIComponent(description);
    const qrUrl = `https://img.vietqr.io/image/${encodedBank}-${accountNumber}-compact.png?amount=${totalAmount}&addInfo=${encodedDesc}&accountName=${encodeURIComponent(userRaw.fullName || '')}`;

    setQrData({
      qrUrl,
      accountName: userRaw.fullName || "Chưa cập nhật",
      accountNumber: accountNumber,
      bankName: bankName,
      amount: totalAmount,
      description
    });
    setQrModalOpen(true);
  }

  const handleCopyDesc = () => {
    if (!qrData) return;
    void navigator.clipboard.writeText(qrData.description);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const now = new Date().toISOString();
      
      const payload = {
        id: Number(form.id),
        userId: Number(form.userId),
        month: Number(form.month),
        year: Number(form.year),
        baseSalary: Number(form.baseSalary || 0),
        commission: Number(form.commission || 0),
        bonus: Number(form.bonus || 0),
        isPaid: Boolean(form.isPaid),
        createdAt: form.id === 0 ? now : form.createdAt,
        updatedAt: now
      };

      if (payload.id === 0) {
        await salariesApi.add(payload);
      } else {
        await salariesApi.update(payload);
      }

      setDialogOpen(false);
      await load();
    } catch (err: any) {
      setError(err.errors?.[0]?.info || err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleAutomatedCalculate(e: React.FormEvent) {
    e.preventDefault();
    setCalculating(true);
    setError(null);
    try {
      const rateFloat = Number(calcRate || 0) / 100;
      const res = await salariesApi.calculate({
        month: Number(calcMonth),
        year: Number(calcYear),
        commissionRate: rateFloat
      });

      setFilterMonth(calcMonth);
      setFilterYear(calcYear);

      setCalcDialogOpen(false);
      await load();
      alert(res.message || "Tính toán bảng lương thành công!");
    } catch (err: any) {
      setError(err.message || "Tính toán tự động thất bại.");
    } finally {
      setCalculating(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Xóa bản ghi lương này?")) return;
    try {
      await salariesApi.delete(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  const filteredSalaries = salaries.filter(
    (s) => String(s.month) === filterMonth && String(s.year) === filterYear
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2 text-xl font-bold">
          <DollarSign className="h-6 w-6 text-green-600" />
          Quản lý lương
        </CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void load()}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Tải lại
          </Button>
          
          <Button variant="secondary" size="sm" onClick={() => setCalcDialogOpen(true)}>
            <Calculator className="h-4 w-4 mr-1 text-blue-600" />
            Tính lương tự động
          </Button>

          <Button size="sm" onClick={openCreate} disabled={users.length === 0}>
            <Plus className="h-4 w-4 mr-1" />
            Thêm lương thủ công
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="flex flex-wrap items-center gap-3 bg-muted/40 p-3 rounded-lg mb-4 border text-sm">
          <div className="flex items-center gap-1.5 font-medium text-muted-foreground">
            <Filter className="h-4 w-4" />
            <span>Bộ lọc kỳ lương:</span>
          </div>
          
          <div className="w-32">
            <Select value={filterMonth} onValueChange={setFilterMonth}>
              <SelectTrigger className="h-9 bg-background">
                <SelectValue placeholder="Chọn tháng" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => String(i + 1)).map((m) => (
                  <SelectItem key={m} value={m}>Tháng {m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-32">
            <Select value={filterYear} onValueChange={setFilterYear}>
              <SelectTrigger className="h-9 bg-background">
                <SelectValue placeholder="Chọn năm" />
              </SelectTrigger>
              <SelectContent>
                {["2024", "2025", "2026", "2027"].map((y) => (
                  <SelectItem key={y} value={y}>Năm {y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="text-xs text-muted-foreground ml-auto italic">
            Tìm thấy {filteredSalaries.length} bản ghi cho Kỳ {filterMonth}/{filterYear}
          </div>
        </div>

        {error && (
          <p className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive font-medium">
            {error}
          </p>
        )}

        {loading ? (
          <div className="flex justify-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredSalaries.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg bg-muted/10">
            Không có dữ liệu bảng lương cho Tháng {filterMonth}/{filterYear}. 
            <p className="text-xs mt-1">Bạn có thể bấm nút "Tính lương tự động" để quét và tạo nhanh bảng lương hàng loạt.</p>
          </div>
        ) : (
          <ListTableShell>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={listCol.name}>Nhân viên</TableHead>
                <TableHead className={listCol.date}>Kỳ lương</TableHead>
                <TableHead className={listCol.money}>Lương cơ bản</TableHead>
                <TableHead className={listCol.money}>Hoa hồng</TableHead>
                <TableHead className={listCol.money}>Thưởng</TableHead>
                <TableHead className={listCol.money}>Tổng cộng</TableHead>
                <TableHead className={listCol.status}>Trạng thái</TableHead>
                <TableHead className={listCol.actions}>Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSalaries.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className={listCell.truncate}>
                    <button
                      onClick={() => showUserProfile(s.user)}
                      className="truncate font-semibold text-blue-600 hover:text-blue-800 hover:underline transition-colors text-left"
                    >
                      {s.user?.fullName || s.user?.username || `User #${s.userId}`}
                    </button>
                    <span className="block truncate text-xs text-muted-foreground italic">
                      @{s.user?.username}
                    </span>
                  </TableCell>
                  <TableCell className={`font-medium ${listCell.nowrap}`}>{`${s.month}/${s.year}`}</TableCell>
                  <TableCell className={listCell.money}>{formatCurrency(s.baseSalary)}</TableCell>
                  <TableCell className={listCell.money}>{formatCurrency(s.commission)}</TableCell>
                  <TableCell className={listCell.money}>{formatCurrency(s.bonus)}</TableCell>
                  <TableCell className={`font-bold text-green-700 ${listCell.money}`}>
                    {formatCurrency(s.baseSalary + s.commission + s.bonus)}
                  </TableCell>
                  
                  <TableCell>
                    {(s as any).isPaid ? (
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1 font-medium">
                        <CheckCircle2 className="h-3 w-3" /> Đã trả
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 gap-1 font-medium">
                        <Clock className="h-3 w-3" /> Chưa trả
                      </Badge>
                    )}
                  </TableCell>

                  <TableCell className={listCell.actions}>
                    <div className="flex justify-end gap-1">
                      {!(s as any).isPaid && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleGenerateQR(s)}
                          title="Quét mã QR chi trả nhanh"
                        >
                          <QrCode className="h-4 w-4 text-emerald-600" />
                        </Button>
                      )}

                      <Button variant="ghost" size="sm" onClick={() => openEdit(s)}>
                        <Pencil className="h-4 w-4 text-blue-500" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => void handleDelete(s.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </ListTableShell>
        )}
      </CardContent>

      {/* ==========================================================================
          DIALOG: HIỂN THỊ MÃ QR THANH TOÁN QUỐC GIA VIETQR
          ========================================================================== */}
      <Dialog open={qrModalOpen} onOpenChange={setQrModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700">
              <QrCode className="h-5 w-5" />
              Mã QR thanh toán lương
            </DialogTitle>
          </DialogHeader>
          
          {qrData && (
            <div className="flex flex-col items-center justify-center space-y-4 py-2">
              <div className="bg-white p-3 border-2 border-emerald-500 rounded-xl shadow-inner">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={qrData.qrUrl} 
                  alt="Mã QR chuyển khoản VietQR" 
                  className="w-64 h-64 object-contain"
                />
              </div>

              <div className="w-full space-y-2 bg-muted/50 p-3 rounded-lg text-sm border font-sans">
                <div className="flex justify-between items-center border-b pb-1">
                  <span className="text-muted-foreground flex items-center gap-1"><CreditCard className="h-3.5 w-3.5" /> Thụ hưởng:</span>
                  <span className="font-semibold text-slate-800">{qrData.accountName}</span>
                </div>
                <div className="flex justify-between items-center border-b pb-1">
                  <span className="text-muted-foreground">Số tài khoản:</span>
                  <span className="font-mono font-bold tracking-wide">{qrData.accountNumber} ({qrData.bankName})</span>
                </div>
                <div className="flex justify-between items-center border-b pb-1">
                  <span className="text-muted-foreground">Số tiền giải ngân:</span>
                  <span className="font-bold text-green-700 text-base">{formatCurrency(qrData.amount)}</span>
                </div>
                <div className="flex flex-col space-y-1 pt-1">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Nội dung chuyển khoản:</span>
                    <Button variant="ghost" size="lg" className="h-6 px-1.5 text-xs text-blue-600 gap-1" onClick={handleCopyDesc}>
                      {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                      {copied ? "Đã sao chép" : "Sao chép"}
                    </Button>
                  </div>
                  <p className="font-mono text-xs bg-white border p-1.5 rounded text-slate-600 break-all select-all">
                    {qrData.description}
                  </p>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground italic text-center w-full">
                * Khuyến khích sử dụng ứng dụng ngân hàng (Mobile Banking) quét mã để tự động điền đầy đủ thông tin chuẩn VietQR.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button className="w-full" variant="outline" onClick={() => setQrModalOpen(false)}>Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* ========================================================================== */}

      <Dialog open={calcDialogOpen} onOpenChange={setCalcDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-blue-600" />
              Tính toán hệ thống lương tự động
            </DialogTitle>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={(e) => void handleAutomatedCalculate(e)}>
            <div className="text-sm text-muted-foreground bg-blue-50 p-3 rounded-md border border-blue-100">
              Hệ thống sẽ quét toàn bộ dòng tiền thực thu (Payments) và tổng hợp số đại lý mới được duyệt để tự động tạo bảng lương cho tháng đã chọn.
            </div>
            
            <div className="grid grid-cols-2 gap-4">
               <div className="grid gap-2">
                 <Label htmlFor="calc-month">Tháng tính toán</Label>
                 <Input id="calc-month" type="number" min="1" max="12" value={calcMonth} onChange={(e) => setCalcMonth(e.target.value)} required />
               </div>
               <div className="grid gap-2">
                 <Label htmlFor="calc-year">Năm</Label>
                 <Input id="calc-year" type="number" min="2000" value={calcYear} onChange={(e) => setCalcYear(e.target.value)} required />
               </div>
            </div>

            <div className="grid gap-2">
               <Label htmlFor="calc-rate">Tỷ lệ hoa hồng (%)</Label>
               <Input id="calc-rate" type="number" step="0.1" min="0" max="100" value={calcRate} onChange={(e) => setCalcRate(e.target.value)} required />
            </div>

            <Button type="submit" disabled={calculating} className="w-full bg-blue-600 hover:bg-blue-700">
              {calculating ? "Đang quét dữ liệu & tính toán..." : "Chạy tính lương hàng loạt"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {form.id === 0 ? "Thêm bản ghi lương" : "Cập nhật lương"}
            </DialogTitle>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={(e) => void handleSubmit(e)}>
            <div className="grid gap-2">
              <Label>Nhân viên</Label>
              <Select
                value={form.userId}
                onValueChange={(v) => setForm((f) => ({ ...f, userId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn nhân viên" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.fullName || u.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
               <div className="grid gap-2">
                 <Label htmlFor="month">Tháng</Label>
                 <Input id="month" type="number" min="1" max="12" value={form.month} onChange={(e) => setForm((f) => ({ ...f, month: e.target.value }))} />
               </div>
               <div className="grid gap-2">
                 <Label htmlFor="year">Năm</Label>
                 <Input id="year" type="number" min="2000" value={form.year} onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))} />
               </div>
            </div>
            
            <div className="grid gap-2">
               <Label htmlFor="baseSalary">Lương cơ bản</Label>
               <Input id="baseSalary" type="number" value={form.baseSalary} onChange={(e) => setForm((f) => ({ ...f, baseSalary: e.target.value }))} />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
               <div className="grid gap-2">
                 <Label htmlFor="commission">Hoa hồng</Label>
                 <Input id="commission" type="number" value={form.commission} onChange={(e) => setForm((f) => ({ ...f, commission: e.target.value }))} />
               </div>
               <div className="grid gap-2">
                 <Label htmlFor="bonus">Thưởng</Label>
                 <Input id="bonus" type="number" value={form.bonus} onChange={(e) => setForm((f) => ({ ...f, bonus: e.target.value }))} />
               </div>
            </div>

            <div className="grid gap-2">
              <Label>Trạng thái thanh toán</Label>
              <Select
                value={String(form.isPaid)}
                onValueChange={(v) => setForm((f) => ({ ...f, isPaid: v === "true" }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="false">Chưa thanh toán (Treo lương)</SelectItem>
                  <SelectItem value="true">Đã thanh toán (Giải ngân thành công)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" disabled={saving || !form.userId} className="w-full">
              {saving ? "Đang xử lý..." : "Xác nhận"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={userModalOpen} onOpenChange={setUserModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserIcon className="h-5 w-5" />
              Hồ sơ nhân viên
            </DialogTitle>
          </DialogHeader>
          {selectedUser ? (
            <div className="space-y-6 py-4">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
                  {selectedUser.username[0].toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xl font-bold">{selectedUser.fullName || selectedUser.username}</h3>
                  <Badge variant="secondary" className="mt-1 capitalize">
                    {selectedUser.role}
                  </Badge>
                </div>
              </div>

              <div className="grid gap-4 border-t pt-4">
                <div className="flex items-center gap-3">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <div className="grid gap-0.5">
                    <p className="text-xs text-muted-foreground">Phòng ban</p>
                    <p className="text-sm font-medium">{selectedUser.department || "N/A"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div className="grid gap-0.5">
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="text-sm font-medium">{selectedUser.email || "N/A"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div className="grid gap-0.5">
                    <p className="text-xs text-muted-foreground">Số điện thoại</p>
                    <p className="text-sm font-medium">{selectedUser.phoneNumber || "N/A"}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-center py-4 text-muted-foreground">Không tìm thấy thông tin nhân viên.</p>
          )}
          <Button onClick={() => setUserModalOpen(false)} variant="outline" className="w-full">
            Đóng
          </Button>
        </DialogContent>
      </Dialog>
    </Card>
  );
}