# app/services/redis_service.py

import redis

def get_redis_client() -> redis.Redis:
    return redis.Redis(host="localhost", port=6379, decode_responses=True)
