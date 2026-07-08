"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type SearchableSelectOption = {
  value: string;
  label: string;
  keywords?: string;
};

type SearchableSelectProps = {
  options: SearchableSelectOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  emptyMessage?: string;
  minQueryLength?: number;
};

export function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder = "Chọn mục",
  searchPlaceholder = "Tìm kiếm...",
  disabled = false,
  emptyMessage = "Không có kết quả",
  minQueryLength = 1,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < minQueryLength) return [];
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        (o.keywords?.toLowerCase().includes(q) ?? false),
    );
  }, [options, query, minQueryLength]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelect(optionValue: string) {
    onValueChange(optionValue);
    setQuery("");
    setOpen(false);
  }

  if (disabled) {
    return (
      <Input
        disabled
        value={selected?.label ?? placeholder}
        className="bg-muted"
      />
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={open ? searchPlaceholder : (selected?.label ?? placeholder)}
          value={open ? query : (selected?.label ?? "")}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            setQuery("");
          }}
          className="pl-9"
        />
      </div>
      {open && (
        <ul className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-md border bg-popover py-1 shadow-md">
          {query.trim().length < minQueryLength ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">
              Nhập ít nhất {minQueryLength} ký tự để tìm
            </li>
          ) : filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">
              {emptyMessage}
            </li>
          ) : (
            filtered.map((o) => (
              <li
                key={o.value}
                className={cn(
                  "cursor-pointer px-3 py-2 text-sm hover:bg-accent",
                  o.value === value && "bg-accent font-medium",
                )}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(o.value);
                }}
              >
                {o.label}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
