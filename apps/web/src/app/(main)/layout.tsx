import { Suspense } from "react";
import { DashboardLayout } from "../../components/DashboardLayout";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="animate-spin h-8 w-8 border-2 border-slate-300 border-t-slate-600 rounded-full" /></div>}>
      <DashboardLayout>{children}</DashboardLayout>
    </Suspense>
  );
}
