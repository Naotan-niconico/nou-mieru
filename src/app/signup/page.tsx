"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { buttonClass, ErrorMessage, Field, inputClass } from "@/components/FormParts";
import { hasSupabaseConfig, supabase } from "@/lib/supabase";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!hasSupabaseConfig) {
      setError(".env.local に Supabase のURLとAnon Keyを設定してください。");
      return;
    }

    setSaving(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo:
          typeof window !== "undefined" ? `${window.location.origin}/setup` : undefined,
      },
    });
    setSaving(false);

    if (signUpError) {
      setError(`登録できませんでした。${signUpError.message}`);
      return;
    }

    if (data.session) {
      router.push("/setup");
      return;
    }

    setMessage(
      "登録を受け付けました。確認メールが届いた場合は、メール内のリンクを開いてからログインしてください。",
    );
  }

  return (
    <main className="min-h-screen bg-[#f6faf5] px-4 py-8">
      <div className="mx-auto max-w-md">
        <div className="mb-8 text-center">
          <p className="text-4xl font-bold text-green-800">農みえる</p>
          <p className="mt-2 text-lg text-stone-700">最初にアカウントを作ります</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-5 rounded-2xl bg-white p-5 shadow-sm">
          <h1 className="text-3xl font-bold">新規登録</h1>
          <ErrorMessage message={error} />
          {message ? (
            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-lg font-bold leading-8 text-green-900">
              {message}
            </div>
          ) : null}
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
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </Field>
          <button className={buttonClass} disabled={saving}>
            {saving ? "登録中です" : "登録する"}
          </button>
          <Link href="/login" className="block py-2 text-center text-lg font-bold text-green-900">
            ログイン画面へ
          </Link>
        </form>
      </div>
    </main>
  );
}
