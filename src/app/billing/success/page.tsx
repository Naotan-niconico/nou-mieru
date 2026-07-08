import Link from "next/link";

export default function BillingSuccessPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6faf5] px-5 py-8 text-green-950">
      <section className="w-full max-w-xl rounded-3xl border border-green-200 bg-white p-7 text-center shadow-sm">
        <p className="text-5xl">✅</p>
        <h1 className="mt-4 text-3xl font-black">お申し込みありがとうございます</h1>
        <p className="mt-4 leading-8 text-green-900">
          Stripeでの決済が完了しました。反映には数秒〜数分かかる場合があります。
          反映されない場合は、少し待ってから再ログインしてください。
        </p>
        <Link
          href="/home"
          className="mt-7 inline-flex rounded-2xl bg-green-700 px-6 py-4 text-lg font-black text-white hover:bg-green-800"
        >
          農見えるに戻る
        </Link>
      </section>
    </main>
  );
}
