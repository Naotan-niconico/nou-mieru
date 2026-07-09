import { Buffer } from "node:buffer";
import { NextRequest, NextResponse } from "next/server";
import { expenseCategories, costTypes } from "@/lib/constants";
import { createAuthClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const DEFAULT_MODEL = "gpt-5.6-luna";

type ReceiptAnalysis = {
  isReceipt: boolean;
  message: string;
  expenseDate: string | null;
  vendor: string | null;
  amount: number | null;
  category: string | null;
  costType: string | null;
  memo: string | null;
  rawText: string | null;
  confidence: number;
};

function getAccessToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.toLowerCase().startsWith("bearer ")) return null;
  return authorization.slice("bearer ".length).trim();
}

function collectText(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(collectText).filter(Boolean).join("\n");
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.output_text === "string") return record.output_text;
    if (typeof record.text === "string") return record.text;
    return [record.output, record.content, record.message]
      .map(collectText)
      .filter(Boolean)
      .join("\n");
  }
  return "";
}

function parseJsonText(text: string) {
  const trimmed = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON object found in model output.");
    return JSON.parse(match[0]);
  }
}

function toIsoDate(value: unknown) {
  if (typeof value !== "string") return null;
  const match = value.match(/\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : null;
}

function toAmount(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  if (typeof value !== "string") return null;
  const normalized = value.replace(/[^0-9.-]/g, "");
  const amount = Number(normalized);
  return Number.isFinite(amount) ? Math.round(amount) : null;
}

function toSafeString(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, 1200) : null;
}

function normalize(parsed: Record<string, unknown>): ReceiptAnalysis {
  const isReceipt = parsed.isReceipt === true;
  const category = toSafeString(parsed.category);
  const costType = toSafeString(parsed.costType);
  const confidenceNumber = typeof parsed.confidence === "number" ? parsed.confidence : Number(parsed.confidence ?? 0);

  if (!isReceipt) {
    return {
      isReceipt: false,
      message: "レシートとして認識できませんでした。別の角度で撮り直してください。",
      expenseDate: null,
      vendor: null,
      amount: null,
      category: null,
      costType: null,
      memo: null,
      rawText: toSafeString(parsed.rawText),
      confidence: Number.isFinite(confidenceNumber) ? Math.max(0, Math.min(1, confidenceNumber)) : 0,
    };
  }

  return {
    isReceipt: true,
    message: "レシートを認識しました。内容を確認してから保存してください。",
    expenseDate: toIsoDate(parsed.expenseDate),
    vendor: toSafeString(parsed.vendor),
    amount: toAmount(parsed.amount),
    category: category && expenseCategories.includes(category) ? category : "その他",
    costType: costType && costTypes.includes(costType) ? costType : "未分類",
    memo: toSafeString(parsed.memo),
    rawText: toSafeString(parsed.rawText),
    confidence: Number.isFinite(confidenceNumber) ? Math.max(0, Math.min(1, confidenceNumber)) : 0.5,
  };
}

export async function POST(request: NextRequest) {
  const accessToken = getAccessToken(request);
  if (!accessToken) {
    return NextResponse.json({ error: "ログイン情報を確認できません。" }, { status: 401 });
  }

  const authClient = createAuthClient(accessToken);
  const {
    data: { user },
    error: userError,
  } = await authClient.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY が未設定です。Vercelの環境変数に追加してください。" }, { status: 500 });
  }

  const formData = await request.formData();
  const image = formData.get("receipt");

  if (!(image instanceof File)) {
    return NextResponse.json({ error: "画像ファイルを選んでください。" }, { status: 400 });
  }

  if (!image.type.startsWith("image/")) {
    return NextResponse.json({ error: "画像ファイルのみ解析できます。" }, { status: 400 });
  }

  if (image.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "画像が大きすぎます。8MB以下にしてください。" }, { status: 400 });
  }

  const bytes = Buffer.from(await image.arrayBuffer());
  const base64Image = bytes.toString("base64");
  const mimeType = image.type || "image/jpeg";
  const dataUrl = `data:${mimeType};base64,${base64Image}`;

  const prompt = `あなたは日本の農家向け会計アプリ「農見える」のレシート解析AIです。\n画像がレシート、領収書、請求書、購入明細など支出の証憑なら isReceipt を true にしてください。そうでなければ false にしてください。\nレシートの場合は、読み取れる範囲で以下を抽出してください。推測しすぎず、読めない項目は null にしてください。\n\n出力はJSONだけです。説明文やMarkdownは不要です。\n{\n  "isReceipt": boolean,\n  "expenseDate": "YYYY-MM-DD" | null,\n  "vendor": string | null,\n  "amount": number | null,\n  "category": ${JSON.stringify(expenseCategories)},\n  "costType": ${JSON.stringify(costTypes)},\n  "memo": string | null,\n  "rawText": string | null,\n  "confidence": number\n}\n\namount は税込合計金額を日本円の整数で返してください。category は必ず候補から1つ選んでください。costType は固定費、変動費、未分類のいずれかです。農業経費に分類しにくい場合は category を「その他」、costType を「未分類」にしてください。`;

  const openaiResponse = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_RECEIPT_MODEL || DEFAULT_MODEL,
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: prompt },
            { type: "input_image", image_url: dataUrl },
          ],
        },
      ],
      max_output_tokens: 900,
    }),
  });

  const result = await openaiResponse.json();
  if (!openaiResponse.ok) {
    console.error("Receipt AI analysis failed", result);
    return NextResponse.json({ error: "レシートAI解析に失敗しました。APIキーまたはモデル設定を確認してください。" }, { status: 502 });
  }

  try {
    const outputText = collectText(result);
    const parsed = parseJsonText(outputText) as Record<string, unknown>;
    return NextResponse.json(normalize(parsed));
  } catch (error) {
    console.error("Receipt AI JSON parse failed", error, result);
    return NextResponse.json({ error: "AI解析結果を読み取れませんでした。もう一度撮影してください。" }, { status: 502 });
  }
}
