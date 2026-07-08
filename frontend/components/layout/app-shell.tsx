"use client";

import {
  ClipboardList,
  DollarSign,
  LogIn,
  LogOut,
  Package,
  PackagePlus,
  Truck,
  Users,
  UserCog,
  LayoutDashboard,
  BarChart3,
  Menu,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { authApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { sectionsForRole } from "@/lib/permissions";
import { useEffect, useState } from "react";

export type AppSection = "user-dashboard" | "admin-sales-dashboard" | "products" | "suppliers" | "imports" | "customers" | "activities" | "salaries" | "users";

type NavItem = {
  id: AppSection;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
};

const allNavItems: NavItem[] = [
  {
    id: "user-dashboard",
    label: "Thống kê cá nhân",
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    id: "admin-sales-dashboard",
    label: "Thống kê doanh số",
    icon: <BarChart3 className="h-4 w-4" />,
    adminOnly: true,
  },
  {
    id: "products",
    label: "Sản phẩm",
    icon: <Package className="h-4 w-4" />,
  },
  {
    id: "suppliers",
    label: "Nhà cung cấp",
    icon: <Truck className="h-4 w-4" />,
    adminOnly: true,
  },
  {
    id: "imports",
    label: "Nhập kho",
    icon: <PackagePlus className="h-4 w-4" />,
    adminOnly: true,
  },
  {
    id: "customers",
    label: "Khách hàng",
    icon: <Users className="h-4 w-4" />,
  },
  {
    id: "activities",
    label: "Hoạt động",
    icon: <ClipboardList className="h-4 w-4" />,
  },
  {
    id: "users",
    label: "Nhân sự",
    icon: <UserCog className="h-4 w-4" />,
    adminOnly: true,
  },
  {
    id: "salaries",
    label: "Tiền lương",
    icon: <DollarSign className="h-4 w-4" />,
    adminOnly: true,
  }
];

type AppShellProps = {
  children: React.ReactNode;
  activeSection: AppSection;
  onSectionChange: (section: AppSection) => void;
};

export function AppShell({
  children,
  activeSection,
  onSectionChange,
}: AppShellProps) {
  const router = useRouter();
  const { user, isLoading, refresh, clearUser } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!isLoading && user && user.role !== "admin") {
      onSectionChange("user-dashboard");
    }
  }, [user, isLoading, onSectionChange]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const navItems = allNavItems.filter((item) =>
    sectionsForRole(user?.role).includes(item.id),
  );

  const handleLoginClick = () => {
    router.push("/auth");
  };

  const handleLogoutClick = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.warn("Không thể xóa token trên server (có thể DB đã reset), tiến hành xóa dữ liệu cục bộ:", error);
    } finally {
      clearUser();
      router.push("/auth");
    }
  };

  const roleLabel =
    user?.role === "admin"
      ? "Quản trị"
      : user?.role === "employee"
        ? "Nhân viên"
        : user?.role;

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-card">
      <div className="border-b px-4 py-5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Business Management
            </p>
            <h1 className="mt-1 text-lg font-semibold">Staff Portal</h1>
          </div>
          <button 
            type="button" 
            className="lg:hidden p-1.5 rounded-md text-muted-foreground hover:bg-muted"
            onClick={() => setIsMobileOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {!user ? (
          <button
            type="button"
            className="flex items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors w-fit"
            onClick={handleLoginClick}
          >
            <LogIn className="h-4 w-4" />
            Đăng nhập
          </button>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-muted-foreground">
              {user.username}
              {roleLabel ? ` · ${roleLabel}` : ""}
            </p>
            <button
              type="button"
              className="flex items-center gap-2 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-1.5 text-sm font-medium text-destructive shadow-sm hover:bg-destructive hover:text-destructive-foreground transition-colors w-fit"
              onClick={handleLogoutClick}
            >
              <LogOut className="h-4 w-4" />
              Đăng xuất
            </button>
          </div>
        )}
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-3 overflow-y-auto">
        <div className="px-3 pb-1 text-xs font-medium uppercase text-muted-foreground">
          Module
        </div>
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              onSectionChange(item.id);
              setIsMobileOpen(false);
            }}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors",
              activeSection === item.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-muted/30 relative">
      <button
        type="button"
        onClick={() => setIsMobileOpen(true)}
        className="fixed bottom-4 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg lg:hidden transition-transform active:scale-95"
      >
        <Menu className="h-6 w-6" />
      </button>

      {isMobileOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-56 transform border-r transition-transform duration-300 ease-in-out lg:static lg:translate-x-0",
        isMobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <SidebarContent />
      </aside>

      <main className="flex flex-1 flex-col min-w-0 w-full overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}

export const sectionMeta: Record<
  AppSection,
  { title: string; description: string }
> = {
  "user-dashboard": {
    title: "Bảng thống kê cá nhân",
    description: "Theo dõi hiệu suất doanh thu, hoạt động kinh doanh và số liệu thị trường thời gian thực.",
  },
  "admin-sales-dashboard": {
    title: "Thống kê doanh số",
    description: "Tổng quan doanh số toàn hệ thống và theo từng nhân viên kinh doanh.",
  },
  products: {
    title: "Sản phẩm",
    description: "Quản lý danh mục sản phẩm và tồn kho",
  },
  suppliers: {
    title: "Nhà cung cấp",
    description: "Quản lý thông tin nhà cung cấp và đối tác nhập hàng",
  },
  imports: {
    title: "Nhập kho",
    description: "Tạo phiếu nhập, chi tiết hàng và cập nhật tồn kho",
  },
  customers: {
    title: "Khách hàng",
    description: "Quản lý thông tin khách hàng và số dư",
  },
  activities: {
    title: "Hoạt động",
    description: "Tạo đơn hàng, chi tiết, in hóa đơn và trạng thái xử lý",
  },
  users: {
    title: "Nhân sự",
    description: "Quản lý danh sách nhân viên, phòng ban và tài khoản",
  },
  salaries: {
    title: "Tiền lương",
    description: "Quản lý bảng lương, thưởng và thu nhập nhân viên",
  },
};