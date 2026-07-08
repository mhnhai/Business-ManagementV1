"use client";

import { useState } from "react";
import { Eye, EyeOff, Lock, User, UserPlus, ShieldCheck, Mail } from "lucide-react";
import { authApi } from "@/lib/api";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SignUpForm() {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const username = formData.get("username") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp");
      setLoading(false);
      return;
    }

    try {

      await authApi.register({
        username,
        email, 
        password,
        role: "employee", 
      });
      
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đăng ký thất bại");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <Card className="w-full shadow-lg border-none text-center p-8">
        <div className="flex justify-center mb-4">
          <div className="rounded-full bg-blue-100 p-3">
            <Mail className="h-8 w-8 text-blue-600 animate-pulse" />
          </div>
        </div>
        <CardTitle className="text-xl font-bold text-blue-700">Kiểm tra Email của bạn!</CardTitle>
        <CardDescription className="mt-2 text-base leading-relaxed">
          Một liên kết kích hoạt đã được gửi tới email của bạn. Vui lòng bấm vào liên kết trong vòng <strong>1 giờ</strong> để hoàn tất quá trình khởi tạo tài khoản hệ thống.
        </CardDescription>
      </Card>
    );
  }

  return (
    <Card className="w-full shadow-lg border-none">
      <CardHeader className="space-y-1 text-center">
        <div className="flex justify-center mb-2">
          <div className="rounded-full bg-primary/10 p-3">
            <UserPlus className="h-6 w-6 text-primary" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold">Tạo tài khoản</CardTitle>
        <CardDescription>Điền thông tin để đăng ký thành viên</CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="grid gap-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive font-medium border border-destructive/20">
              {error}
            </div>
          )}

          {/* Username Input Field */}
          <div className="grid gap-2">
            <Label htmlFor="username">Tên đăng nhập</Label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="username"
                name="username"
                placeholder="john.doe"
                required
                className="pl-10"
              />
            </div>
          </div>

          {/* ADDED: Mandatory Email Input Architecture */}
          <div className="grid gap-2">
            <Label htmlFor="email">Địa chỉ Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                name="email"
                type="email" // Enforces structural browser validation constraints for standard emails
                placeholder="name@example.com"
                required // Guaranteed field presence before allowing submission
                className="pl-10"
              />
            </div>
          </div>

          {/* Password Input Field */}
          <div className="grid gap-2">
            <Label htmlFor="password">Mật khẩu</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                className="pl-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password Input Field */}
          <div className="grid gap-2">
            <Label htmlFor="confirmPassword">Xác nhận mật khẩu</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type={showPassword ? "text" : "password"}
                required
                className="pl-10"
              />
            </div>
          </div>

          <Button type="submit" className="w-full mt-2" disabled={loading}>
            {loading ? "Đang xử lý..." : "Đăng ký ngay"}
          </Button>
        </CardContent>
      </form>
    </Card>
  );
}