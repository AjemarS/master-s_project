from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .cart_models import Cart, CartItem
from .cart_serializers import CartSerializer, CartItemSerializer
from .models import Product


class CartViewSet(viewsets.ModelViewSet):
    queryset = Cart.objects.all()
    serializer_class = CartSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if not self.request.user.is_authenticated:
            return Cart.objects.none()
        return Cart.objects.filter(user_id=self.request.user.id).prefetch_related("items__product")

    def get_cart(self):
        if not self.request.user.is_authenticated:
            return None
        cart, _ = Cart.objects.get_or_create(user_id=self.request.user.id)
        return cart

    def list(self, request, *args, **kwargs):
        cart = self.get_cart()
        if not cart:
            return Response({"error": "Authentication required"}, status=401)
        serializer = self.get_serializer(cart)
        return Response(serializer.data)

    @action(detail=False, methods=["post"])
    def add_item(self, request):
        cart = self.get_cart()
        if not cart:
            return Response({"error": "Authentication required"}, status=401)

        product_id = request.data.get("product_id")
        quantity = int(request.data.get("quantity", 1))

        if not product_id:
            return Response({"error": "product_id is required"}, status=400)

        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            return Response({"error": "Product not found"}, status=404)

        if quantity < 1:
            return Response({"error": "Quantity must be at least 1"}, status=400)

        cart_item, created = CartItem.objects.get_or_create(
            cart=cart,
            product=product,
            defaults={"quantity": quantity},
        )
        if not created:
            cart_item.quantity += quantity
            cart_item.save()

        serializer = CartSerializer(cart)
        return Response(serializer.data)

    @action(detail=False, methods=["post"])
    def update_item(self, request):
        cart = self.get_cart()
        if not cart:
            return Response({"error": "Authentication required"}, status=401)

        product_id = request.data.get("product_id")
        quantity = int(request.data.get("quantity", 0))

        if not product_id:
            return Response({"error": "product_id is required"}, status=400)

        if quantity < 0:
            return Response({"error": "Quantity cannot be negative"}, status=400)

        if quantity == 0:
            CartItem.objects.filter(cart=cart, product_id=product_id).delete()
        else:
            CartItem.objects.filter(cart=cart, product_id=product_id).update(quantity=quantity)

        serializer = CartSerializer(cart)
        return Response(serializer.data)

    @action(detail=False, methods=["post"])
    def remove_item(self, request):
        cart = self.get_cart()
        if not cart:
            return Response({"error": "Authentication required"}, status=401)

        product_id = request.data.get("product_id")
        if not product_id:
            return Response({"error": "product_id is required"}, status=400)

        CartItem.objects.filter(cart=cart, product_id=product_id).delete()

        serializer = CartSerializer(cart)
        return Response(serializer.data)

    @action(detail=False, methods=["post"])
    def clear(self, request):
        cart = self.get_cart()
        if not cart:
            return Response({"error": "Authentication required"}, status=401)

        CartItem.objects.filter(cart=cart).delete()
        return Response({"message": "Cart cleared"})

    @action(detail=False, methods=["post"])
    def merge(self, request):
        """Merge localStorage cart items into server cart on login."""
        cart = self.get_cart()
        if not cart:
            return Response({"error": "Authentication required"}, status=401)

        local_items = request.data.get("items", [])
        if not isinstance(local_items, list):
            return Response({"error": "items must be a list"}, status=400)

        for item in local_items:
            product_id = item.get("id")
            quantity = int(item.get("quantity", 1))
            if not product_id or quantity < 1:
                continue
            try:
                product = Product.objects.get(id=product_id)
            except Product.DoesNotExist:
                continue
            cart_item, created = CartItem.objects.get_or_create(
                cart=cart,
                product=product,
                defaults={"quantity": quantity},
            )
            if not created:
                cart_item.quantity += quantity
                cart_item.save()

        serializer = CartSerializer(cart)
        return Response(serializer.data)