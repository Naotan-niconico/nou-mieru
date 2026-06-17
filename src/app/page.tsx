"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/home");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6faf5] text-xl font-bold text-green-900">
      農みえるを開いています
    </div>
  );
}
