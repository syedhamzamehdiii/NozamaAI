# =============== app/services/ai_service.py ===============
import openai
from typing import Dict, Any, List, Optional
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import asyncio

from app.config.settings import settings

# Initialize OpenAI
openai.api_key = settings.OPENAI_API_KEY

class AIService:
    def __init__(self):
        self.vectorizer = TfidfVectorizer(stop_words='english', max_features=1000)
        self.product_vectors = None
        self.product_ids = []
    
    async def get_product_recommendations(
        self,
        user_id: str,
        product_id: Optional[str] = None,
        limit: int = 6
    ) -> List[str]:
        """Get AI-powered product recommendations"""
        try:
            # This would implement collaborative filtering and content-based recommendations
            # For now, return a simple recommendation based on product similarity
            
            if product_id:
                return await self._get_similar_products(product_id, limit)
            else:
                return await self._get_personalized_recommendations(user_id, limit)
                
        except Exception as e:
            print(f"Failed to get recommendations: {str(e)}")
            return []
    
    async def _get_similar_products(self, product_id: str, limit: int) -> List[str]:
        """Get products similar to the given product"""
        # This would use product embeddings to find similar products
        # Placeholder implementation
        return []
    
    async def _get_personalized_recommendations(self, user_id: str, limit: int) -> List[str]:
        """Get personalized recommendations for user"""
        # This would analyze user behavior and preferences
        # Placeholder implementation
        return []
    
    async def generate_product_tags(self, title: str, description: str) -> List[str]:
        """Generate relevant tags for a product using AI"""
        try:
            prompt = f"""
            Generate 5-8 relevant tags for this AI/ML product:
            
            Title: {title}
            Description: {description}
            
            Tags should be relevant to AI, machine learning, data science, or the specific technology mentioned.
            Return only the tags, separated by commas.
            """
            
            response = await openai.ChatCompletion.acreate(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=100,
                temperature=0.3
            )
            
            tags_text = response.choices[0].message.content.strip()
            tags = [tag.strip().lower() for tag in tags_text.split(',')]
            
            return tags[:8]  # Limit to 8 tags
            
        except Exception as e:
            print(f"Failed to generate tags: {str(e)}")
            return []
    
    async def analyze_product_sentiment(self, reviews: List[str]) -> Dict[str, Any]:
        """Analyze sentiment of product reviews"""
        try:
            if not reviews:
                return {"sentiment": "neutral", "score": 0.0, "summary": "No reviews available"}
            
            # Combine all reviews
            combined_text = " ".join(reviews)
            
            prompt = f"""
            Analyze the sentiment of these product reviews and provide:
            1. Overall sentiment (positive/negative/neutral)
            2. Sentiment score (-1 to 1, where -1 is very negative and 1 is very positive)
            3. Brief summary of main points
            
            Reviews: {combined_text[:2000]}  # Limit text length
            
            Respond in JSON format:
            {{
                "sentiment": "positive/negative/neutral",
                "score": 0.0,
                "summary": "brief summary"
            }}
            """
            
            response = await openai.ChatCompletion.acreate(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=200,
                temperature=0.3
            )
            
            import json
            result = json.loads(response.choices[0].message.content.strip())
            return result
            
        except Exception as e:
            print(f"Failed to analyze sentiment: {str(e)}")
            return {"sentiment": "neutral", "score": 0.0, "summary": "Analysis unavailable"}
    
    async def generate_product_description(self, title: str, features: List[str]) -> str:
        """Generate product description using AI"""
        try:
            features_text = "\n".join([f"- {feature}" for feature in features])
            
            prompt = f"""
            Write a compelling product description for this AI/ML tool:
            
            Title: {title}
            Key Features:
            {features_text}
            
            The description should be:
            - Professional and technical
            - Highlight benefits and use cases
            - Around 150-200 words
            - Appeal to developers and data scientists
            """
            
            response = await openai.ChatCompletion.acreate(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=300,
                temperature=0.7
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            print(f"Failed to generate description: {str(e)}")
            return ""
    
    async def smart_search(self, query: str, products: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Enhance search results using AI"""
        try:
            if not products:
                return []
            
            # Create embeddings for query and products
            query_embedding = await self._get_text_embedding(query)
            
            scored_products = []
            for product in products:
                # Combine title, description, and tags for embedding
                product_text = f"{product['title']} {product['description']} {' '.join(product.get('tags', []))}"
                product_embedding = await self._get_text_embedding(product_text)
                
                # Calculate similarity
                similarity = self._cosine_similarity(query_embedding, product_embedding)
                
                product['relevance_score'] = similarity
                scored_products.append(product)
            
            # Sort by relevance score
            scored_products.sort(key=lambda x: x['relevance_score'], reverse=True)
            
            return scored_products
            
        except Exception as e:
            print(f"Smart search failed: {str(e)}")
            return products  # Return original products if AI search fails
    
    async def _get_text_embedding(self, text: str) -> np.ndarray: