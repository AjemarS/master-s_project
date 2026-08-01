import { NextResponse } from "next/server";

interface NovaPoshtaCityItem {
  Ref: string;
  Description: string;
  Area?: string;
  SettlementTypeDescription?: string;
}

interface NovaPoshtaCitiesResponse {
  success: boolean;
  data: NovaPoshtaCityItem[];
  errors: string[];
  errorCodes?: number[];
}

const NOVA_POSHTA_API_URL = "https://api.novaposhta.ua/v2.0/json/";
const MIN_QUERY_LENGTH = 3;
const MAX_CITIES = 10;

function cityTypeRank(item: NovaPoshtaCityItem): number {
  return item.SettlementTypeDescription === "місто" ? 0 : 1;
}

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";

  if (query.length < MIN_QUERY_LENGTH) {
    return NextResponse.json({ cities: [] });
  }

  const apiKey = process.env.NOVA_POST_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "NP_API_KEY_MISSING" }, { status: 503 });
  }

  let response: Response;
  try {
    response = await fetch(NOVA_POSHTA_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiKey,
        modelName: "Address",
        calledMethod: "getCities",
        methodProperties: { FindByString: query, Page: "1", Limit: String(MAX_CITIES) },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    console.error(`Nova Poshta city search failed for query: ${query}`);
    return NextResponse.json({ error: "NP_NETWORK_ERROR" }, { status: 502 });
  }

  if (!response.ok) {
    console.error(`Nova Poshta city search returned HTTP ${response.status} for query: ${query}`);
    return NextResponse.json({ cities: [], error: "NP_NETWORK_ERROR" }, { status: 502 });
  }

  let payload: NovaPoshtaCitiesResponse;
  try {
    payload = await response.json();
  } catch {
    console.error(`Nova Poshta city search returned invalid JSON for query: ${query}`);
    return NextResponse.json({ error: "NP_BAD_RESPONSE" }, { status: 502 });
  }

  if (!payload.success) {
    const message = payload.errors?.[0] ?? null;
    console.error(`Nova Poshta city search rejected query: ${query}`, message);
    return NextResponse.json({ cities: [], error: message });
  }

  const seenNames = new Set<string>();
  const cities = [...(Array.isArray(payload.data) ? payload.data : [])]
    .sort((a, b) => cityTypeRank(a) - cityTypeRank(b))
    .filter((item) => {
      if (seenNames.has(item.Description)) return false;
      seenNames.add(item.Description);
      return true;
    })
    .slice(0, MAX_CITIES)
    .map((item) => ({
      name: item.Description,
      ref: item.Ref,
      area: item.Area ?? undefined,
      type: item.SettlementTypeDescription ?? undefined,
    }));

  return NextResponse.json({ cities });
}
