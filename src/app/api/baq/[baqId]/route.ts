import type { NextRequest } from "next/server";
import { EpicorError, getBaqData } from "@/lib/epicor";

const ODATA_KEYS = new Set(["$top", "$skip", "$filter", "$orderby", "$select"]);

// GET /api/baq/{BaqID}?$top=50&$filter=...&ParamName=value
// พร็อกซีไปยัง Epicor เพื่อไม่ให้ credential หลุดไปฝั่ง browser
export async function GET(req: NextRequest, ctx: RouteContext<"/api/baq/[baqId]">) {
  const { baqId } = await ctx.params;
  const sp = req.nextUrl.searchParams;

  const params: Record<string, string> = {};
  for (const [key, value] of sp) {
    if (!ODATA_KEYS.has(key)) params[key] = value;
  }

  try {
    const result = await getBaqData(baqId, {
      top: sp.has("$top") ? Number(sp.get("$top")) : 100,
      skip: sp.has("$skip") ? Number(sp.get("$skip")) : undefined,
      filter: sp.get("$filter") ?? undefined,
      orderby: sp.get("$orderby") ?? undefined,
      select: sp.get("$select") ?? undefined,
      params,
    });
    return Response.json(result);
  } catch (err) {
    const status = err instanceof EpicorError ? err.status : 500;
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status });
  }
}
