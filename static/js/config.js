// static/js/config.js
const API_CONFIG = {
    // Check if we're in development (you can set this in your HTML template)
    baseUrl: window.IS_DEVELOPMENT ? '' : '/api',
    endpoints: {
        generate: (themeId) => `/generate/${themeId}`,
        downloadPdf: (themeId) => `/download-pdf/${themeId}`
    }
};
// static/js/board.js
async function generateBoard() {
    logDebug('Generating new board', { themeId: window.THEME_ID });
    
    try {
        const response = await fetch(
            `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.generate(window.THEME_ID)}`,
            {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            }
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const board = document.getElementById('board');
        board.innerHTML = '';
        
        data.board.forEach((row, rowIndex) => {
            row.forEach((item, colIndex) => {
                const cell = createCell(item, rowIndex, colIndex);
                board.appendChild(cell);
            });
        });
        
        // Update theme data if it changed
        if (data.theme) {
            window.THEME_DATA = data.theme;
            initializeThemeEffects();
        }
        
        logDebug('Board generated', data);
    } catch (error) {
        logError('Board generation failed', error);
        showError('Failed to generate board. Please try again.');
    }
}

async function downloadPDF() {
    try {
        // Get the current board state
        const cells = Array.from(document.querySelectorAll('.bingo-cell'));
        const board = [];
        let currentRow = [];
        
        cells.forEach((cell, index) => {
            const text = cell.querySelector('.bingo-text').textContent;
            currentRow.push(text);
            
            if (currentRow.length === 5) {
                board.push(currentRow);
                currentRow = [];
            }
        });

        // Show loading state
        const downloadButton = document.querySelector('[onclick="downloadPDF()"]');
        const originalText = downloadButton.innerHTML;
        downloadButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating PDF...';
        downloadButton.disabled = true;

        // Make the request to generate PDF
        const response = await fetch(
            `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.downloadPdf(window.THEME_ID)}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ board: board })
            }
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Convert the base64 response to a blob
        const data = await response.json();
        const pdfContent = atob(data.body);
        const pdfBlob = new Blob(
            [new Uint8Array(pdfContent.split('').map(char => char.charCodeAt(0)))],
            { type: 'application/pdf' }
        );
        
        // Create and trigger download
        const url = window.URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${window.THEME_ID}_bingo.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        logDebug('PDF downloaded successfully', { themeId: window.THEME_ID });
    } catch (error) {
        logError('PDF download failed', error);
        showError('Failed to download PDF. Please try again.');
    } finally {
        // Restore button state
        const downloadButton = document.querySelector('[onclick="downloadPDF()"]');
        downloadButton.innerHTML = '<i class="fas fa-download"></i> Download PDF';
        downloadButton.disabled = false;
    }
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-notification';
    errorDiv.innerHTML = `
        <div class="error-content">
            <i class="fas fa-exclamation-circle"></i>
            <span>${message}</span>
            <button onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    document.body.appendChild(errorDiv);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (errorDiv.parentElement) {
            errorDiv.remove();
        }
    }, 5000);
}

function initializeThemeEffects() {
    if (window.THEME_DATA?.style?.special_effects) {
        initializeSpecialEffects(window.THEME_DATA.style.special_effects);
    }
}

// Initialize when the page loads
window.addEventListener('load', () => {
    logDebug('Page loaded', { 
        themeId: window.THEME_ID,
        themeData: window.THEME_DATA
    });
    
    generateBoard();
    initializeThemeEffects();
});