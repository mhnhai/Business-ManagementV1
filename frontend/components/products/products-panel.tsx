"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";

import { productsApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Product } from "@/lib/types";
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
  productName: "",
  unitPrice: "",
  stockQuantity: "",
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

export function ProductsPanel() {
  const { isAdmin } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredProducts = useMemo(
    () =>
      products.filter((product) =>
        matchesAnySearchField(
          [product.id, product.productName, product.unitPrice, product.stockQuantity],
          searchQuery,
        ),
      ),
    [products, searchQuery],
  );

  const {
    page,
    setPage,
    pageSize,
    totalItems,
    totalPages,
    paginatedItems: paginatedProducts,
  } = usePagination(filteredProducts, undefined, searchQuery);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await productsApi.getAll();
      setProducts(data);
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

  function openEdit(product: Product) {
    setForm({
      id: product.id,
      productName: product.productName,
      unitPrice: String(product.unitPrice),
      stockQuantity: String(product.stockQuantity),
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
        productName: form.productName,
        unitPrice: Number(form.unitPrice),
        stockQuantity: Number(form.stockQuantity),
      };
      if (form.id === 0) {
        const { id: _id, ...createPayload } = payload;
        await productsApi.add(createPayload);
      } else {
        await productsApi.update(payload);
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
    if (!confirm("Xóa sản phẩm này?")) return;
    setError(null);
    try {
      await productsApi.delete(id);
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
            placeholder="Tìm theo tên, ID, giá, tồn kho..."
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
        {!loading && products.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {filteredProducts.length}
            {searchQuery.trim() ? " kết quả" : " sản phẩm"}
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
        ) : products.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có sản phẩm.</p>
        ) : filteredProducts.length === 0 ? (
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
                <TableHead>Tên sản phẩm</TableHead>
                <TableHead className={listCol.money}>Đơn giá</TableHead>
                <TableHead className={listCol.number}>Tồn kho</TableHead>
                {isAdmin && (
                  <TableHead className={listCol.actions}>Thao tác</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className={listCell.nowrap}>{product.id}</TableCell>
                  <TableCell className={`font-medium ${listCell.truncate}`}>
                    {product.productName}
                  </TableCell>
                  <TableCell className={listCell.money}>{formatMoney(product.unitPrice)}</TableCell>
                  <TableCell className={listCell.number}>{product.stockQuantity}</TableCell>
                  {isAdmin && (
                    <TableCell className={listCell.actions}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(product)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void handleDelete(product.id)}
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
              {form.id === 0 ? "Thêm sản phẩm" : "Sửa sản phẩm"}
            </DialogTitle>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={(e) => void handleSubmit(e)}>
            <div className="grid gap-2">
              <Label htmlFor="productName">Tên sản phẩm</Label>
              <Input
                id="productName"
                required
                value={form.productName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, productName: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="unitPrice">Đơn giá</Label>
              <Input
                id="unitPrice"
                type="number"
                min={0}
                required
                value={form.unitPrice}
                onChange={(e) =>
                  setForm((f) => ({ ...f, unitPrice: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="stockQuantity">Tồn kho</Label>
              <Input
                id="stockQuantity"
                type="number"
                min={0}
                step={1}
                required
                value={form.stockQuantity}
                onChange={(e) =>
                  setForm((f) => ({ ...f, stockQuantity: e.target.value }))
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
