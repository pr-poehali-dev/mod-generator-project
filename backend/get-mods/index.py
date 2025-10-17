'''
Business: Retrieves list of generated mods from database
Args: event - dict with httpMethod
      context - object with request_id attribute
Returns: HTTP response with array of mods
'''

import json
import os
from typing import Dict, Any
from datetime import datetime
import psycopg2
from psycopg2.extras import RealDictCursor

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    if method != 'GET':
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    conn = psycopg2.connect(os.environ.get('DATABASE_URL'))
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    cur.execute("""
        SELECT id, name, description, version, minecraft_version, status, file_url, created_at
        FROM mods
        ORDER BY created_at DESC
        LIMIT 50
    """)
    
    mods = cur.fetchall()
    
    cur.close()
    conn.close()
    
    mods_list = []
    for mod in mods:
        mods_list.append({
            'id': mod['id'],
            'name': mod['name'],
            'description': mod['description'],
            'version': mod['version'],
            'minecraftVersion': mod['minecraft_version'],
            'status': mod['status'],
            'fileUrl': mod['file_url'],
            'timestamp': mod['created_at'].isoformat() if mod['created_at'] else None
        })
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'mods': mods_list}),
        'isBase64Encoded': False
    }
