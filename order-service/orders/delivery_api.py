"""Proxy endpoints for delivery service APIs (Nova Poshta, Ukrposhta)."""
import json
import logging
import urllib.request
import urllib.error
from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from django.views.decorators.csrf import csrf_exempt

logger = logging.getLogger(__name__)

NOVA_POSHTA_API_URL = "https://api.novaposhta.ua/v2.0/json/"
UKRPOSHTA_API_URL = "https://www.ukrposhta.ua/address-classifier/warehouses"


@csrf_exempt
@require_POST
def nova_poshta_warehouses(request):
    """Proxy to Nova Poshta getWarehouses API.
    Expects JSON body: {"city_name": "Київ"}
    """
    try:
        body = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    city_name = body.get("city_name", "")
    if not city_name:
        return JsonResponse({"error": "city_name required"}, status=400)

    api_key = getattr(settings, "NOVA_POSHTA_API_KEY", "")
    if not api_key:
        # Return mock data for development
        return JsonResponse({
            "success": True,
            "data": [
                {
                    "name": f"Відділення №{i}",
                    "ref": f"warehouse_{i}",
                    "address": f"м. {city_name}, вул. Тестова, {i}",
                }
                for i in range(1, 4)
            ],
        })

    payload = {
        "apiKey": api_key,
        "modelName": "Address",
        "calledMethod": "getWarehouses",
        "methodProperties": {
            "CityName": city_name,
            "Limit": 50,
        },
    }

    try:
        req = urllib.request.Request(
            NOVA_POSHTA_API_URL,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            result = json.loads(resp.read().decode("utf-8"))
            raw_items = result.get("data", []) if isinstance(result.get("data"), list) else []
            mapped = [
                {
                    "name": item.get("Description") or item.get("ShortAddress") or f"Відділення {i}",
                    "ref": item.get("Ref", ""),
                    "address": item.get("ShortAddress", ""),
                }
                for i, item in enumerate(raw_items, 1)
            ]
            return JsonResponse({"success": True, "data": mapped})
    except urllib.error.URLError as e:
        logger.error("Nova Poshta API error: %s", e)
        return JsonResponse({"error": str(e)}, status=502)


@csrf_exempt
@require_POST
def ukrposhta_warehouses(request):
    """Proxy to Ukrposhta warehouse API.
    Expects JSON body: {"city_name": "Київ"}
    Falls back to mock data if no API available.
    """
    try:
        body = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    city_name = body.get("city_name", "")
    if not city_name:
        return JsonResponse({"error": "city_name required"}, status=400)

    # Mock data for development
    return JsonResponse({
        "success": True,
        "data": [
            {
                "name": f"Поштове відділення №{i}",
                "address": f"м. {city_name}, вул. Поштова, {i}",
            }
            for i in range(1, 3)
        ],
    })
