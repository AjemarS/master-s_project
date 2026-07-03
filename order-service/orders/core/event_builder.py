"""Event building helpers for RabbitMQ events."""
from uuid import uuid4


def build_order_event(order):
    """Build the standard order event payload for RabbitMQ."""
    return {
        "event_id": str(uuid4()),
        "order_id": order.id,
        "order_number": order.order_number,
        "channel": order.channel,
        "status": order.status,
        "warehouse_id": order.warehouse_id,
        "total_amount": str(order.total_amount),
        "customer_email": order.customer_email,
        "items": [
            {
                "product_id": item.product_id,
                "product_name": item.product_name,
                "quantity": item.quantity,
                "price": str(item.price),
            }
            for item in order.items.all()
        ],
    }
