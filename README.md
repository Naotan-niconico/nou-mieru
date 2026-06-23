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
5. 有料プランを使う場合は、`supabase/subscriptions.sql` をSQL Editorで実行します。既に `subscriptions` テーブルがある場合も、RLSポリシーと更新トリガーを確認してください。

## 環境変数

`.env.example` を参考に `.env.local` を作成します。

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
STRIPE_SECRET_KEY=sk_test_your-stripe-secret-key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your-stripe-publishable-key
STRIPE_WEBHOOK_SECRET=whsec_your-stripe-webhook-secret
STRIPE_PRICE_ID=price_your-monthly-price
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPPORT_EMAIL=naotanmaru9world@gmail.com
```

## ローカル起動

```bash
npm install
npm run dev
```

ブラウザで `http://localhost:3000` を開きます。

## 無料・有料プラン

無料プランでは、作物1件、機械1件、売上は当月5件、経費は当月5件まで登録できます。レシート一覧と月別レポートの全表示は有料プラン向けです。

有料プランは月額500円（税込想定）で、売上・経費・作物・機械を無制限に登録できます。`subscriptions.status` が `active` または `trialing` のユーザーを有料として扱います。`current_period_end` が未来の手動設定でも有料として扱います。

### 手動で有料にする

Stripeを設定しなくても、SupabaseのTable Editorで対象ユーザーの `subscriptions` に行を追加または更新すれば有料にできます。

```text
user_id: 対象のAuthユーザーID
status: active
current_period_end: 任意（空でも可）
```

フロントエンドからこのテーブルを更新する権限はありません。

## StripeとVercelの設定

1. Stripeで月額500円のPriceを作成し、IDを `STRIPE_PRICE_ID` に設定します。
2. Stripe DashboardのWebhookに `https://あなたのドメイン/api/stripe/webhook` を登録します。
3. `checkout.session.completed`、`customer.subscription.created`、`customer.subscription.updated`、`customer.subscription.deleted`、`invoice.paid`、`invoice.payment_failed` を送信対象にします。
4. 表示されたWebhook signing secretを `STRIPE_WEBHOOK_SECRET` に設定します。
5. VercelのEnvironment Variablesに `.env.example` のSupabase/Stripe/App URLの値を追加し、Production・Preview・Developmentを必要に応じて選びます。秘密情報の `STRIPE_SECRET_KEY`、`STRIPE_WEBHOOK_SECRET`、`SUPABASE_SERVICE_ROLE_KEY` に `NEXT_PUBLIC_` は付けません。

### ローカルWebhookテスト

Stripe CLIにログインしてから、別のターミナルで以下を実行します。

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

表示された `whsec_...` を `.env.local` の `STRIPE_WEBHOOK_SECRET` に設定します。テストイベントは次のように送れます。

```bash
stripe trigger checkout.session.completed
```

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
