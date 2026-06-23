"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SubscribeSuccessPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = window.setTimeout(() => router.replace("/home"), 5000);
    return () => window.clearTimeout(timer);
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6faf5] px-4">
      <section className="max-w-md rounded-2xl bg-white p-6 text-center shadow-sm">
        <h1 className="text-3xl font-bold text-green-900">登録ありがとうございます</h1>
        <p className="mt-5 text-lg leading-8 text-stone-700">
          決済情報の反映に少し時間がかかる場合があります。数秒後にホームへ戻ります。
        </p>
        <Link href="/home" className="mt-6 block rounded-2xl bg-green-700 px-5 py-4 text-xl font-bold text-white">
          ホームへ戻る
        </Link>
      </section>
    </main>
  );
}
