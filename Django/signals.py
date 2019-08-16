from django.dispatch import Signal

membership_changed = Signal(providing_args=["user"])
