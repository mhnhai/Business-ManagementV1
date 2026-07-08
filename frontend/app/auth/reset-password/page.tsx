"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, CheckCircle2, Lock, Eye, EyeOff, ArrowRight, ShieldCheck } from "lucide-react";
import { authApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ResetState = "FORM" | "SUCCESS";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<ResetState>("FORM");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  async function handleResetSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!token) {
      setError("Mã xác thực khôi phục mật khẩu không tồn tại hoặc đã hết hạn.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không trùng khớp.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await authApi.resetPassword({ token, password });
      setStatus("SUCCESS");
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Đã có lỗi xảy ra. Vui lòng yêu cầu lại liên kết khôi phục mật khẩu mới.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md shadow-xl border-none p-2 transition-all duration-300">
        {status === "FORM" && (
          <form onSubmit={handleResetSubmit}>
            <CardHeader className="space-y-1 text-center">
              <div className="flex justify-center mb-2">
                <div className="rounded-full bg-orange-100 p-3">
                  <ShieldCheck className="h-6 w-6 text-orange-600" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold text-slate-800">Đặt lại mật khẩu</CardTitle>
              <CardDescription>
                Nhập mật khẩu mới cho tài khoản của bạn để hoàn tất khôi phục
              </CardDescription>
            </CardHeader>

            <CardContent className="grid gap-4">
              {error && (
                <div className="rounded-md bg-rose-50 border border-rose-100 p-3 text-sm text-rose-600 font-medium text-center">
                  {error}
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="password">Mật khẩu mới</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    className="pl-10"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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

              <div className="grid gap-2">
                <Label htmlFor="confirmPassword">Xác nhận mật khẩu mới</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    required
                    className="pl-10"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>

            <CardFooter>
              <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang cập nhật...
                  </>
                ) : (
                  "Xác nhận đổi mật khẩu"
                )}
              </Button>
            </CardFooter>
          </form>
        )}

        {status === "SUCCESS" && (
          <div className="space-y-6 py-6 text-center">
            <div className="flex justify-center">
              <div className="rounded-full bg-emerald-100 p-3">
                <CheckCircle2 className="h-10 w-10 text-emerald-600" />
              </div>
            </div>
            <CardHeader className="p-0">
              <CardTitle className="text-2xl font-bold text-emerald-800">Thành công!</CardTitle>
              <CardDescription className="text-base mt-2 text-slate-600 px-4">
                Mật khẩu của bạn đã được thay đổi thành công. Bạn có thể đăng nhập bằng mật khẩu mới ngay bây giờ.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 px-6">
              <Button
                onClick={() => router.push("/auth")}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 rounded-xl flex items-center justify-center gap-2"
              >
                Đi tới Đăng nhập <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </div>
        )}
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}




