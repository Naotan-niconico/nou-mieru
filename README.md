# 農みえる

農家向け収支・経費管理Webアプリ「農みえる」のMVPです。高齢農家でも使いやすいように、大きな文字・大きなボタン・分かりやすい言葉を優先しています。

## 技術構成

- Next.js
- TypeScript
- Tailwind CSS
- Supabase Auth / Database / Storage

## 実装した機能

- メールアドレスとパスワードのログイン
- 新規登録
- 初回設定
- ホーム画面の今月集計
- 作物の登録・編集・削除
- 売上登録
- 経費登録
- レシート画像アップロード
- レシート一覧と拡大表示
- 機械の登録・編集・削除
- 月別集計と簡単な棒グラフ
- スマホ縦画面を優先したUI

## Supabase設定

1. Supabaseでプロジェクトを作成します。
2. `supabase/schema.sql` をSQL Editorで実行します。
3. AuthenticationのEmailログインを有効にします。
4. Storageに `receipts` バケットが作成されていることを確認します。

## 環境変数

`.env.example` を参考に `.env.local` を作成します。

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## ローカル起動

```bash
npm install
npm run dev
```

ブラウザで `http://localhost:3000` を開きます。

## 画面

- `/login` ログイン
- `/signup` 新規登録
- `/setup` 初期設定
- `/home` ホーム
- `/crops` 作物を見る
- `/sales/new` 売上を入れる
- `/expenses/new` 経費を入れる
- `/receipts` レシートを見る
- `/machines` 機械を見る
- `/reports` 結果を見る

## MVPで入れていないもの

- OCRによるレシート自動読み取り
- AIによる経費分類
- 複数カテゴリ契約
- 決済機能
- 請求書発行機能
- 確定申告書類の自動作成
- 厳密な減価償却計算
- 管理画面
- ネイティブアプリ化
- 多言語対応

## 今後の改善案

- レシートOCRの追加
- 作物別の利益集計
- 機械修理履歴の専用画面
- CSV出力
- 月次メモや振り返り欄
- JA・自治体向け共有機能
