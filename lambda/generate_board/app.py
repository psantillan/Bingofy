# lambda/generate_board/app.py
import json
import random
import boto3
import os
from pathlib import Path

s3 = boto3.client('s3')
THEMES_BUCKET = os.environ['THEMES_BUCKET']

class BingoTheme:
    def __init__(self, theme_id):
        self.theme_id = theme_id
        self.data = self._load_theme_data()
        
    def _load_theme_data(self):
        try:
            response = s3.get_object(
                Bucket=THEMES_BUCKET,
                Key=f'themes/{self.theme_id}.json'
            )
            data = json.loads(response['Body'].read().decode('utf-8'))
            return self._validate_theme_data(data)
        except s3.exceptions.NoSuchKey:
            raise ValueError(f"Theme {self.theme_id} not found")
    
    def _validate_theme_data(self, data):
        required_fields = ['title', 'description', 'items', 'style', 'free_space']
        if not all(field in data for field in required_fields):
            raise ValueError(f"Theme {self.theme_id} is missing required fields")
        return data
    
    def generate_board(self):
        items = random.sample(self.data['items'], 25)
        items[12] = self.data['free_space']  # Center space
        return [items[i:i+5] for i in range(0, 25, 5)]

def lambda_handler(event, context):
    try:
        theme_id = event['pathParameters']['theme_id']
        theme = BingoTheme(theme_id)
        board = theme.generate_board()
        
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({
                'board': board,
                'theme': theme.data
            })
        }
    except ValueError as e:
        return {
            'statusCode': 404,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({
                'error': str(e)
            })
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({
                'error': 'Internal server error'
            })
        }