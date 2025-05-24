// Performance optimization: Cache DOM elements and reuse them
const DOM = {
    grid: null,
    score: null,
    bestScore: null,
    gameOverlay: null,
    gameMessage: null
};

// Performance optimization: Pre-define directions
const DIRECTIONS = {
    ArrowUp: 'up',
    ArrowDown: 'down',
    ArrowLeft: 'left',
    ArrowRight: 'right',
    w: 'up',
    s: 'down',
    a: 'left',
    d: 'right'
};

// Performance optimization: Request Animation Frame
const requestAnimFrame = window.requestAnimationFrame || 
                        window.mozRequestAnimationFrame ||
                        window.webkitRequestAnimationFrame ||
                        window.msRequestAnimationFrame ||
                        (fn => setTimeout(fn, 1000/60));

class Game2048 {
    constructor() {
        try {
            // Initialize game state
            this.gridSize = 4;
            this.tiles = [];
            this.score = 0;
            this.bestScore = 0;
            this.gameOver = false;
            this.animating = false;
            this.moveInProgress = false;
            
            // Load saved state if available
            this.loadState();
            
            // Initialize the game
            this.initializeGame();
        } catch (error) {
            console.error('Error initializing game:', error);
            this.showError('Failed to initialize the game. Please refresh the page.');
        }
    }

    initializeGame() {
        try {
            // Initialize grid with optimized array creation
            this.grid = new Array(this.gridSize);
            for (let i = 0; i < this.gridSize; i++) {
                this.grid[i] = new Array(this.gridSize).fill(0);
            }
            
            // Cache DOM elements
            this.cacheDOM();
            
            // Initialize UI
            this.updateUI();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Add initial tiles
            this.addRandomTile();
            this.addRandomTile();
            
            // Save initial state
            this.saveState();
            
            // Check for updates in the background
            this.checkForUpdates();
        } catch (error) {
            console.error('Error in game initialization:', error);
            this.showError('Failed to start the game. Please try again.');
        }
    }
    
    cacheDOM() {
        // Cache frequently used DOM elements
        DOM.grid = document.querySelector('.grid-container');
        DOM.score = document.getElementById('score');
        DOM.bestScore = document.getElementById('best-score');
        DOM.gameOverlay = document.querySelector('.game-overlay');
        DOM.gameMessage = document.querySelector('.game-message');
    }
    
    loadState() {
        try {
            const savedState = localStorage.getItem('game2048_state');
            if (savedState) {
                const { grid, score, bestScore } = JSON.parse(savedState);
                this.grid = grid;
                this.score = score;
                this.bestScore = bestScore;
            }
        } catch (e) {
            console.warn('Failed to load game state:', e);
            // Clear corrupted state
            localStorage.removeItem('game2048_state');
        }
    }
    
    saveState() {
        try {
            const gameState = {
                grid: this.grid,
                score: this.score,
                bestScore: this.bestScore,
                timestamp: Date.now()
            };
            localStorage.setItem('game2048_state', JSON.stringify(gameState));
            localStorage.setItem('bestScore', this.bestScore);
        } catch (e) {
            console.warn('Failed to save game state:', e);
        }
    }
    
    clearState() {
        localStorage.removeItem('game2048_state');
    }
    
    checkForUpdates() {
        // Check for service worker updates in the background
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistration()
                .then(reg => {
                    if (reg) {
                        reg.update().catch(console.warn);
                    }
                })
                .catch(console.warn);
        }
    }

    setupEventListeners() {
        // Keyboard controls
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
        
        // Restart button
        document.querySelector('.restart-button').addEventListener('click', () => this.restartGame());
        
        // Touch controls
        this.setupTouchControls();
        
        // Swipe controls
        this.setupSwipeControls();
    }
    
    setupTouchControls() {
        const upBtn = document.getElementById('up');
        const downBtn = document.getElementById('down');
        const leftBtn = document.getElementById('left');
        const rightBtn = document.getElementById('right');
        
        const handleTouch = (direction) => {
            if (this.gameOver) return;
            this[`move${direction.charAt(0).toUpperCase() + direction.slice(1)}`]();
        };
        
        upBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            handleTouch('up');
        });
        downBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            handleTouch('down');
        });
        leftBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            handleTouch('left');
        });
        rightBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            handleTouch('right');
        });
    }
    
    setupSwipeControls() {
        const gameArea = document.querySelector('.grid-wrapper');
        let touchStartX = 0;
        let touchStartY = 0;
        let touchEndX = 0;
        let touchEndY = 0;
        
        const handleSwipe = () => {
            const dx = touchEndX - touchStartX;
            const dy = touchEndY - touchStartY;
            const absDx = Math.abs(dx);
            const absDy = Math.abs(dy);
            
            if (Math.max(absDx, absDy) < 30) return; // Minimum swipe distance
            
            if (this.gameOver) return;
            
            if (absDx > absDy) {
                // Horizontal swipe
                if (dx > 0) this.moveRight();
                else this.moveLeft();
            } else {
                // Vertical swipe
                if (dy > 0) this.moveDown();
                else this.moveUp();
            }
        };
        
        gameArea.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        }, { passive: true });
        
        gameArea.addEventListener('touchmove', (e) => {
            e.preventDefault(); // Prevent scrolling
        }, { passive: false });
        
        gameArea.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].clientX;
            touchEndY = e.changedTouches[0].clientY;
            handleSwipe();
        }, { passive: true });
    }

    handleKeyPress(e) {
        // Prevent default for arrow keys to avoid page scrolling
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', 'W', 'A', 'S', 'D'].includes(e.key)) {
            e.preventDefault();
        }
        
        if (this.gameOver || this.moveInProgress) return;
        
        const direction = DIRECTIONS[e.key];
        if (direction) {
            this.moveInProgress = true;
            
            // Use requestAnimationFrame for smoother animations
            requestAnimFrame(() => {
                this[`move${direction.charAt(0).toUpperCase() + direction.slice(1)}`]();
                this.moveInProgress = false;
            });
        }
    }

    moveUp() {
        this.moveDirection('up');
    }

    moveDown() {
        this.moveDirection('down');
    }

    moveLeft() {
        this.moveDirection('left');
    }

    moveRight() {
        this.moveDirection('right');
    }

    moveDirection(direction) {
        let moved = false;
        let newGrid = JSON.parse(JSON.stringify(this.grid));

        for (let i = 0; i < this.gridSize; i++) {
            let row = [];
            let newRow = [];

            // Get row/column based on direction
            for (let j = 0; j < this.gridSize; j++) {
                if (direction === 'up' || direction === 'down') {
                    row.push(this.grid[direction === 'down' ? this.gridSize - 1 - j : j][i]);
                } else {
                    row.push(this.grid[i][direction === 'right' ? this.gridSize - 1 - j : j]);
                }
            }

            // Process row
            for (let j = 0; j < row.length; j++) {
                if (row[j] === 0) continue;
                
                let pos = newRow.length;
                
                // Merge with previous tile if possible
                if (pos > 0 && newRow[pos - 1] === row[j]) {
                    newRow[pos - 1] *= 2;
                    this.score += newRow[pos - 1];
                    this.updateBestScore();
                } else {
                    newRow.push(row[j]);
                }
            }

            // Fill remaining spaces with zeros
            while (newRow.length < this.gridSize) {
                newRow.push(0);
            }

            // Update grid
            for (let j = 0; j < this.gridSize; j++) {
                if (direction === 'up' || direction === 'down') {
                    newGrid[direction === 'down' ? this.gridSize - 1 - j : j][i] = newRow[j];
                } else {
                    newGrid[i][direction === 'right' ? this.gridSize - 1 - j : j] = newRow[j];
                }
            }
        }

        // Check if grid changed
        for (let i = 0; i < this.gridSize; i++) {
            for (let j = 0; j < this.gridSize; j++) {
                if (this.grid[i][j] !== newGrid[i][j]) {
                    moved = true;
                    break;
                }
            }
            if (moved) break;
        }

        if (moved) {
            this.grid = newGrid;
            this.addRandomTile();
            this.updateUI();
            this.checkGameOver();
        }
    }

    addRandomTile() {
        let emptyCells = [];
        for (let i = 0; i < this.gridSize; i++) {
            for (let j = 0; j < this.gridSize; j++) {
                if (this.grid[i][j] === 0) {
                    emptyCells.push({ x: i, y: j });
                }
            }
        }

        if (emptyCells.length > 0) {
            let randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            this.grid[randomCell.x][randomCell.y] = Math.random() < 0.9 ? 2 : 4;
        }
    }

    updateUI() {
        // Create a map of new positions
        const newPositions = new Map();
        const tiles = Array.from(document.querySelectorAll('.tile'));
        
        // Update score display
        document.getElementById('score').textContent = this.score;
        document.getElementById('best').textContent = this.bestScore;
        
        // Animate existing tiles to new positions
        for (let i = 0; i < this.gridSize; i++) {
            for (let j = 0; j < this.gridSize; j++) {
                const value = this.grid[i][j];
                if (value !== 0) {
                    const existingTile = tiles.find(tile => 
                        parseInt(tile.style.top) === i * 100 && 
                        parseInt(tile.style.left) === j * 100
                    );
                    
                    if (existingTile) {
                        // Update existing tile position
                        this.animateTileTo(existingTile, i, j);
                    } else {
                        // Add new tile
                        this.addTile(i, j, value);
                    }
                }
            }
        }
        
        // Remove any tiles that don't exist in the new grid
        tiles.forEach(tile => {
            if (!tile.isConnected) return;
            const row = Math.round((parseInt(tile.style.top) - 15) / 100 * 4);
            const col = Math.round((parseInt(tile.style.left) - 15) / 100 * 4);
            if (this.grid[row]?.[col] !== parseInt(tile.textContent)) {
                tile.remove();
            }
        });
    }
    
    animateTileTo(tile, row, col) {
        const grid = document.querySelector('.grid-container');
        const gridRect = grid.getBoundingClientRect();
        const gridSize = Math.min(
            Math.floor(gridRect.width * window.devicePixelRatio) / window.devicePixelRatio,
            Math.floor(gridRect.height * window.devicePixelRatio) / window.devicePixelRatio
        );
        const cellSize = Math.floor((gridSize / 4) * 2) / 2; // Round to nearest 0.5px
        const padding = 8; // Fixed pixel padding for consistency
        
        // Calculate position with pixel-perfect alignment
        const newX = Math.round((col * cellSize) + padding);
        const newY = Math.round((row * cellSize) + padding);
        
        // Only animate if position changed significantly
        if (Math.abs(parseInt(tile.style.left) - newX) > 1 || 
            Math.abs(parseInt(tile.style.top) - newY) > 1) {
            
            // Disable transition for instant position update if not moving
            tile.style.transition = 'none';
            
            // Force reflow
            tile.offsetHeight;
            
            // Enable transition for smooth animation
            tile.style.transition = 'all 100ms ease-out';
            
            // Update position
            tile.style.left = `${newX}px`;
            tile.style.top = `${newY}px`;
            
            // Handle merge animation
            const currentValue = parseInt(tile.textContent);
            if (currentValue < this.grid[row][col]) {
                const newValue = this.grid[row][col];
                tile.textContent = newValue;
                tile.className = `tile tile-${newValue}`;
                
                // Adjust font size for larger numbers
                let fontSize;
                if (newValue > 1000) {
                    fontSize = Math.min(30, parseInt(tile.style.width) * 0.3);
                } else if (newValue > 100) {
                    fontSize = Math.min(40, parseInt(tile.style.width) * 0.35);
                } else {
                    fontSize = Math.min(50, parseInt(tile.style.width) * 0.4);
                }
                
                // Ensure minimum font size for readability
                const minFontSize = 12;
                tile.style.fontSize = `${Math.max(fontSize, minFontSize)}px`;
                
                // Bounce effect on merge
                tile.style.transform = 'scale(1.1)';
                setTimeout(() => {
                    tile.style.transform = 'scale(1)';
                }, 100);
            }
        }
    }

    addTile(row, col, value) {
        const tile = document.createElement('div');
        tile.className = `tile tile-${value}`;
        tile.textContent = value;
        
        // Get grid and cell dimensions with precise pixel values
        const grid = document.querySelector('.grid-container');
        const gridRect = grid.getBoundingClientRect();
        const gridSize = Math.min(gridRect.width, gridRect.height);
        const cellSize = Math.floor(gridSize / 4 * 2) / 2; // Round to nearest 0.5px
        const padding = 8; // Fixed pixel padding for consistency
        const tileSize = Math.max(1, Math.floor(cellSize - (padding * 2)));
        
        // Calculate position with pixel-perfect alignment
        const posX = Math.round((col * cellSize) + padding);
        const posY = Math.round((row * cellSize) + padding);
        
        // Ensure integer pixel values for crisp rendering
        requestAnimationFrame(() => {
            const style = window.getComputedStyle(tile);
            if (style.transform !== 'none') {
                tile.style.transform = 'none';
            }
        });
        
        // Set tile size and position
        tile.style.width = `${tileSize}px`;
        tile.style.height = `${tileSize}px`;
        
        // Adjust font size based on tile value and available space
        let fontSize;
        if (value > 1000) {
            fontSize = Math.min(30, tileSize * 0.3);
        } else if (value > 100) {
            fontSize = Math.min(40, tileSize * 0.35);
        } else {
            fontSize = Math.min(50, tileSize * 0.4);
        }
        
        // Ensure minimum font size for readability
        const minFontSize = 12;
        tile.style.fontSize = `${Math.max(fontSize, minFontSize)}px`;
        
        // Position absolutely within the grid
        tile.style.position = 'absolute';
        tile.style.top = `${posY}px`;
        tile.style.left = `${posX}px`;
        
        // Initial state for animation
        tile.style.transform = 'scale(0.5)';
        tile.style.opacity = '0';
        
        // Add to DOM
        grid.appendChild(tile);
        
        // Animate in
        requestAnimationFrame(() => {
            tile.style.transition = 'all 100ms ease-out';
            tile.style.transform = 'scale(1)';
            tile.style.opacity = '1';
        });
        
        return tile;
    }

    updateBestScore() {
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            localStorage.setItem('bestScore', this.bestScore);
        }
    }

    checkGameOver() {
        if (this.isGameOver()) {
            this.gameOver = true;
            const message = document.querySelector('.game-message');
            message.querySelector('p').textContent = 'Game Over!';
            message.style.display = 'block';
        }
    }

    isGameOver() {
        // Check if grid is full
        for (let i = 0; i < this.gridSize; i++) {
            for (let j = 0; j < this.gridSize; j++) {
                if (this.grid[i][j] === 0) return false;
            }
        }

        // Check if any adjacent cells can be merged
        for (let i = 0; i < this.gridSize; i++) {
            for (let j = 0; j < this.gridSize - 1; j++) {
                if (this.grid[i][j] === this.grid[i][j + 1]) return false;
            }
        }

        for (let j = 0; j < this.gridSize; j++) {
            for (let i = 0; i < this.gridSize - 1; i++) {
                if (this.grid[i][j] === this.grid[i + 1][j]) return false;
            }
        }

        return true;
    }

    restartGame() {
        this.gameOver = false;
        this.score = 0;
        this.initializeGame();
        document.querySelector('.game-message').style.display = 'none';
    }
}

// Start the game
const game = new Game2048();
