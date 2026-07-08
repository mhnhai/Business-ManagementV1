"use client";

import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type ListSearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

export function ListSearchBar({
  value,
  onChange,
  placeholder = "Tìm kiếm...",
  className,
}: ListSearchBarProps) {
  return (
    <div className={cn("relative min-w-[200px] flex-1 max-w-md", className)}>
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 bg-background pl-8 pr-8"
        aria-label={placeholder}
      />
      {value ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-0 top-0 h-9 w-9 p-0"
          onClick={() => onChange("")}
          aria-label="Xóa tìm kiếm"
        >
          <X className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );
}
