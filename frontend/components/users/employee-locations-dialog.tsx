"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, MapPin, Search } from "lucide-react";

import { employeeLocationsApi, locationsApi } from "@/lib/api";
import type { EmployeeLocationView, Location, UserPublic } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

function locationLabel(loc: Location) {
  return loc.ward;
}

interface EmployeeLocationsDialogProps {
  user: UserPublic | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

export function EmployeeLocationsDialog({
  user,
  open,
  onOpenChange,
  onSaved,
}: EmployeeLocationsDialogProps) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [allAssignments, setAllAssignments] = useState<EmployeeLocationView[]>(
    [],
  );
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const [locationRows, userAssignments, assignmentRows] = await Promise.all([
        locationsApi.getAll(),
        employeeLocationsApi.getByUser(user.id),
        employeeLocationsApi.getAll(),
      ]);
      setLocations(locationRows);
      setAllAssignments(assignmentRows);
      setSelectedIds(new Set(userAssignments.map((a) => a.locationId)));
    } catch (err) {
      console.error(err);
      setError("Không tải được dữ liệu phân vùng");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (open && user) {
      void loadData();
    } else if (!open) {
      setSearchQuery("");
      setError(null);
    }
  }, [open, user, loadData]);

  const takenByOther = useMemo(() => {
    const map = new Map<number, string>();
    if (!user) return map;
    for (const assignment of allAssignments) {
      if (assignment.userId !== user.id) {
        map.set(
          assignment.locationId,
          assignment.user?.fullName ?? `NV #${assignment.userId}`,
        );
      }
    }
    return map;
  }, [allAssignments, user]);

  const filteredLocations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return locations;
    return locations.filter(
      (loc) =>
        loc.ward.toLowerCase().includes(q) ||
        loc.province.toLowerCase().includes(q),
    );
  }, [locations, searchQuery]);

  function toggleLocation(locationId: number) {
    if (takenByOther.has(locationId)) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(locationId)) {
        next.delete(locationId);
      } else {
        next.add(locationId);
      }
      return next;
    });
  }

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      await employeeLocationsApi.setByUser(user.id, Array.from(selectedIds));
      onSaved?.();
      onOpenChange(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Lưu phân vùng thất bại";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <MapPin className="h-5 w-5 text-primary" />
            Phân vùng hoạt động
          </DialogTitle>
          {user && (
            <p className="text-sm text-muted-foreground">
              Nhân viên:{" "}
              <span className="font-medium text-foreground">
                {user.fullName}
              </span>{" "}
              (@{user.username})
            </p>
          )}
        </DialogHeader>

        <div className="space-y-3 flex-1 min-h-0 flex flex-col">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm phường/xã..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Đã chọn:{" "}
              <Badge variant="secondary">{selectedIds.size} vùng</Badge>
            </span>
            <span className="text-xs text-muted-foreground">
              Mỗi vùng chỉ gán cho một nhân viên
            </span>
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex-1 min-h-0 overflow-y-auto rounded-md border max-h-[340px]">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredLocations.length > 0 ? (
              <ul className="divide-y">
                {filteredLocations.map((loc) => {
                  const disabled = takenByOther.has(loc.id);
                  const checked = selectedIds.has(loc.id);
                  const ownerName = takenByOther.get(loc.id);

                  return (
                    <li key={loc.id}>
                      <label
                        className={cn(
                          "flex items-start gap-3 px-3 py-2.5 cursor-pointer hover:bg-muted/40 transition-colors",
                          disabled && "cursor-not-allowed opacity-60",
                        )}
                      >
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 rounded border-input accent-primary"
                          checked={checked}
                          disabled={disabled}
                          onChange={() => toggleLocation(loc.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm leading-tight">
                            {locationLabel(loc)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {loc.province}
                          </div>
                          {disabled && ownerName && (
                            <div className="text-xs text-amber-700 mt-1">
                              Đã gán cho: {ownerName}
                            </div>
                          )}
                        </div>
                      </label>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-center text-sm text-muted-foreground py-10">
                Không tìm thấy vùng phù hợp.
              </p>
            )}
          </div>

          <Label className="text-xs text-muted-foreground font-normal">
            Chọn nhiều phường/xã mà nhân viên phụ trách. Vùng đã gán cho người
            khác sẽ bị khóa.
          </Label>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Hủy
          </Button>
          <Button
            type="button"
            onClick={() => void handleSave()}
            disabled={loading || saving || !user}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Đang lưu...
              </>
            ) : (
              "Lưu phân vùng"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
