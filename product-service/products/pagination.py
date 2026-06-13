from rest_framework.pagination import PageNumberPagination


class StandardResultsSetPagination(PageNumberPagination):
    """
    Enforces pagination on ALL list endpoints — including custom actions
    such as `low_stock` and `by_category` — so that a single request can
    never return an unbounded result set.
    """

    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100
