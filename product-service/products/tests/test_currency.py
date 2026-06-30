from decimal import Decimal
from unittest.mock import patch

from django.core.cache import cache
from django.test import TestCase

from ..currency import FALLBACK_RATE, get_usd_rate, uah_to_usd


class CurrencyTest(TestCase):
    def setUp(self):
        cache.clear()

    def test_get_usd_rate_returns_decimal(self):
        rate = get_usd_rate()
        self.assertIsInstance(rate, Decimal)

    def test_uah_to_usd_returns_rounded_decimal(self):
        result = uah_to_usd(Decimal("1000"))
        self.assertIsInstance(result, Decimal)
        self.assertEqual(result.as_tuple().exponent, -2)

    def test_fallback_rate_is_reasonable(self):
        self.assertGreater(FALLBACK_RATE, 0)
        self.assertLess(FALLBACK_RATE, 1)

    @patch("products.currency._fetch_usd_rate", return_value=Decimal("0.025"))
    def test_conversion_uses_live_rate(self, mock_fetch):
        result = uah_to_usd(Decimal("1000"))
        self.assertEqual(result, Decimal("25.00"))
        mock_fetch.assert_called_once()

    @patch("products.currency._fetch_usd_rate", return_value=None)
    def test_fallback_when_api_unavailable(self, mock_fetch):
        result = uah_to_usd(Decimal("1000"))
        expected = (Decimal("1000") * FALLBACK_RATE).quantize(Decimal("0.01"))
        self.assertEqual(result, expected)

    def test_get_usd_rate_caches_result(self):
        with patch("products.currency._fetch_usd_rate", return_value=Decimal("0.030")) as mock_fetch:
            rate1 = get_usd_rate()
            rate2 = get_usd_rate()
            self.assertEqual(rate1, rate2)
            mock_fetch.assert_called_once()
