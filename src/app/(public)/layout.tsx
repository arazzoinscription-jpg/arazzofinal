import { MobileQuickNav } from "@/components/layout/mobile-quick-nav";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <MobileQuickNav />
    </>
  );
}
