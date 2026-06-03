import { Suspense } from "react";
import { LoginForm } from "@/components/admin/login-form";

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Suspense fallback={<div className="text-muted-foreground">Loading...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
