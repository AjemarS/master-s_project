"""
Shared test factory functions for Django service tests.
Import in any service's tests.py to avoid duplicating these helpers.
"""
from decimal import Decimal

from django.contrib.auth import get_user_model

User = get_user_model()


def create_admin_user(username="admin", email="admin@test.com", password="password123"):
    return User.objects.create_superuser(username, email, password)


def create_regular_user(username="user", email="user@test.com", password="password123"):
    return User.objects.create_user(username, email, password)


def create_cashier_user(username="cashier", email="cashier@test.com", password="password123"):
    user = User.objects.create_user(username, email, password)
    user.gateway_role = "cashier"
    return user


def create_warehouse_user(username="warehouse", email="warehouse@test.com", password="password123"):
    user = User.objects.create_user(username, email, password)
    user.gateway_role = "warehouse_worker"
    return user
