// ใช้ได้เฉพาะฝั่ง server เท่านั้น (Server Components / Route Handlers)
// เพราะต้องใช้ username / password / API key ของ Epicor

import { readFileSync } from "node:fs";
import { checkServerIdentity } from "node:tls";
import { Agent, fetch } from "undici";

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

// path คือส่วนหลัง company เช่น "BaqSvc/zCustomerList/Data" หรือ "Erp.BO.ReqSvc/Reqs"
function buildUrl(path: string, query: BaqQuery): URL {
  const base = env("EPICOR_BASE_URL").replace(/\/+$/, "");
  const version = process.env.EPICOR_API_VERSION ?? "v2";

  // v2: {base}/api/v2/odata/{Company}/{path}
  // v1: {base}/api/v1/{path}
  const url =
    version === "v1"
      ? new URL(`${base}/api/v1/${path}`)
      : new URL(`${base}/api/v2/odata/${encodeURIComponent(env("EPICOR_COMPANY"))}/${path}`);

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

// Epicor ในองค์กรมักใช้ใบรับรองแบบ self-signed ที่ออกให้ชื่อเครื่อง (ไม่ใช่ IP)
// EPICOR_CA_CERT      = path ของไฟล์ .pem ที่จะเชื่อถือ
// EPICOR_TLS_SERVERNAME = ชื่อในใบรับรอง ใช้ตรวจแทน host ใน URL
let dispatcher: Agent | undefined;
function getDispatcher(): Agent | undefined {
  const caPath = process.env.EPICOR_CA_CERT;
  const servername = process.env.EPICOR_TLS_SERVERNAME;
  if (!caPath && !servername) return undefined;

  dispatcher ??= new Agent({
    connect: {
      ca: caPath ? readFileSync(caPath, "utf8") : undefined,
      servername,
      checkServerIdentity: servername ? (_host, cert) => checkServerIdentity(servername, cert) : undefined,
    },
  });
  return dispatcher;
}

function buildHeaders(): Record<string, string> {
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

async function epicorGet(path: string, query: BaqQuery): Promise<BaqResult> {
  let res;
  try {
    res = await fetch(buildUrl(path, query), { headers: buildHeaders(), dispatcher: getDispatcher() });
  } catch (err) {
    // "fetch failed" ไม่บอกสาเหตุ ต้องดูจาก err.cause (เช่น ECONNREFUSED, SELF_SIGNED_CERT)
    const cause = err instanceof Error && err.cause instanceof Error ? err.cause : undefined;
    const code = cause && "code" in cause ? ` [${cause.code}]` : "";
    throw new EpicorError(`เชื่อมต่อ Epicor ไม่ได้${code}: ${cause?.message ?? String(err)}`, 502);
  }

  if (!res.ok) {
    const body = await res.text();
    let message = body;
    try {
      const json = JSON.parse(body);
      message = json.ErrorMessage ?? json.error?.message ?? body;
    } catch {}
    throw new EpicorError(`Epicor ตอบกลับ ${res.status}: ${message.slice(0, 500)}`, res.status);
  }

  const json = (await res.json()) as { value?: BaqRow[]; "@odata.count"?: number };
  return {
    rows: json.value ?? [],
    count: json["@odata.count"],
  };
}

export async function getBaqData(baqId: string, query: BaqQuery = {}): Promise<BaqResult> {
  if (!/^[\w-]+$/.test(baqId)) throw new EpicorError(`BAQ ID ไม่ถูกต้อง: ${baqId}`, 400);
  const version = process.env.EPICOR_API_VERSION ?? "v2";
  return epicorGet(version === "v1" ? `BaqSvc/${baqId}/` : `BaqSvc/${baqId}/Data`, query);
}

// Purchase Requisition (Erp.BO.ReqSvc)
export async function getRequisitions(query: BaqQuery = {}): Promise<BaqResult> {
  return epicorGet("Erp.BO.ReqSvc/Reqs", query);
}

export async function getRequisition(reqNum: number) {
  const [head, lines] = await Promise.all([
    epicorGet("Erp.BO.ReqSvc/Reqs", { filter: `ReqNum eq ${reqNum}`, top: 1 }),
    epicorGet("Erp.BO.ReqSvc/ReqDetails", { filter: `ReqNum eq ${reqNum}`, orderby: "ReqLine" }),
  ]);
  return { header: head.rows[0] ?? null, lines: lines.rows };
}
