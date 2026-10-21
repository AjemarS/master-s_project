from decimal import Decimal
from unittest import mock

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from ..models import Review
from ..order_client import OrdersUnavailable
from .helpers import _create_admin_user, _create_product

User = get_user_model()

PURCHASED = "products.reviews_views.has_purchased"


class ReviewsAPITest(APITestCase):
    def setUp(self):
        self.product = _create_product(rating=Decimal("0.0"))
        self.url = f"/api/products/{self.product.pk}/reviews/"
        self.buyer = User.objects.create_user("gw_1", "buyer@test.com", "pw", first_name="Olena Petrenko")

    def _post(self, user, rating=5, text="Great fridge", bought=True):
        self.client.force_authenticate(user=user)
        with mock.patch(PURCHASED, return_value=bought):
            return self.client.post(self.url, {"rating": rating, "text": text}, format="json")

    def test_buyer_review_updates_product_rating(self):
        other = User.objects.create_user("gw_2", "o@test.com", "pw", first_name="buyer2@mail.com")
        self.assertEqual(self._post(self.buyer, 5).status_code, status.HTTP_201_CREATED)
        self.assertEqual(self._post(other, 2).status_code, status.HTTP_201_CREATED)
        self.product.refresh_from_db()
        self.assertEqual((self.product.rating, self.product.review_count), (Decimal("3.5"), 2))
        names = set(Review.objects.values_list("author_name", flat=True))
        self.assertEqual(names, {"Olena", ""})  # last name dropped, an email never shown

    def test_second_post_replaces_own_review(self):
        self._post(self.buyer, 5)
        self.assertEqual(self._post(self.buyer, 1, "Broke after a week").status_code, status.HTTP_200_OK)
        self.assertEqual(Review.objects.count(), 1)
        self.product.refresh_from_db()
        self.assertEqual(self.product.rating, Decimal("1.0"))

    def test_non_buyer_cannot_review(self):
        self.assertEqual(self._post(self.buyer, bought=False).status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(Review.objects.exists())

    def test_anonymous_cannot_review_and_rating_is_bounded(self):
        self.assertIn(self.client.post(self.url, {"rating": 5}, format="json").status_code, (401, 403))
        self.assertEqual(self._post(self.buyer, rating=6).status_code, status.HTTP_400_BAD_REQUEST)

    def test_order_service_outage_refuses_the_review(self):
        self.client.force_authenticate(user=self.buyer)
        with mock.patch(PURCHASED, side_effect=OrdersUnavailable("down")):
            response = self.client.post(self.url, {"rating": 5}, format="json")
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)

    def test_public_list_has_summary_and_hides_moderated_reviews(self):
        self._post(self.buyer, 4)
        hidden = Review.objects.create(product=self.product, user_id="gw_9", rating=1, text="spam", is_published=False)
        self.client.force_authenticate(user=None)
        data = self.client.get(self.url).data
        self.assertEqual([r["rating"] for r in data["results"]], [4])
        self.assertEqual(data["summary"]["distribution"], {"5": 0, "4": 1, "3": 0, "2": 0, "1": 0})
        self.assertNotIn("can_review", data)
        self.assertNotIn(hidden.pk, [r["id"] for r in data["results"]])

    def test_signed_in_list_tells_whether_user_may_review(self):
        self.client.force_authenticate(user=self.buyer)
        with mock.patch(PURCHASED, return_value=True):
            data = self.client.get(self.url).data
        self.assertEqual((data["can_review"], data["mine"]), (True, None))

    def test_admin_hides_a_review_and_the_rating_follows(self):
        self._post(self.buyer, 5)
        review = Review.objects.get()
        self.client.force_authenticate(user=_create_admin_user())
        response = self.client.patch(f"/api/reviews/{review.pk}/", {"is_published": False}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.product.refresh_from_db()
        self.assertEqual((self.product.rating, self.product.review_count), (Decimal("0.0"), 0))

    def test_buyer_cannot_moderate(self):
        self._post(self.buyer, 5)
        review = Review.objects.get()
        response = self.client.patch(f"/api/reviews/{review.pk}/", {"is_published": False}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_catalog_can_sort_by_rating(self):
        better = _create_product(category=self.product.category, name="Better", rating=Decimal("4.8"))
        response = self.client.get("/api/products/?ordering=-rating")
        self.assertEqual(response.data["results"][0]["id"], better.pk)
