import Link from "next/link";

export function UpgradeNotice({ compact = false }: { compact?: boolean }) {
  return (
    <section className="rounded-2xl border border-green-200 bg-green-50 p-5 text-stone-900">
      <h2 className="text-2xl font-bold text-green-900">有料プランの機能です</h2>
      <p className="mt-3 text-lg leading-8">
        この機能は農みえる有料プランで利用できます。現在は無料モニター・手動受付にも対応しています。
      </p>
      {!compact ? (
        <p className="mt-2 text-lg leading-8">
          利用を希望する場合は、プラン登録ページからお申し込みください。
        </p>
      ) : null}
      <Link
        href="/subscribe"
        className="mt-5 block rounded-2xl bg-green-700 px-5 py-4 text-center text-lg font-bold text-white hover:bg-green-800"
      >
        有料プランを見る
      </Link>
    </section>
  );
}
