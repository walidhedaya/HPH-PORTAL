"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    const role = localStorage.getItem("role");

    if (role !== "admin" && role !== "super_admin") {
      router.push("/login");
    }
  }, [router]);

  return <>{children}</>;
}
