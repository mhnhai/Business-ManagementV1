"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, FileDown, Plus, RefreshCw, Trash2, X } from "lucide-react";

import { ImportDetailDialog } from "@/components/imports/import-detail-dialog";
import { importsApi, lookupApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { ImportView, Supplier } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

function formatDate(value: string) {
  return new Date(value).toLocaleString("vi-VN");
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

function importDateKey(value: string) {
  const d = new Date(value);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

function matchesDateFilter(importDate: string, from: string, to: string) {
  if (!from && !to) return true;
  const key = importDateKey(importDate);
  if (from && key < from) return false;
  if (to && key > to) return false;
  return true;
}

function defaultFromDate() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${now.getFullYear()}-${month}-01`;
}

function defaultToDate() {
  return new Date().toISOString().slice(0, 10);
}

export function ImportsPanel() {
  const { isAdmin } = useAuth();
  const [imports, setImports] = useState<ImportView[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [createMode, setCreateMode] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [exportFrom, setExportFrom] = useState(defaultFromDate);
  const [exportTo, setExportTo] = useState(defaultToDate);
  const [exporting, setExporting] = useState(false);

  const filteredImports = useMemo(
    () =>
      imports.filter((record) => {
        if (!matchesDateFilter(record.importDate, filterFrom, filterTo)) {
          return false;
        }
        return matchesAnySearchField(
          [
            record.id,
            record.supplierName,
            record.supplierId,
            record.content,
            record.totalAmount,
            record.lineCount,
            formatDate(record.importDate),
          ],
          searchQuery,
        );
      }),
    [imports, filterFrom, filterTo, searchQuery],
  );

  const filterKey = `${filterFrom}|${filterTo}|${searchQuery}`;

  const {
    page,
    setPage,
    pageSize,
    totalItems,
    totalPages,
    paginatedItems: paginatedImports,
  } = usePagination(filteredImports, undefined, filterKey);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [importList, supplierList] = await Promise.all([
        importsApi.getAll(),
        lookupApi.suppliers(),
      ]);
      setImports(importList);
      setSuppliers(supplierList);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được dữ liệu");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openDetail(record: ImportView) {
    setCreateMode(false);
    setSelectedId(record.id);
    setDetailOpen(true);
  }

  function openCreate() {
    setSelectedId(null);
    setCreateMode(true);
    setDetailOpen(true);
  }

  function clearFilters() {
    setFilterFrom("");
    setFilterTo("");
    setSearchQuery("");
  }

  const hasActiveFilters =
    filterFrom !== "" || filterTo !== "" || searchQuery.trim() !== "";

  async function handleDelete(id: number) {
    if (
      !confirm(
        "Xóa phiếu nhập này? Tồn kho sẽ được hoàn lại theo các dòng đã nhập.",
      )
    ) {
      return;
    }
    setError(null);
    try {
      await importsApi.delete(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xóa thất bại");
    }
  }

  async function handleExport() {
    if (!exportFrom || !exportTo) {
      setError("Vui lòng chọn khoảng ngày xuất");
      return;
    }
    if (exportTo < exportFrom) {
      setError("Ngày kết thúc không được trước ngày bắt đầu");
      return;
    }
    setExporting(true);
    setError(null);
    try {
      await importsApi.exportExcel(exportFrom, exportTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xuất Excel thất bại");
    } finally {
      setExporting(false);
    }
  }

  return (
    <Card>
      <CardHeader className="space-y-3 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <ListSearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Tìm theo nhà cung cấp, nội dung, ID..."
          />
          <div className="flex flex-wrap gap-2 sm:ml-auto">
            <Button variant="outline" size="sm" onClick={() => void load()}>
              <RefreshCw className="h-4 w-4" />
              Tải lại
            </Button>
            {isAdmin && (
              <Button size="sm" onClick={openCreate}>
                <Plus className="h-4 w-4" />
                Tạo phiếu nhập
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            {!loading && (
              <>
                {filteredImports.length}
                {hasActiveFilters ? " kết quả" : " phiếu"}
              </>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-2 rounded-lg border bg-muted/20 px-3 py-2">
          <Input
            id="import-filter-from"
            type="date"
            title="Lọc từ ngày"
            value={filterFrom}
            onChange={(e) => setFilterFrom(e.target.value)}
            className="h-8 w-[140px] bg-background text-xs"
          />
          <Input
            id="import-filter-to"
            type="date"
            title="Lọc đến ngày"
            value={filterTo}
            min={filterFrom || undefined}
            onChange={(e) => setFilterTo(e.target.value)}
            className="h-8 w-[140px] bg-background text-xs"
          />
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="h-8 px-2" onClick={clearFilters}>
              <X className="h-4 w-4" />
            </Button>
          )}

          <div className="mx-1 hidden h-6 w-px bg-border sm:block" />

          <Input
            id="import-export-from"
            type="date"
            title="Xuất từ ngày"
            value={exportFrom}
            onChange={(e) => setExportFrom(e.target.value)}
            className="h-8 w-[140px] bg-background text-xs"
          />
          <Input
            id="import-export-to"
            type="date"
            title="Xuất đến ngày"
            value={exportTo}
            min={exportFrom}
            onChange={(e) => setExportTo(e.target.value)}
            className="h-8 w-[140px] bg-background text-xs"
          />
          <Button
            variant="secondary"
            size="sm"
            className="h-8"
            disabled={exporting}
            onClick={() => void handleExport()}
          >
            <FileDown className="h-4 w-4" />
            {exporting ? "Đang xuất..." : "Xuất Excel"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {error && (
          <p className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        {loading ? (
          <p className="text-sm text-muted-foreground">Đang tải...</p>
        ) : imports.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có phiếu nhập.</p>
        ) : filteredImports.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Không có kết quả phù hợp.
          </p>
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
                <TableHead className={listCol.name}>Nhà cung cấp</TableHead>
                <TableHead className={listCol.datetime}>Ngày tạo</TableHead>
                <TableHead>Nội dung</TableHead>
                <TableHead className={listCol.number}>Số dòng</TableHead>
                <TableHead className={listCol.money}>Tổng giá trị</TableHead>
                <TableHead className={listCol.actions}>Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedImports.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className={listCell.nowrap}>{record.id}</TableCell>
                  <TableCell className={listCell.truncate}>
                    {record.supplierName ?? `#${record.supplierId}`}
                  </TableCell>
                  <TableCell className={listCell.nowrap}>{formatDate(record.importDate)}</TableCell>
                  <TableCell className={listCell.truncate}>
                    {record.content}
                  </TableCell>
                  <TableCell className={listCell.number}>{record.lineCount ?? 0}</TableCell>
                  <TableCell className={listCell.money}>
                    {formatMoney(record.totalAmount ?? 0)} đ
                  </TableCell>
                  <TableCell className={listCell.actions}>
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Mở chi tiết"
                      onClick={() => openDetail(record)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void handleDelete(record.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </ListTableShell>
        )}
      </CardContent>

      <ImportDetailDialog
        importId={selectedId}
        createMode={createMode}
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) {
            setCreateMode(false);
            setSelectedId(null);
          }
        }}
        onCreated={(id) => {
          setSelectedId(id);
          setCreateMode(false);
        }}
        onChanged={() => void load()}
        suppliers={suppliers}
        canManage={isAdmin}
      />
    </Card>
  );
}
