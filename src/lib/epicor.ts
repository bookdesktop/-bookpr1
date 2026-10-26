// ใช้ได้เฉพาะฝั่ง server เท่านั้น (Server Components / Route Handlers)
// เพราะต้องใช้ username / password / API key ของ Epicor

export type BaqRow = Record<string, string | number | boolean | null>;

export type BaqQuery = {
  top?: number;
  skip?: number;
  filter?: string;
  orderby?: string;
  select?: string;
  // พารามิเตอร์ของ BAQ (ที่ตั้งไว้ใน BAQ Designer) เช่น { StartDate: "2026-01-01" }
  params?: Record<string, string>;
};

export type BaqResult = {
  rows: BaqRow[];
  count?: number;
};

export class EpicorError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new EpicorError(`ยังไม่ได้ตั้งค่า ${name} ใน .env.local`, 500);
  return value;
}

function buildUrl(baqId: string, query: BaqQuery): URL {
  if (!/^[\w-]+$/.test(baqId)) throw new EpicorError(`BAQ ID ไม่ถูกต้อง: ${baqId}`, 400);

  const base = env("EPICOR_BASE_URL").replace(/\/+$/, "");
  const version = process.env.EPICOR_API_VERSION ?? "v2";

  // v2: {base}/api/v2/odata/{Company}/BaqSvc/{BaqID}/Data
  // v1: {base}/api/v1/BaqSvc/{BaqID}/
  const url =
    version === "v1"
      ? new URL(`${base}/api/v1/BaqSvc/${baqId}/`)
      : new URL(`${base}/api/v2/odata/${encodeURIComponent(env("EPICOR_COMPANY"))}/BaqSvc/${baqId}/Data`);

  if (query.top != null) url.searchParams.set("$top", String(query.top));
  if (query.skip != null) url.searchParams.set("$skip", String(query.skip));
  if (query.filter) url.searchParams.set("$filter", query.filter);
  if (query.orderby) url.searchParams.set("$orderby", query.orderby);
  if (query.select) url.searchParams.set("$select", query.select);
  if (version !== "v1") url.searchParams.set("$count", "true");
  for (const [key, value] of Object.entries(query.params ?? {})) {
    url.searchParams.set(key, value);
  }
  return url;
}

function buildHeaders(): HeadersInit {
  const headers: Record<string, string> = { Accept: "application/json" };

  // Kinetic / REST v2 ต้องส่ง API Key ทุกครั้ง (สร้างได้ที่ API Key Maintenance)
  const apiKey = process.env.EPICOR_API_KEY;
  if (apiKey) headers["X-API-Key"] = apiKey;

  const token = process.env.EPICOR_TOKEN;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  } else {
    const credentials = `${env("EPICOR_USERNAME")}:${env("EPICOR_PASSWORD")}`;
    headers.Authorization = `Basic ${Buffer.from(credentials).toString("base64")}`;
  }
  return headers;
}

export async function getBaqData(baqId: string, query: BaqQuery = {}): Promise<BaqResult> {
  const res = await fetch(buildUrl(baqId, query), { headers: buildHeaders() });

  if (!res.ok) {
    const body = await res.text();
    let message = body;
    try {
      const json = JSON.parse(body);
      message = json.ErrorMessage ?? json.error?.message ?? body;
    } catch {}
    throw new EpicorError(`Epicor ตอบกลับ ${res.status}: ${message.slice(0, 500)}`, res.status);
  }

  const json = await res.json();
  return {
    rows: (json.value ?? []) as BaqRow[],
    count: json["@odata.count"],
  };
}
