from slowapi import Limiter
from slowapi.util import get_remote_address

# Initialize Limiter with remote address as key (IP based)
limiter = Limiter(key_func=get_remote_address)
