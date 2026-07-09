import asyncio
import aiohttp
import json

async def test_products_endpoint():
    """Test the products endpoint"""
    async with aiohttp.ClientSession() as session:
        # Test the products endpoint
        url = "http://localhost:8000/api/v1/products"
        
        try:
            async with session.get(url) as response:
                print(f"Status: {response.status}")
                print(f"Headers: {response.headers}")
                
                if response.status == 200:
                    data = await response.json()
                    print(f"Response: {json.dumps(data, indent=2)}")
                else:
                    text = await response.text()
                    print(f"Error response: {text}")
                    
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_products_endpoint())

