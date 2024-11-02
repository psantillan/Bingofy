// static/js/board.js

// Win patterns to check
const WIN_PATTERNS = {
    horizontal: [[0,1,2,3,4], [5,6,7,8,9], [10,11,12,13,14], [15,16,17,18,19], [20,21,22,23,24]],
    vertical: [[0,5,10,15,20], [1,6,11,16,21], [2,7,12,17,22], [3,8,13,18,23], [4,9,14,19,24]],
    diagonal: [[0,6,12,18,24], [4,8,12,16,20]]
};

// Theme-specific celebration configurations
const THEME_CELEBRATIONS = {
    christmas: {
        colors: ['#dc2626', '#165B33', '#146B3A', '#EA4630', '#F8B229', '#FFFFFF'],
        emojis: ['🎄', '⭐', '🎅', '❄️', '🎁'],
        particleCount: 150,
        spreadRadius: 65,
        ticks: 300,
        gravity: 1.2,
        decay: 0.94,
        startVelocity: 30,
        shapes: ['circle', 'square', 'star'],
    },
    // Add other themes here as needed
    default: {
        colors: ['#FFD700', '#DC2626', '#1A365D', '#FFFFFF'],
        emojis: ['🎉', '🎊', '✨'],
        particleCount: 100,
        spreadRadius: 60,
        ticks: 200,
        gravity: 1,
        decay: 0.94,
        startVelocity: 30,
        shapes: ['circle', 'square'],
    }
};

function createCell(content, row, col) {
    const cell = document.createElement('div');
    cell.className = 'bingo-cell clay';
    cell.dataset.row = row;
    cell.dataset.col = col;
    cell.dataset.index = row * 5 + col;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'bingo-content';
    
    const text = document.createElement('div');
    text.className = 'bingo-text';
    text.textContent = content;
    
    contentDiv.appendChild(text);
    cell.appendChild(contentDiv);
    
    cell.addEventListener('click', () => {
        cell.classList.toggle('marked');
        checkForWin();
    });
    
    return cell;
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

        // Make the request to generate PDF
        const response = await fetch(`/download-pdf/${window.THEME_ID}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ board: board })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Create a blob from the PDF stream
        const blob = await response.blob();
        
        // Create a link to download the PDF
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${window.THEME_ID}_bingo.pdf`;
        
        // Append to body, click programmatically, and cleanup
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        logDebug('PDF downloaded successfully', { themeId: window.THEME_ID });
    } catch (error) {
        logError('PDF download failed', error);
        alert('Failed to download PDF. Please try again.');
    }
}

function checkForWin() {
    const cells = Array.from(document.querySelectorAll('.bingo-cell'));
    const markedIndices = cells
        .map((cell, index) => cell.classList.contains('marked') ? index : -1)
        .filter(index => index !== -1);

    let winningPattern = null;
    let patternType = null;

    for (const [type, patterns] of Object.entries(WIN_PATTERNS)) {
        for (const pattern of patterns) {
            if (pattern.every(index => markedIndices.includes(index))) {
                winningPattern = pattern;
                patternType = type;
                break;
            }
        }
        if (winningPattern) break;
    }

    if (winningPattern) {
        showWinConfirmation(winningPattern, patternType);
    }
}

function showWinConfirmation(pattern, type) {
    // Remove existing modal if present
    closeWinModal();
    
    const modal = document.createElement('div');
    modal.className = 'win-confirmation-modal';
    
    const content = document.createElement('div');
    content.className = 'win-confirmation-content clay';
    
    content.innerHTML = `
        <h2>BINGO!</h2>
        <p>You've got a ${type} bingo! Want to celebrate?</p>
        <div class="win-confirmation-buttons">
            <button class="action-button clay" onclick="celebrateWin('${pattern.join(',')}', '${type}')">
                <i class="fas fa-check"></i> Yes, Celebrate!
            </button>
            <button class="action-button clay" onclick="closeWinModal()">
                <i class="fas fa-times"></i> Keep Playing
            </button>
        </div>
    `;
    
    modal.appendChild(content);
    document.body.appendChild(modal);
}

function closeWinModal() {
    const modal = document.querySelector('.win-confirmation-modal');
    if (modal) {
        modal.remove();
    }
}

function createParticle(themeConfig) {
    // Randomly choose between emoji and regular confetti
    if (Math.random() < 0.3 && themeConfig.emojis.length > 0) {
        return {
            emoji: themeConfig.emojis[Math.floor(Math.random() * themeConfig.emojis.length)]
        };
    }
    
    return {
        color: themeConfig.colors[Math.floor(Math.random() * themeConfig.colors.length)],
        shape: themeConfig.shapes[Math.floor(Math.random() * themeConfig.shapes.length)]
    };
}

function celebrateWin(patternIndices, type) {
    closeWinModal();
    
    // Highlight winning cells
    const indices = patternIndices.split(',').map(Number);
    const cells = document.querySelectorAll('.bingo-cell');
    indices.forEach(index => {
        cells[index].classList.add('winning-cell');
    });

    // Get theme-specific celebration config
    const themeConfig = THEME_CELEBRATIONS[window.THEME_ID] || THEME_CELEBRATIONS.default;
    
    // Create confetti canvas
    const canvas = document.createElement('canvas');
    canvas.className = 'confetti-canvas';
    document.body.appendChild(canvas);

    const myConfetti = confetti.create(canvas, {
        resize: true,
        useWorker: true
    });

    // Initial burst
    myConfetti({
        ...themeConfig,
        particleCount: themeConfig.particleCount,
        spread: themeConfig.spreadRadius,
        origin: { x: 0.5, y: 0.6 }
    });

    // Sustained celebration
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    let skew = 1;

    function frame() {
        const timeLeft = animationEnd - Date.now();
        const ticks = Math.max(200, 500 * (timeLeft / duration));
        skew = Math.max(0.8, skew - 0.001);

        const particle = createParticle(themeConfig);
        
        myConfetti({
            particleCount: 1,
            startVelocity: themeConfig.startVelocity * Math.random(),
            ticks: ticks,
            origin: {
                x: Math.random(),
                y: (Math.random() * skew) - 0.2
            },
            colors: particle.color ? [particle.color] : undefined,
            shapes: particle.shape ? [particle.shape] : undefined,
            emoji: particle.emoji ? [particle.emoji] : undefined,
            gravity: themeConfig.gravity,
            scalar: particle.emoji ? 2 : 1,
            drift: 0,
            decay: themeConfig.decay
        });

        if (timeLeft > 0) {
            requestAnimationFrame(frame);
        } else {
            canvas.remove();
            // Remove winning highlight after celebration
            setTimeout(() => {
                indices.forEach(index => {
                    cells[index].classList.remove('winning-cell');
                });
            }, 1000);
        }
    }

    frame();
}

function generateBoard() {
    logDebug('Generating new board', { themeId: window.THEME_ID });
    
    fetch(`/generate/${window.THEME_ID}`)
        .then(response => response.json())
        .then(data => {
            const board = document.getElementById('board');
            board.innerHTML = '';
            
            data.board.forEach((row, rowIndex) => {
                row.forEach((item, colIndex) => {
                    const cell = createCell(item, rowIndex, colIndex);
                    board.appendChild(cell);
                });
            });
            
            logDebug('Board generated', data);
        })
        .catch(error => logError('Board generation', error));
}

// Initialize when the page loads
window.addEventListener('load', () => {
    logDebug('Page loaded', { 
        themeId: window.THEME_ID,
        themeData: window.THEME_DATA
    });
    
    generateBoard();
    
    if (window.THEME_DATA?.style?.special_effects) {
        initializeSpecialEffects(window.THEME_DATA.style.special_effects);
    }
});