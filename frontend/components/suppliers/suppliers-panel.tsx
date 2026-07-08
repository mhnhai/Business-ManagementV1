"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";

import { suppliersApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Supplier } from "@/lib/types";
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

const emptyForm = {
  id: 0,
  supplierName: "",
  businessType: "",
  address: "",
  phoneNumber: "",
  email: "",
};

export function SuppliersPanel() {
  const { isAdmin } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSuppliers = useMemo(
    () =>
      suppliers.filter((supplier) =>
        matchesAnySearchField(
          [
            supplier.id,
            supplier.supplierName,
            supplier.businessType,
            supplier.address,
            supplier.phoneNumber,
            supplier.email,
          ],
          searchQuery,
        ),
      ),
    [suppliers, searchQuery],
  );

  const {
    page,
    setPage,
    pageSize,
    totalItems,
    totalPages,
    paginatedItems: paginatedSuppliers,
  } = usePagination(filteredSuppliers, undefined, searchQuery);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await suppliersApi.getAll();
      setSuppliers(data);
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

  function openEdit(supplier: Supplier) {
    setForm({
      id: supplier.id,
      supplierName: supplier.supplierName,
      businessType: supplier.businessType,
      address: supplier.address,
      phoneNumber: supplier.phoneNumber,
      email: supplier.email,
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
        supplierName: form.supplierName,
        businessType: form.businessType,
        address: form.address,
        phoneNumber: form.phoneNumber,
        email: form.email,
      };
      if (form.id === 0) {
        const { id: _id, ...createPayload } = payload;
        await suppliersApi.add(createPayload);
      } else {
        const existing = suppliers.find((s) => s.id === form.id);
        await suppliersApi.update({
          ...payload,
          createdAt: existing?.createdAt ?? new Date().toISOString(),
          updatedAt: existing?.updatedAt ?? new Date().toISOString(),
        });
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
    if (!confirm("Xóa nhà cung cấp này?")) return;
    setError(null);
    try {
      await suppliersApi.delete(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xóa thất bại");
    }
  }

  return (
    <Card>
      <CardHeader className="space-y-3 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <ListSearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Tìm theo tên, địa chỉ, SĐT, email..."
          />
          <div className="flex gap-2 sm:ml-auto">
          <Button variant="outline" size="sm" onClick={() => void load()}>
            <RefreshCw className="h-4 w-4" />
            Tải lại
          </Button>
          {isAdmin && (
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Thêm
            </Button>
          )}
          </div>
        </div>
        {!loading && suppliers.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {filteredSuppliers.length}
            {searchQuery.trim() ? " kết quả" : " nhà cung cấp"}
          </p>
        )}
      </CardHeader>
      <CardContent>
        {error && (
          <p className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        {loading ? (
          <p className="text-sm text-muted-foreground">Đang tải...</p>
        ) : suppliers.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có nhà cung cấp.</p>
        ) : filteredSuppliers.length === 0 ? (
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={listCol.id}>ID</TableHead>
                <TableHead className={listCol.name}>Tên</TableHead>
                <TableHead className={listCol.type}>Loại hình</TableHead>
                <TableHead>Địa chỉ</TableHead>
                <TableHead className={listCol.phone}>Điện thoại</TableHead>
                <TableHead className={listCol.email}>Email</TableHead>
                {isAdmin && (
                  <TableHead className={listCol.actions}>Thao tác</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedSuppliers.map((supplier) => (
                <TableRow key={supplier.id}>
                  <TableCell className={listCell.nowrap}>{supplier.id}</TableCell>
                  <TableCell className={`font-medium ${listCell.truncate}`}>
                    {supplier.supplierName}
                  </TableCell>
                  <TableCell className={listCell.truncate}>{supplier.businessType}</TableCell>
                  <TableCell className={listCell.truncate}>
                    {supplier.address}
                  </TableCell>
                  <TableCell className={listCell.nowrap}>{supplier.phoneNumber}</TableCell>
                  <TableCell className={listCell.truncate}>{supplier.email}</TableCell>
                  {isAdmin && (
                    <TableCell className={listCell.actions}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(supplier)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void handleDelete(supplier.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  )}
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
              {form.id === 0 ? "Thêm nhà cung cấp" : "Sửa nhà cung cấp"}
            </DialogTitle>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={(e) => void handleSubmit(e)}>
            <div className="grid gap-2">
              <Label htmlFor="supplierName">Tên nhà cung cấp</Label>
              <Input
                id="supplierName"
                required
                value={form.supplierName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, supplierName: e.target.value }))
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
            <div className="grid gap-2">
              <Label htmlFor="address">Địa chỉ</Label>
              <Input
                id="address"
                required
                value={form.address}
                onChange={(e) =>
                  setForm((f) => ({ ...f, address: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phoneNumber">Số điện thoại</Label>
              <Input
                id="phoneNumber"
                required
                maxLength={10}
                value={form.phoneNumber}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phoneNumber: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
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
