"use client";

import { useState } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { SignUpForm } from "@/components/auth/signup-form";
import Link from "next/link";

export default function AuthPage() {
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-muted/20 px-4">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[380px]">
        {/* Header thay đổi nội dung dựa trên authMode */}
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            {authMode === "login" ? "Chào mừng trở lại" : "Tạo tài khoản mới"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {authMode === "login" 
              ? "Vui lòng đăng nhập để quản lý hệ thống" 
              : "Điền thông tin để bắt đầu trải nghiệm"}
          </p>
        </div>

        {/* Hiển thị Form tương ứng */}
        {authMode === "login" ? (
          <div className="space-y-4">
            <LoginForm />
            <p className="text-center text-sm text-muted-foreground">
              Chưa có tài khoản?{" "}
              <button 
                onClick={() => setAuthMode("signup")}
                className="text-primary font-medium hover:underline transition-all"
              >
                Đăng ký ngay
              </button>
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <SignUpForm />
            <p className="text-center text-sm text-muted-foreground">
              Đã có tài khoản?{" "}
              <button 
                onClick={() => setAuthMode("login")}
                className="text-primary font-medium hover:underline transition-all"
              >
                Đăng nhập ngay
              </button>
            </p>
          </div>
        )}

        <p className="px-8 text-center text-sm text-muted-foreground">
          Bằng cách tiếp tục, bạn đồng ý với các{" "}
          <Link
            href="/terms"
            className="underline underline-offset-4 hover:text-primary transition-colors"
          >
            Điều khoản dịch vụ
          </Link>
        </p>
      </div>
    </div>
  );
}