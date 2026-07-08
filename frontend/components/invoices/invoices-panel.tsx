"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";

import { invoicesApi } from "@/lib/api";
import type { Invoice } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
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

const emptyForm = {
  id: 0,
  totalAmount: "",
  date: "",
};

function formatDate(value: string) {
  return new Date(value).toLocaleString("vi-VN");
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

export function InvoicesPanel() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await invoicesApi.getAll();
      setInvoices(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được dữ liệu");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(invoice: Invoice) {
    setForm({
      id: invoice.id,
      totalAmount: String(invoice.totalAmount),
      date: invoice.date.slice(0, 16),
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
        totalAmount: Number(form.totalAmount),
        date: new Date(form.date).toISOString(),
      };
      if (form.id === 0) {
        await invoicesApi.add(payload);
      } else {
        await invoicesApi.update(payload);
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
    if (!confirm("Xóa hóa đơn này?")) return;
    setError(null);
    try {
      await invoicesApi.delete(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xóa thất bại");
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-end space-y-0 pb-4">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void load()}>
            <RefreshCw className="h-4 w-4" />
            Tải lại
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Thêm
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <p className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        {loading ? (
          <p className="text-sm text-muted-foreground">Đang tải...</p>
        ) : (
          <ListTableShell>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={listCol.id}>ID</TableHead>
                <TableHead className={listCol.money}>Số tiền</TableHead>
                <TableHead className={listCol.datetime}>Ngày</TableHead>
                <TableHead className={listCol.actions}>Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className={listCell.nowrap}>{invoice.id}</TableCell>
                  <TableCell className={listCell.money}>{formatMoney(invoice.totalAmount)}</TableCell>
                  <TableCell className={listCell.nowrap}>{formatDate(invoice.date)}</TableCell>
                  <TableCell className={listCell.actions}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(invoice)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void handleDelete(invoice.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </ListTableShell>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {form.id === 0 ? "Thêm hóa đơn" : "Sửa hóa đơn"}
            </DialogTitle>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={(e) => void handleSubmit(e)}>
            <div className="grid gap-2">
              <Label htmlFor="totalAmount">Số tiền</Label>
              <Input
                id="totalAmount"
                type="number"
                required
                value={form.totalAmount}
                onChange={(e) =>
                  setForm((f) => ({ ...f, totalAmount: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="date">Ngày</Label>
              <Input
                id="date"
                type="datetime-local"
                required
                value={form.date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, date: e.target.value }))
                }
              />
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? "Đang lưu..." : "Lưu"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
