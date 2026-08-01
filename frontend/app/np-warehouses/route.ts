import { NextResponse } from "next/server";

interface NovaPoshtaWarehouseItem {
  Ref: string;
  Description?: string;
  ShortAddress?: string;
  Number?: string;
  CategoryOfWarehouse?: string;
  TypeOfWarehouse?: string;
}

interface NovaPoshtaWarehousesResponse {
  success: boolean;
  data: NovaPoshtaWarehouseItem[];
  errors: string[];
}

const NOVA_POSHTA_API_URL = "https://api.novaposhta.ua/v2.0/json/";
const MIN_QUERY_LENGTH = 3;
const MAX_WAREHOUSES = 50;

const POSTOMAT_TYPE_GUIDS = new Set([
  "95dc212d-479c-4ffb-a8ab-8c1b9073d0bc",
  "f9316480-5f2d-425d-bc2c-ac7cd29decf0",
]);

function warehouseNumberRank(item: NovaPoshtaWarehouseItem): number | null {
  const parsed = Number.parseInt(item.Number ?? "", 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function isPostomat(item: NovaPoshtaWarehouseItem): boolean {
  if (item.CategoryOfWarehouse) {
    return item.CategoryOfWarehouse === "Postomat";
  }
  return item.TypeOfWarehouse !== undefined && POSTOMAT_TYPE_GUIDS.has(item.TypeOfWarehouse);
}

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cityRef = searchParams.get("cityRef")?.trim() ?? "";
  const query = searchParams.get("q")?.trim() ?? "";

  if (!cityRef) {
    return NextResponse.json({ error: "NP_CITY_REF_REQUIRED" }, { status: 400 });
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
        calledMethod: "getWarehouses",
        methodProperties: {
          CityRef: cityRef,
          Page: "1",
          Limit: "50",
          ...(query.length >= MIN_QUERY_LENGTH ? { FindByString: query } : {}),
        },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    console.error(`Nova Poshta warehouse search failed for city: ${cityRef}`);
    return NextResponse.json({ error: "NP_NETWORK_ERROR" }, { status: 502 });
  }

  if (!response.ok) {
    console.error(
      `Nova Poshta warehouse search returned HTTP ${response.status} for city: ${cityRef}`,
    );
    return NextResponse.json({ warehouses: [], error: "NP_NETWORK_ERROR" }, { status: 502 });
  }

  let payload: NovaPoshtaWarehousesResponse;
  try {
    payload = await response.json();
  } catch {
    console.error(`Nova Poshta warehouse search returned invalid JSON for city: ${cityRef}`);
    return NextResponse.json({ error: "NP_BAD_RESPONSE" }, { status: 502 });
  }

  if (!payload.success) {
    const message = payload.errors?.[0] ?? null;
    console.error(`Nova Poshta warehouse search rejected city: ${cityRef}`, message);
    return NextResponse.json({ warehouses: [], error: message });
  }

  const seenRefs = new Set<string>();
  const warehouses = [...(Array.isArray(payload.data) ? payload.data : [])]
    .filter((item) => {
      if (seenRefs.has(item.Ref)) return false;
      seenRefs.add(item.Ref);
      return true;
    })
    .sort((a, b) => {
      const aRank = warehouseNumberRank(a);
      const bRank = warehouseNumberRank(b);
      if (aRank === null && bRank === null) return 0;
      if (aRank === null) return 1;
      if (bRank === null) return -1;
      return aRank - bRank;
    })
    .slice(0, MAX_WAREHOUSES)
    .map((item) => {
      const isPost = isPostomat(item);
      const name = item.Number
        ? `${isPost ? "Поштомат" : "Відділення"} №${item.Number}`
        : (item.Description || item.ShortAddress || (isPost ? "Поштомат" : "Відділення"));
      return {
        name,
        ref: item.Ref,
        address: item.ShortAddress || item.Description || "",
        type: isPost ? "postomat" : "warehouse",
      };
    });

  return NextResponse.json({ warehouses });
}
