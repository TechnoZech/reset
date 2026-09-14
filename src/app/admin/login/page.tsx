import { Suspense } from "react";
import { LoginForm } from "@/components/admin/login-form";

export const metadata = {
  title: "Admin Login",
};

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-4">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(225,29,46,0.15), transparent)",
        }}
      />
      <Suspense fallback={<div className="h-80 w-full max-w-sm animate-pulse rounded-2xl bg-card" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
