"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { buttonClass, ErrorMessage, Field, inputClass } from "@/components/FormParts";
import { hasSupabaseConfig, supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    if (!hasSupabaseConfig) {
      setError(".env.local に Supabase のURLとAnon Keyを設定してください。");
      return;
    }

    setSaving(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setSaving(false);

    if (signInError) {
      setError("メールアドレスまたはパスワードを確認してください。");
      return;
    }

    router.push("/home");
  }

  return (
    <main className="min-h-screen bg-[#f6faf5] px-4 py-8">
      <div className="mx-auto max-w-md">
        <div className="mb-8 text-center">
          <p className="text-4xl font-bold text-green-800">農みえる</p>
          <p className="mt-2 text-lg text-stone-700">売上・経費・利益をかんたん確認</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-5 rounded-2xl bg-white p-5 shadow-sm">
          <h1 className="text-3xl font-bold">ログイン</h1>
          <ErrorMessage message={error} />
          <Field label="メールアドレス">
            <input
              className={inputClass}
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </Field>
          <Field label="パスワード">
            <input
              className={inputClass}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </Field>
          <button className={buttonClass} disabled={saving}>
            {saving ? "確認中です" : "ログインする"}
          </button>
          <Link
            href="/signup"
            className="block rounded-2xl border border-green-200 px-5 py-4 text-center text-lg font-bold text-green-900"
          >
            新しく登録する
          </Link>
        </form>
      </div>
    </main>
  );
}
