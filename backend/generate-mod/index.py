'''
Business: Generates Minecraft mod code using OpenAI GPT-4 and saves to database
Args: event - dict with httpMethod, body containing prompt and minecraft_version
      context - object with request_id attribute
Returns: HTTP response with generated mod data
'''

import json
import os
from typing import Dict, Any
from datetime import datetime
import psycopg2
from openai import OpenAI

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
    prompt = body_data.get('prompt', '')
    minecraft_version = body_data.get('minecraft_version', '1.20.1')
    mod_name = body_data.get('mod_name', 'custom_mod')
    
    if not prompt:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Prompt is required'}),
            'isBase64Encoded': False
        }
    
    client = OpenAI(api_key=os.environ.get('OPENAI_API_KEY'))
    
    system_prompt = f"""You are an expert Minecraft mod developer. Generate complete, production-ready Forge mod code for Minecraft {minecraft_version}.

CRITICAL RULES:
1. Generate ONLY the main mod class in Java
2. Use proper Forge modding structure with @Mod annotation
3. Include proper imports and package declaration
4. Make the code compilable and functional
5. Add detailed comments explaining the code
6. Use proper Minecraft/Forge APIs for the requested version
7. Include texture references and resource locations for custom items/blocks

Package should be: com.generated.{mod_name.lower().replace(' ', '_').replace('-', '_')}
Main class should be: {mod_name.replace(' ', '').replace('-', '')}Mod

Generate fully working code that can be compiled into a JAR file.
Make sure to reference textures in assets folder following Minecraft conventions."""

    response = client.chat.completions.create(
        model='gpt-4',
        messages=[
            {'role': 'system', 'content': system_prompt},
            {'role': 'user', 'content': f"Create a Minecraft mod with the following features:\n{prompt}"}
        ],
        temperature=0.7,
        max_tokens=3000
    )
    
    generated_code = response.choices[0].message.content
    
    mod_id = f"mod_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{context.request_id[:8]}"
    
    conn = psycopg2.connect(os.environ.get('DATABASE_URL'))
    cur = conn.cursor()
    
    cur.execute(
        """INSERT INTO mods (id, name, description, prompt, minecraft_version, status, generated_code, created_at)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
        (mod_id, mod_name, prompt, prompt, minecraft_version, 'code_generated', generated_code, datetime.now())
    )
    
    conn.commit()
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({
            'mod_id': mod_id,
            'name': mod_name,
            'status': 'code_generated',
            'code': generated_code,
            'minecraft_version': minecraft_version
        }),
        'isBase64Encoded': False
    }