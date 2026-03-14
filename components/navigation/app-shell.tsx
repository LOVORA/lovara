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
        <AppTopbar focusMode />
        <div className="mx-auto max-w-[1600px] px-4 py-6 md:px-6">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050816] text-white">
      <AppTopbar />
      <div className="mx-auto flex max-w-[1600px]">
        <AppSidebar />
        <main className="min-w-0 flex-1 px-4 py-6 md:px-6">{children}</main>
      </div>
    </div>
  );
}
