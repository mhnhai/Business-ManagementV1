"use client";

import { useCallback, useEffect, useState } from "react";
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
import { listCol, listCell, listHead } from "@/lib/list-table-layout";

function formatDate(value: string) {
  return new Date(value).toLocaleString("vi-VN");
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
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
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const filteredImports = imports;

  const load = useCallback(async (
    targetPage = page,
    overrides?: { searchQuery?: string; filterFrom?: string; filterTo?: string },
  ) => {
    const search = overrides?.searchQuery ?? searchQuery;
    const from = overrides?.filterFrom ?? filterFrom;
    const to = overrides?.filterTo ?? filterTo;
    setLoading(true);
    setError(null);
    try {
      const [importList, supplierList] = await Promise.all([
        importsApi.getPage(targetPage, pageSize, {
          search: search.trim() || undefined,
          fromDate: from || undefined,
          toDate: to || undefined,
        }),
        lookupApi.suppliers(),
      ]);
      setImports(importList.items);
      setTotalItems(importList.total);
      setTotalPages(Math.max(1, Math.ceil(importList.total / importList.pageSize)));
      setPage(importList.page);
      setSuppliers(supplierList);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được dữ liệu");
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, filterFrom, filterTo]);

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
            onChange={(value) => {
              setSearchQuery(value);
              void load(1, { searchQuery: value });
            }}
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
            onChange={(e) => {
              setFilterFrom(e.target.value);
              void load(1, { filterFrom: e.target.value });
            }}
            className="h-8 w-[140px] bg-background text-xs"
          />
          <Input
            id="import-filter-to"
            type="date"
            title="Lọc đến ngày"
            value={filterTo}
            min={filterFrom || undefined}
            onChange={(e) => {
              setFilterTo(e.target.value);
              void load(1, { filterTo: e.target.value });
            }}
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
                onPageChange={(nextPage) => {
                  setPage(nextPage);
                  void load(nextPage);
                }}
              />
            }
          >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={`${listCol.id} ${listHead.center}`}>ID</TableHead>
                <TableHead className={listCol.name}>Nhà cung cấp</TableHead>
                <TableHead className={`${listCol.datetime} ${listHead.center}`}>Ngày tạo</TableHead>
                <TableHead>Nội dung</TableHead>
                <TableHead className={`${listCol.number} ${listHead.right}`}>Số dòng</TableHead>
                <TableHead className={`${listCol.money} ${listHead.right}`}>Tổng giá trị</TableHead>
                <TableHead className={`${listCol.actions} ${listHead.center}`}>Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredImports.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className={listCell.center}>{record.id}</TableCell>
                  <TableCell className={listCell.truncate}>
                    {record.supplierName ?? `#${record.supplierId}`}
                  </TableCell>
                  <TableCell className={listCell.center}>{formatDate(record.importDate)}</TableCell>
                  <TableCell className={listCell.truncate}>
                    {record.content}
                  </TableCell>
                  <TableCell className={listCell.number}>{record.lineCount ?? 0}</TableCell>
                  <TableCell className={listCell.money}>
                    {formatMoney(record.totalAmount ?? 0)} đ
                  </TableCell>
                  <TableCell className={listCell.actionsCenter}>
                    <div className="flex flex-nowrap items-center justify-center gap-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 shrink-0 p-0"
                      title="Mở chi tiết"
                      onClick={() => openDetail(record)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 shrink-0 p-0"
                        onClick={() => void handleDelete(record.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                    </div>
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
