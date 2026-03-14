import type { ReactNode } from "react";
import AppShell from "@/components/navigation/app-shell";

export default function FocusLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <AppShell focusMode>{children}</AppShell>;
}
