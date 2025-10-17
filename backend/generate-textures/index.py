'''
Business: Generates Minecraft mod textures using DALL-E 3 and saves to database
Args: event - dict with httpMethod, body containing mod_id and texture requirements
      context - object with request_id attribute
Returns: HTTP response with generated texture URLs
'''

import json
import os
from typing import Dict, Any
import psycopg2
from openai import OpenAI
import base64
import requests

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    body_data = json.loads(event.get('body', '{}'))
    mod_id = body_data.get('mod_id', '')
    mod_description = body_data.get('description', '')
    
    if not mod_id or not mod_description:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'mod_id and description are required'}),
            'isBase64Encoded': False
        }
    
    client = OpenAI(api_key=os.environ.get('OPENAI_API_KEY'))
    
    texture_prompt = f"""Create a Minecraft-style 16x16 pixel texture for a mod item or block.
Style: Pixel art, Minecraft aesthetic, vibrant colors, simple geometric shapes.
Item description: {mod_description}

Requirements:
- 16x16 pixels resolution
- Pixel art style matching Minecraft
- Clear, recognizable icon
- No text or labels
- Suitable for game inventory icon"""

    response = client.images.generate(
        model="dall-e-3",
        prompt=texture_prompt,
        size="1024x1024",
        quality="standard",
        n=1,
    )
    
    image_url = response.data[0].url
    
    image_response = requests.get(image_url)
    image_base64 = base64.b64encode(image_response.content).decode('utf-8')
    
    textures_json = json.dumps({
        'main_texture': {
            'url': image_url,
            'data': image_base64,
            'prompt': texture_prompt
        }
    })
    
    conn = psycopg2.connect(os.environ.get('DATABASE_URL'))
    cur = conn.cursor()
    
    cur.execute(
        "UPDATE mods SET textures_data = %s, texture_prompts = %s WHERE id = %s",
        (textures_json, texture_prompt, mod_id)
    )
    
    conn.commit()
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({
            'mod_id': mod_id,
            'texture_url': image_url,
            'texture_data': image_base64,
            'message': 'Texture generated successfully'
        }),
        'isBase64Encoded': False
    }
