"use client";

import { useState } from "react";
import { Eye, EyeOff, Lock, User, LogIn, Mail, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [view, setView] = useState<"login" | "forgot">("login");
  
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleLoginSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const username = formData.get("username") as string;
    const password = formData.get("password") as string;

    try {
      await authApi.login({ username, password });
      await refresh();
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tên đăng nhập hoặc mật khẩu không đúng");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;

    try {
      await authApi.forgotPassword({ email });
      setSuccessMessage("Yêu cầu khôi phục đã được gửi! Vui lòng kiểm tra hộp thư email của bạn.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Email không tồn tại trong hệ thống");
    } finally {
      setLoading(false);
    }
  }

  if (view === "forgot") {
    return (
      <Card className="w-full shadow-lg border-none">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-2">
            <div className="rounded-full bg-primary/10 p-3">
              <Mail className="h-6 w-6 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Quên mật khẩu</CardTitle>
          <CardDescription>Nhập email của bạn để nhận liên kết khôi phục tài khoản</CardDescription>
        </CardHeader>
        
        <form onSubmit={handleForgotSubmit}>
          <CardContent className="grid gap-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive font-medium">
                {error}
              </div>
            )}
            {successMessage && (
              <div className="rounded-md bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-700 font-medium">
                {successMessage}
              </div>
            )}
            
            <div className="grid gap-2">
              <Label htmlFor="email">Địa chỉ Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input id="email" name="email" type="email" required className="pl-10" placeholder="name@company.com" />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Gửi yêu cầu..." : "Gửi email khôi phục"}
            </Button>
            <Button 
              type="button" 
              variant="ghost" 
              className="w-full text-muted-foreground hover:text-foreground"
              onClick={() => {
                setView("login");
                setError(null);
                setSuccessMessage(null);
              }}
            >
              <ArrowLeft className="h-4 w-4 mr-2" /> Quay lại đăng nhập
            </Button>
          </CardFooter>
        </form>
      </Card>
    );
  }

  return (
    <Card className="w-full shadow-lg border-none">
      <CardHeader className="space-y-1 text-center">
        <div className="flex justify-center mb-2">
          <div className="rounded-full bg-primary/10 p-3">
            <LogIn className="h-6 w-6 text-primary" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold">Đăng nhập</CardTitle>
        <CardDescription>Nhập tài khoản hệ thống của bạn</CardDescription>
      </CardHeader>
      
      <form onSubmit={handleLoginSubmit}>
        <CardContent className="grid gap-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive font-medium">
              {error}
            </div>
          )}
          
          <div className="grid gap-2">
            <Label htmlFor="username">Tên đăng nhập</Label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input 
                id="username" 
                name="username" 
                required 
                className="pl-10" 
                placeholder="admin" 
              />
            </div>
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Mật khẩu</Label>
              <button
                type="button"
                onClick={() => {
                  setView("forgot");
                  setError(null);
                }}
                className="text-xs font-medium text-primary hover:underline transition-all"
              >
                Quên mật khẩu?
              </button>
            </div>
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
        </CardContent>
        <CardFooter className="pt-2">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Đang xác thực..." : "Đăng nhập"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}