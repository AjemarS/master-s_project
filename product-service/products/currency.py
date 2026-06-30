import json
import logging
import os
from decimal import ROUND_HALF_UP, Decimal
from urllib.error import URLError
from urllib.request import Request, urlopen

from django.core.cache import cache

logger = logging.getLogger(__name__)

CACHE_KEY = "currency_usd_rate"
CACHE_TTL = 3600  # 1 hour

# Emergency override — set UAH_TO_USD_RATE env var to pin a rate
ENV_OVERRIDE = os.environ.get("UAH_TO_USD_RATE")
# Fallback if API and cache are both unavailable
FALLBACK_RATE = Decimal("0.0241")

API_URL = "https://api.exchangerate-api.com/v4/latest/UAH"


def _fetch_usd_rate() -> Decimal | None:
    if ENV_OVERRIDE:
        return Decimal(ENV_OVERRIDE)
    try:
        req = Request(API_URL, headers={"User-Agent": "TechHub/1.0"})
        with urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode())
            return Decimal(str(data["rates"]["USD"]))  # USD per 1 UAH
    except (URLError, KeyError, json.JSONDecodeError) as e:
        logger.warning("Failed to fetch exchange rate: %s", e)
        return None


def get_usd_rate() -> Decimal:
    """Get USD per 1 UAH. Shared across workers via Django cache."""
    cached = cache.get(CACHE_KEY)
    if cached is not None:
        return Decimal(str(cached))
    rate = _fetch_usd_rate()
    if rate is None:
        rate = FALLBACK_RATE
    cache.set(CACHE_KEY, str(rate), CACHE_TTL)
    return rate


def uah_to_usd(amount: Decimal) -> Decimal:
    """Convert UAH to USD at the live rate. Rounds to 2 decimal places."""
    rate = get_usd_rate()
    return (amount * rate).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
