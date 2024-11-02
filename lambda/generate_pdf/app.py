# lambda/generate_pdf/app.py
import json
import boto3
import os
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from io import BytesIO
import base64

s3 = boto3.client('s3')
THEMES_BUCKET = os.environ['THEMES_BUCKET']

def get_font_size_that_fits(text, max_width, max_height, canvas_obj, start_size=12, min_size=6):
    current_size = start_size
    
    while current_size >= min_size:
        canvas_obj.setFont("Helvetica-Bold", current_size)
        wrapped_lines = []
        words = text.split()
        current_line = []
        
        for word in words:
            test_line = ' '.join(current_line + [word])
            width = canvas_obj.stringWidth(test_line, "Helvetica-Bold", current_size)
            
            if width <= max_width:
                current_line.append(word)
            else:
                if current_line:
                    wrapped_lines.append(' '.join(current_line))
                current_line = [word]
        
        if current_line:
            wrapped_lines.append(' '.join(current_line))
        
        total_height = len(wrapped_lines) * (current_size + 2)
        
        if total_height <= max_height:
            return current_size, wrapped_lines
        
        current_size -= 1
    
    canvas_obj.setFont("Helvetica-Bold", min_size)
    return min_size, [text]

def create_printer_friendly_pdf(board_data, theme_data):
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter
    
    # Header
    c.setFont("Helvetica-Bold", 24)
    title = theme_data['title']
    title_width = c.stringWidth(title, "Helvetica-Bold", 24)
    c.drawString((width - title_width) / 2, height - 1 * inch, title)
    
    # Grid setup
    margin = 1 * inch
    grid_size = min(width - 2 * margin, height - 2 * inch)
    cell_size = grid_size / 5
    
    start_x = (width - grid_size) / 2
    start_y = height - 1.5 * inch - grid_size
    
    for row in range(5):
        for col in range(5):
            x = start_x + col * cell_size
            y = start_y + (4 - row) * cell_size
            
            c.rect(x, y, cell_size, cell_size)
            cell_content = board_data[row][col]
            
            max_text_width = cell_size - 10
            max_text_height = cell_size - 10
            
            font_size, lines = get_font_size_that_fits(
                cell_content, 
                max_text_width,
                max_text_height,
                c
            )
            
            text_height = len(lines) * (font_size + 2)
            text_y = y + (cell_size + text_height) / 2
            
            c.setFont("Helvetica-Bold", font_size)
            for line in lines:
                line_width = c.stringWidth(line, "Helvetica-Bold", font_size)
                text_x = x + (cell_size - line_width) / 2
                text_y -= (font_size + 2)
                c.drawString(text_x, text_y, line)
    
    c.save()
    buffer.seek(0)
    return buffer

def lambda_handler(event, context):
    try:
        theme_id = event['pathParameters']['theme_id']
        body = json.loads(event['body'])
        board_data = body.get('board')
        
        # Get theme data from S3
        response = s3.get_object(
            Bucket=THEMES_BUCKET,
            Key=f'themes/{theme_id}.json'
        )
        theme_data = json.loads(response['Body'].read().decode('utf-8'))
        
        if not board_data:
            # Generate new board if none provided
            items = random.sample(theme_data['items'], 25)
            items[12] = theme_data['free_space']
            board_data = [items[i:i+5] for i in range(0, 25, 5)]
        
        pdf_buffer = create_printer_friendly_pdf(board_data, theme_data)
        pdf_content = base64.b64encode(pdf_buffer.getvalue()).decode('utf-8')
        
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/pdf',
                'Content-Disposition': f'attachment; filename="{theme_id}_bingo.pdf"'
            },
            'body': pdf_content,
            'isBase64Encoded': True
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({
                'error': str(e)
            })
        }