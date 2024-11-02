# app.py
from flask import Flask, render_template, jsonify, send_file, request, abort
import json
import os
from pathlib import Path
import random
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib.utils import simpleSplit
from io import BytesIO

app = Flask(__name__)
app.config['DEBUG'] = True

class BingoTheme:
    def __init__(self, theme_id):
        self.theme_id = theme_id
        self.data = self._load_theme_data()
        
    def _load_theme_data(self):
        theme_path = Path(f'bingo_items/{self.theme_id}.json')
        if not theme_path.exists():
            raise ValueError(f"Theme {self.theme_id} not found")
        
        with open(theme_path, 'r') as f:
            data = json.load(f)
            return self._validate_theme_data(data)
    
    def _validate_theme_data(self, data):
        required_fields = ['title', 'description', 'items', 'style', 'free_space']
        if not all(field in data for field in required_fields):
            raise ValueError(f"Theme {self.theme_id} is missing required fields")
        return data
    
    def generate_board(self):
        items = random.sample(self.data['items'], 25)
        items[12] = self.data['free_space']  # Center space
        return [items[i:i+5] for i in range(0, 25, 5)]

def get_available_themes():
    themes = []
    bingo_items_dir = Path('bingo_items')
    for theme_file in bingo_items_dir.glob('*.json'):
        theme_id = theme_file.stem
        try:
            theme = BingoTheme(theme_id)
            themes.append({
                'id': theme_id,
                'title': theme.data['title'],
                'description': theme.data['description']
            })
        except ValueError as e:
            print(f"Error loading theme {theme_id}: {e}")
    return themes

def get_font_size_that_fits(text, max_width, max_height, canvas_obj, start_size=12, min_size=6):
    """
    Find the largest font size that will allow the text to fit within given dimensions.
    """
    current_size = start_size
    
    while current_size >= min_size:
        canvas_obj.setFont("Helvetica-Bold", current_size)
        
        # Try to wrap text at this font size
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
        
        # Add the last line if there is one
        if current_line:
            wrapped_lines.append(' '.join(current_line))
        
        # Calculate total height needed
        total_height = len(wrapped_lines) * (current_size + 2)  # Add 2 points for line spacing
        
        # Check if text fits within height constraint
        if total_height <= max_height:
            return current_size, wrapped_lines
        
        # If we get here, text didn't fit - try smaller font
        current_size -= 1
    
    # If we get here, even smallest font didn't work - return minimum size and best attempt
    canvas_obj.setFont("Helvetica-Bold", min_size)
    wrapped_lines = simpleSplit(text, "Helvetica-Bold", min_size, max_width)
    return min_size, wrapped_lines

def create_printer_friendly_pdf(board_data, theme):
    """
    Create a printer-friendly PDF version of the bingo board.
    """
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter
    
    # Header
    c.setFont("Helvetica-Bold", 24)
    title = theme.data['title']
    title_width = c.stringWidth(title, "Helvetica-Bold", 24)
    c.drawString((width - title_width) / 2, height - 1 * inch, title)
    
    # Grid setup
    margin = 1 * inch
    grid_size = min(width - 2 * margin, height - 2 * inch)
    cell_size = grid_size / 5
    
    # Calculate starting position to center the grid
    start_x = (width - grid_size) / 2
    start_y = height - 1.5 * inch - grid_size
    
    # Draw cells
    for row in range(5):
        for col in range(5):
            x = start_x + col * cell_size
            y = start_y + (4 - row) * cell_size
            
            # Draw cell border
            c.rect(x, y, cell_size, cell_size)
            
            # Get cell content
            cell_content = board_data[row][col]
            
            # Calculate maximum text width and height for the cell
            max_text_width = cell_size - 10  # 5pt padding on each side
            max_text_height = cell_size - 10  # 5pt padding on top and bottom
            
            # Get optimal font size and wrapped lines
            font_size, lines = get_font_size_that_fits(
                cell_content, 
                max_text_width, 
                max_text_height,
                c,
                start_size=14,  # Start with slightly smaller font for better initial fit
                min_size=6
            )
            
            # Calculate total text height
            text_height = len(lines) * (font_size + 2)  # Include line spacing
            
            # Calculate starting y position to center text vertically
            text_y = y + (cell_size + text_height) / 2
            
            # Draw each line centered in the cell
            c.setFont("Helvetica-Bold", font_size)
            for line in lines:
                line_width = c.stringWidth(line, "Helvetica-Bold", font_size)
                text_x = x + (cell_size - line_width) / 2
                text_y -= (font_size + 2)  # Move up by font size plus spacing
                c.drawString(text_x, text_y, line)
    
    c.save()
    buffer.seek(0)
    return buffer

# Routes
@app.route('/')
def index():
    themes = get_available_themes()
    return render_template('index.html', themes=themes, debug=app.debug)

@app.route('/theme/<theme_id>')
def theme_page(theme_id):
    try:
        theme = BingoTheme(theme_id)
        return render_template(
            'index.html',
            theme=theme.data,
            theme_id=theme_id,
            debug=app.debug
        )
    except ValueError:
        abort(404)

@app.route('/generate/<theme_id>')
def generate(theme_id):
    try:
        theme = BingoTheme(theme_id)
        board = theme.generate_board()
        return jsonify({
            'board': board,
            'theme': theme.data
        })
    except ValueError:
        abort(404)
    except Exception as e:
        return jsonify({
            'error': str(e)
        }), 500

@app.route('/download-pdf/<theme_id>', methods=['POST'])
def download_pdf(theme_id):
    try:
        theme = BingoTheme(theme_id)
        board_data = request.json.get('board')
        
        if not board_data:
            board_data = theme.generate_board()
        
        pdf_buffer = create_printer_friendly_pdf(board_data, theme)
        
        return send_file(
            pdf_buffer,
            as_attachment=True,
            download_name=f'{theme_id}_bingo.pdf',
            mimetype='application/pdf'
        )
    except ValueError:
        abort(404)
    except Exception as e:
        return jsonify({
            'error': str(e)
        }), 500

@app.errorhandler(404)
def not_found_error(error):
    return jsonify({
        'error': 'Resource not found'
    }), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        'error': 'Internal server error'
    }), 500

# Development server configuration
if __name__ == '__main__':
    # Ensure the required directories exist
    Path('bingo_items').mkdir(exist_ok=True)
    
    # Print available themes on startup
    print("\nAvailable themes:")
    for theme in get_available_themes():
        print(f"- {theme['id']}: {theme['title']}")
    print("\nServer starting...")
    
    # Start development server
    app.run(debug=True, port=5005)