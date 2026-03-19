import type { ReactNode } from "react";
import AppSidebar from "@/components/navigation/app-sidebar";
import AppTopbar from "@/components/navigation/app-topbar";

type AppShellProps = {
  children: ReactNode;
  focusMode?: boolean;
};

export default function AppShell({
  children,
  focusMode = false,
}: AppShellProps) {
  if (focusMode) {
    return (
      <div className="min-h-screen bg-[#050816] text-white">
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(244,114,182,0.14),transparent_24%),radial-gradient(circle_at_80%_16%,rgba(34,211,238,0.12),transparent_20%)]" />
        <AppTopbar focusMode />
        <div className="relative mx-auto max-w-[1600px] px-4 py-6 md:px-6">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050816] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(244,114,182,0.14),transparent_24%),radial-gradient(circle_at_80%_16%,rgba(34,211,238,0.12),transparent_20%)]" />
      <AppTopbar />
      <div className="relative mx-auto flex max-w-[1600px]">
        <AppSidebar />
        <main className="min-w-0 flex-1 px-4 py-6 md:px-6">{children}</main>
      </div>
    </div>
  );
}
