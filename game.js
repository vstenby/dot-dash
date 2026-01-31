// Wait for DOM to load
document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const statusElement = document.getElementById('status');
    const scoreElement = document.getElementById('score');
    const timeElement = document.getElementById('time');

    // Keyboard state tracking
    const keyboardState = {
        // Player 1 (WASD + Left Shift)
        w: false,
        a: false,
        s: false,
        d: false,
        shiftLeft: false,
        // Player 2 (Arrows + Right Shift)
        arrowUp: false,
        arrowLeft: false,
        arrowDown: false,
        arrowRight: false,
        shiftRight: false,
        // Shared controls
        escape: false,
        enter: false,
        space: false
    };

    // Input configuration for each player
    const inputConfig = {
        player1: 'none',  // 'none', 'keyboard', 'gamepad'
        player2: 'none',
        menuActive: true,  // Start with menu active
        selectionPhase: 0  // 0 = waiting for P1, 1 = waiting for P2, 2 = ready
    };

    // Keyboard event listeners
    document.addEventListener('keydown', (e) => {
        updateKeyState(e.code, true);
        handleMenuInput(e.code);
    });

    document.addEventListener('keyup', (e) => {
        updateKeyState(e.code, false);
    });

    function updateKeyState(code, pressed) {
        switch(code) {
            case 'KeyW': keyboardState.w = pressed; break;
            case 'KeyA': keyboardState.a = pressed; break;
            case 'KeyS': keyboardState.s = pressed; break;
            case 'KeyD': keyboardState.d = pressed; break;
            case 'ShiftLeft': keyboardState.shiftLeft = pressed; break;
            case 'ArrowUp': keyboardState.arrowUp = pressed; break;
            case 'ArrowLeft': keyboardState.arrowLeft = pressed; break;
            case 'ArrowDown': keyboardState.arrowDown = pressed; break;
            case 'ArrowRight': keyboardState.arrowRight = pressed; break;
            case 'ShiftRight': keyboardState.shiftRight = pressed; break;
            case 'Escape': keyboardState.escape = pressed; break;
            case 'Enter': keyboardState.enter = pressed; break;
            case 'Space': keyboardState.space = pressed; break;
        }
    }

    function handleMenuInput(code) {
        if (!inputConfig.menuActive) return;

        // Player 1 selection (phase 0)
        if (inputConfig.selectionPhase === 0) {
            if (code === 'KeyW' || code === 'KeyA' || code === 'KeyS' || code === 'KeyD') {
                inputConfig.player1 = 'keyboard';
                inputConfig.selectionPhase = 1;
            }
        }
        // Player 2 selection (phase 1)
        else if (inputConfig.selectionPhase === 1) {
            if (code === 'ArrowUp' || code === 'ArrowLeft' || code === 'ArrowDown' || code === 'ArrowRight') {
                inputConfig.player2 = 'keyboard';
                inputConfig.selectionPhase = 2;
                startGameWithConfig();
            } else if (code === 'Enter' || code === 'Space') {
                // Skip P2, single player mode
                inputConfig.player2 = 'none';
                inputConfig.selectionPhase = 2;
                startGameWithConfig();
            }
        }
    }

    function handleGamepadMenuInput() {
        if (!inputConfig.menuActive) return;

        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];

        for (let i = 0; i < gamepads.length; i++) {
            const gamepad = gamepads[i];
            if (!gamepad) continue;

            // Check for any button press or significant stick movement
            const hasInput = gamepad.buttons.some(b => b.pressed) ||
                           Math.abs(gamepad.axes[0]) > 0.5 ||
                           Math.abs(gamepad.axes[1]) > 0.5;

            if (hasInput) {
                if (inputConfig.selectionPhase === 0) {
                    inputConfig.player1 = 'gamepad';
                    inputConfig.player1GamepadIndex = i;
                    inputConfig.selectionPhase = 1;
                } else if (inputConfig.selectionPhase === 1) {
                    // Don't allow same gamepad for both players
                    if (inputConfig.player1 === 'gamepad' && inputConfig.player1GamepadIndex === i) {
                        continue;
                    }
                    inputConfig.player2 = 'gamepad';
                    inputConfig.player2GamepadIndex = i;
                    inputConfig.selectionPhase = 2;
                    startGameWithConfig();
                }
            }
        }
    }

    function startGameWithConfig() {
        inputConfig.menuActive = false;

        // Activate players based on input config
        players[0].active = inputConfig.player1 !== 'none';
        players[1].active = inputConfig.player2 !== 'none';

        // Count active players
        gameStats.activePlayers = (players[0].active ? 1 : 0) + (players[1].active ? 1 : 0);
        gameStats.singlePlayerMode = gameStats.activePlayers === 1;

        // Reset game state
        gameStats.gameOver = false;
        gameStats.startTime = Date.now();
        gameStats.time = 0;
        obstacles = [];
        collectables = [];
        scorePopups = [];
        spawnDistanceCounter = 0;
        obstacleSpeed = initialObstacleSpeed;
        gapSize = initialGapSize;

        // Initialize audio
        initializeAudio();

        if (gameStats.singlePlayerMode) {
            statusElement.textContent = 'SINGLE PLAYER MODE';
        } else {
            statusElement.textContent = 'GAME START';
        }
    }

    function drawInputMenu() {
        // Darken background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.textAlign = 'center';
        ctx.font = '24px "Press Start 2P"';
        ctx.fillStyle = '#00ff88';

        // Title
        ctx.fillText('SELECT INPUT', canvas.width / 2, 80);

        ctx.font = '14px "Press Start 2P"';

        if (inputConfig.selectionPhase === 0) {
            // Waiting for P1
            ctx.fillStyle = '#ff3333';
            ctx.fillText('PLAYER 1', canvas.width / 2, 160);
            ctx.fillStyle = '#00ff88';
            ctx.font = '12px "Press Start 2P"';
            ctx.fillText('Press WASD for Keyboard', canvas.width / 2, 200);
            ctx.fillText('or use Gamepad', canvas.width / 2, 230);
        } else if (inputConfig.selectionPhase === 1) {
            // P1 selected, waiting for P2
            ctx.fillStyle = '#ff3333';
            ctx.fillText('PLAYER 1: ' + inputConfig.player1.toUpperCase(), canvas.width / 2, 160);

            ctx.fillStyle = '#3333ff';
            ctx.fillText('PLAYER 2', canvas.width / 2, 220);
            ctx.fillStyle = '#00ff88';
            ctx.font = '12px "Press Start 2P"';
            ctx.fillText('Press ARROWS for Keyboard', canvas.width / 2, 260);
            ctx.fillText('or use Gamepad', canvas.width / 2, 290);
            ctx.fillText('ENTER/SPACE to skip (1P mode)', canvas.width / 2, 330);
        }

        // Controls reference
        ctx.font = '10px "Press Start 2P"';
        ctx.fillStyle = '#666666';
        ctx.fillText('P1: WASD + SPACE (1P) / L.SHIFT (2P)', canvas.width / 2, canvas.height - 80);
        ctx.fillText('P2: ARROWS + RIGHT SHIFT (boost)', canvas.width / 2, canvas.height - 50);

        ctx.textAlign = 'left';
    }
    
    // Create elements for both player scores
    // Replace the single score element with player-specific ones
    scoreElement.id = 'scoreP1';
    scoreElement.textContent = 'P1 SCORE: 000000';
    scoreElement.className = 'game-stat retro-text';
    
    const scoreP2Element = document.createElement('div');
    scoreP2Element.id = 'scoreP2';
    scoreP2Element.className = 'game-stat retro-text';
    scoreP2Element.textContent = 'P2 SCORE: 000000';
    
    // Create a new element for the high score
    const highScoreElement = document.createElement('div');
    highScoreElement.id = 'highScore';
    highScoreElement.className = 'game-stat retro-text';
    highScoreElement.textContent = 'HI-SCORE: 0000';
    highScoreElement.style.color = '#FFFF00'; // Yellow color for crown indication
    highScoreElement.style.textShadow = '0 0 5px #FFFF00'; // Yellow glow
    
    // Clear previous elements and create a structured HUD
    const statsContainer = document.createElement('div');
    statsContainer.id = 'stats-container';
    statsContainer.style.display = 'flex';
    statsContainer.style.justifyContent = 'space-between';
    statsContainer.style.alignItems = 'center';
    statsContainer.style.width = '100%';
    statsContainer.style.padding = '5px 20px';
    statsContainer.style.boxSizing = 'border-box';
    statsContainer.style.backgroundColor = 'black';
    statsContainer.style.color = '#00ff88';
    statsContainer.style.borderTop = '2px solid #00ff88';
    
    // Create left section for player scores
    const leftSection = document.createElement('div');
    leftSection.style.display = 'flex';
    leftSection.style.gap = '20px';
    leftSection.appendChild(scoreElement);
    leftSection.appendChild(scoreP2Element);
    
    // Center section for high score
    const centerSection = document.createElement('div');
    centerSection.appendChild(highScoreElement);
    
    // Right section for time
    const rightSection = document.createElement('div');
    rightSection.appendChild(timeElement);
    
    // Add all sections to the container
    statsContainer.appendChild(leftSection);
    statsContainer.appendChild(centerSection);
    statsContainer.appendChild(rightSection);
    
    // Fix: Insert the stats container properly without relying on gameContainer
    // First, get the parent of the canvas
    const canvasParent = canvas.parentNode;
    
    // Insert stats container after the canvas
    canvasParent.insertBefore(statsContainer, canvas.nextSibling);
    
    // Insert status element after the stats container
    canvasParent.insertBefore(statusElement, statsContainer.nextSibling);
    
    // Style status element
    statusElement.style.width = '100%';
    statusElement.style.textAlign = 'center';
    statusElement.style.padding = '10px';
    statusElement.style.color = '#00ff88';
    statusElement.style.backgroundColor = 'black';
    statusElement.style.fontSize = '18px';
    statusElement.style.fontFamily = "'Press Start 2P', monospace";
    
    // Style all stat elements consistently
    const allStats = document.querySelectorAll('.game-stat');
    allStats.forEach(el => {
        el.style.fontFamily = "'Press Start 2P', monospace";
        el.style.fontSize = '16px';
        el.style.color = '#00ff88';
        el.style.textShadow = '0 0 5px #00ff88';
    });

    // Make high score yellow (must be applied after the general styling)
    highScoreElement.style.color = '#FFFF00'; // Yellow color for crown indication
    highScoreElement.style.textShadow = '0 0 5px #FFFF00'; // Yellow glow

    // Create players instead of single dot
    let players = [
        {
            x: canvas.width / 3,
            y: canvas.height / 3, // Red player starts at top third
            radius: CONFIG.player.radius,
            speed: CONFIG.player.normalSpeed,
            color: '#ff3333', // Red
            active: false,    // Is player alive and active?
            score: 0,
            boostMeter: 100,  // Boost meter from 0-100
            boosting: false,  // Is player currently boosting?
            boostSpeed: CONFIG.player.boostSpeed,
            normalSpeed: CONFIG.player.normalSpeed,
            boostDrain: CONFIG.player.boostDrain,
            boostRegen: CONFIG.player.boostRegen,
            canBoost: true    // Flag to prevent continuous boosting when empty
        },
        {
            x: canvas.width / 3, // Both players start at same x position (1/3 of screen)
            y: canvas.height * 2/3, // Blue player starts at bottom third
            radius: CONFIG.player.radius,
            speed: CONFIG.player.normalSpeed,
            color: '#3333ff', // Blue
            active: false,
            score: 0,
            boostMeter: 100,  // Boost meter from 0-100
            boosting: false,  // Is player currently boosting?
            boostSpeed: CONFIG.player.boostSpeed,
            normalSpeed: CONFIG.player.normalSpeed,
            boostDrain: CONFIG.player.boostDrain,
            boostRegen: CONFIG.player.boostRegen,
            canBoost: true    // Flag to prevent continuous boosting when empty
        }
    ];
    
    // Create boost meter elements
    const boostMetersElement = document.createElement('div');
    boostMetersElement.id = 'boostMeters';
    boostMetersElement.style.position = 'fixed'; // Change to fixed positioning
    boostMetersElement.style.width = '1000px'; // Match canvas width
    boostMetersElement.style.padding = '10px 0'; // Padding top/bottom only
    boostMetersElement.style.display = 'flex';
    boostMetersElement.style.justifyContent = 'space-between';
    boostMetersElement.style.zIndex = '10'; // Make sure it's above other elements if they overlap
    
    // Ensure the boost meters are fixed and prevent scrolling
    boostMetersElement.style.position = 'fixed';
    boostMetersElement.style.zIndex = '10';

    // Prevent scrolling in the browser
    const style = document.createElement('style');
    style.innerHTML = `
        body, html {
            margin: 0;
            padding: 0;
            overflow: hidden;
        }
    `;
    document.head.appendChild(style);

    // Create individual boost meters
    for (let i = 0; i < 2; i++) {
        const playerBoostContainer = document.createElement('div');
        playerBoostContainer.className = 'boost-container';
        playerBoostContainer.style.width = '200px';
        playerBoostContainer.style.position = 'relative';
        
        const playerBoostLabel = document.createElement('div');
        playerBoostLabel.className = 'boost-label';
        playerBoostLabel.textContent = `P${i+1} DASH`; // Changed from BOOST to DASH
        playerBoostLabel.style.color = players[i].color;
        playerBoostLabel.style.fontFamily = "'Press Start 2P', monospace";
        playerBoostLabel.style.fontSize = '12px';
        playerBoostLabel.style.marginBottom = '5px';
        playerBoostLabel.style.textShadow = `0 0 5px ${players[i].color}`;
        
        const playerBoostBg = document.createElement('div');
        playerBoostBg.className = 'boost-bg';
        playerBoostBg.style.width = '100%';
        playerBoostBg.style.height = '10px';
        playerBoostBg.style.backgroundColor = '#222';
        playerBoostBg.style.border = '1px solid #00ff88';
        
        const playerBoostFill = document.createElement('div');
        playerBoostFill.id = `boostFill${i}`;
        playerBoostFill.className = 'boost-fill';
        playerBoostFill.style.width = '100%';
        playerBoostFill.style.height = '100%';
        playerBoostFill.style.backgroundColor = players[i].color;
        playerBoostFill.style.transition = 'width 0.1s';
        
        playerBoostBg.appendChild(playerBoostFill);
        playerBoostContainer.appendChild(playerBoostLabel);
        playerBoostContainer.appendChild(playerBoostBg);
        
        // Add to the appropriate side
        if (i === 0) {
            playerBoostContainer.style.marginLeft = '10px'; // Align with left edge of game area
            boostMetersElement.appendChild(playerBoostContainer);
        } else {
            playerBoostContainer.style.marginRight = '10px'; // Align with right edge of game area
            boostMetersElement.appendChild(playerBoostContainer);
        }
    }
    
    // Add the boost meters element to the DOM
    document.body.insertBefore(boostMetersElement, document.body.firstChild);
    
    // Position boost meters at the top of the canvas
    function positionBoostMeters() {
        // Position meters just above the game canvas
        const canvasRect = canvas.getBoundingClientRect();
        const metersRect = boostMetersElement.getBoundingClientRect();
        boostMetersElement.style.top = (canvasRect.top - metersRect.height - 5) + 'px';
        boostMetersElement.style.left = `${canvasRect.left}px`;
        boostMetersElement.style.width = `${canvasRect.width}px`;
    }
    
    // Position boost meters once DOM is loaded
    positionBoostMeters();
    
    // Reposition when window is resized
    window.addEventListener('resize', positionBoostMeters);
    
    // Function to draw boost meters (updating the meter visuals)
    function drawBoostMeters() {
        for (let i = 0; i < 2; i++) {
            const boostFill = document.getElementById(`boostFill${i}`);
            if (boostFill) {
                boostFill.style.width = `${players[i].boostMeter}%`;
                
                // Change bar color based on player state
                if (!players[i].canBoost && players[i].boostMeter < 100) {
                    // Exhausted state - show flashing gray
                    boostFill.style.backgroundColor = gameStats.time % 2 === 0 ? '#777777' : '#444444';
                } else if (players[i].boosting) {
                    // When dashing, use the player's color and brighten it
                    const playerColor = players[i].color;
                    boostFill.style.backgroundColor = playerColor === '#ff3333' ? 
                        '#ff6666' : '#6666ff'; // Brighter version of the player's color
                    boostFill.style.boxShadow = `0 0 10px ${players[i].color}`;
                } else {
                    // Normal state - use player's color
                    boostFill.style.backgroundColor = players[i].color;
                    boostFill.style.boxShadow = 'none';
                }
            }
        }
    }

    // Add game stats with new property to track if game is in single or multiplayer mode
    let gameStats = {
        time: 0,
        startTime: Date.now(),
        highScore: 0,
        gameOver: true, // Start with game not active
        activePlayers: 0,
        singlePlayerMode: false, // Track if game is in single player mode
        pausedBy: null, // Index of player who paused, null if unpaused
        startButtonWasPressed: [false, false], // Track pause button pressed per player
        lastDifficultyIncrease: 0 // Track the last time difficulty was increased
    };

    // Add obstacles (bars with gaps)
    let obstacles = [];
    let obstacleSpeed = CONFIG.obstacles.initialSpeed;
    let initialObstacleSpeed = CONFIG.obstacles.initialSpeed;
    let obstacleWidth = CONFIG.obstacles.width;
    let gapSize = CONFIG.obstacles.initialGapSize;
    let initialGapSize = CONFIG.obstacles.initialGapSize;
    let minimumGapSize = CONFIG.obstacles.minimumGapSize;
    let gapShrinkRate = CONFIG.difficulty.gapShrinkRate;
    let gapShrinkInterval = CONFIG.difficulty.gapShrinkInterval;
    let timeDifficultyInterval = CONFIG.difficulty.timeInterval;
    let timeSpeedIncrease = CONFIG.difficulty.speedIncrease;
    let timeGapDecrease = CONFIG.difficulty.gapDecrease;
    let minGapPosition = 50;
    const spawnDistance = CONFIG.obstacles.spawnDistance;
    let spawnDistanceCounter = 0;   // Accumulates movement for spawn timing
    
    // Add collectables system
    let collectables = [];
    let collectableTypes = [
        { type: "gem", points: 1, color: "#42f5a7", radius: 10, probability: 0.6 },
        { type: "orb", points: 5, color: "#8a2be2", radius: 12, probability: 0.3 },
        { type: "star", points: 10, color: "#ffff00", radius: 16, probability: 0.1 }
    ];
    
    function updateCollectables(speedFactor) {
        for (let i = collectables.length - 1; i >= 0; i--) {
            let collectable = collectables[i];
            
            // Move collectable at same speed as obstacles
            collectable.x -= obstacleSpeed * speedFactor;
            
            // Animate collectable (pulsing effect)
            collectable.frame = (collectable.frame + 0.1) % 360;
            
            // Check if collectable is off-screen
            if (collectable.x + collectable.radius < 0) {
                collectables.splice(i, 1);
                continue;
            }
            
            // Skip if already collected
            if (!collectable.active || collectable.collected) continue;
            
            // Check for collection by each player
            for (let p = 0; p < 2; p++) {
                if (!players[p].active) continue;
                
                // Distance between player and collectable
                const dx = players[p].x - collectable.x;
                const dy = players[p].y - collectable.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < players[p].radius + collectable.radius) {
                    // Collect the item - only one player can collect each item
                    collectable.collected = true;
                    players[p].score += collectable.points;
                    
                    // Mark collectable as inactive
                    collectable.active = false;
                    
                    // Create a floating score text effect
                    createScorePopup(collectable.x, collectable.y, collectable.points, players[p].color);
                    
                    // Play sound effect for this collectable type
                    if (audioContext) {
                        playSound(collectable.type);
                    }
                    
                    // Remove the collectable since it can only be collected once
                    collectables.splice(i, 1);
                    break;
                }
            }
        }
    }
    
    // Score popup effect elements
    let scorePopups = [];
    
    function createScorePopup(x, y, points, color) {
        scorePopups.push({
            x: x,
            y: y,
            points: points,
            color: color,
            opacity: 1,
            velocity: -1.5 // Move upward
        });
    }
    
    function updateScorePopups(speedFactor) {
        for (let i = scorePopups.length - 1; i >= 0; i--) {
            let popup = scorePopups[i];
            
            // Move upward
            popup.y += popup.velocity * speedFactor;
            
            // Fade out
            popup.opacity -= 0.02 * speedFactor;
            
            // Remove when fully transparent
            if (popup.opacity <= 0) {
                scorePopups.splice(i, 1);
            }
        }
    }
    
    function drawScorePopups() {
        for (let popup of scorePopups) {
            ctx.font = '16px "Press Start 2P"';
            ctx.fillStyle = `rgba(255, 255, 255, ${popup.opacity})`;
            ctx.strokeStyle = `rgba(0, 0, 0, ${popup.opacity})`;
            ctx.lineWidth = 3;
            
            const text = `+${popup.points}`;
            
            // Draw text with outline
            ctx.strokeText(text, popup.x - 20, popup.y);
            ctx.fillText(text, popup.x - 20, popup.y);
        }
    }
    
    // Draw collectables with appropriate shapes and animations
    function drawCollectables() {
        for (let collectable of collectables) {
            if (!collectable.active) continue;
            
            ctx.save();
            
            // Pulsing effect based on frame
            const scale = 1 + Math.sin(collectable.frame) * 0.1;
            const glowSize = collectable.radius * 1.5;
            
            // Draw glow effect
            const gradient = ctx.createRadialGradient(
                collectable.x, collectable.y, 0,
                collectable.x, collectable.y, glowSize
            );
            gradient.addColorStop(0, collectable.color);
            gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
            
            ctx.beginPath();
            ctx.fillStyle = gradient;
            ctx.arc(collectable.x, collectable.y, glowSize, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw the collectable shape based on type
            ctx.fillStyle = collectable.color;
            
            switch (collectable.type) {
                case "gem":
                    // Diamond shape
                    ctx.beginPath();
                    ctx.moveTo(collectable.x, collectable.y - collectable.radius * scale);
                    ctx.lineTo(collectable.x + collectable.radius * scale, collectable.y);
                    ctx.lineTo(collectable.x, collectable.y + collectable.radius * scale);
                    ctx.lineTo(collectable.x - collectable.radius * scale, collectable.y);
                    ctx.closePath();
                    ctx.fill();
                    break;
                case "star":
                    // Star shape (5-pointed)
                    ctx.beginPath();
                    const spikes = 5;
                    const outerR = collectable.radius * scale;
                    const innerR = collectable.radius * scale * 0.4;
                    for (let i = 0; i < spikes * 2; i++) {
                        const r = (i % 2 === 0) ? outerR : innerR;
                        const angle = (Math.PI * i) / spikes;
                        const px = collectable.x + Math.cos(angle) * r;
                        const py = collectable.y + Math.sin(angle) * r;
                        if (i === 0) ctx.moveTo(px, py);
                        else ctx.lineTo(px, py);
                    }
                    ctx.closePath();
                    ctx.fill();
                    break;
                case "orb":
                    // Orb shape (circle with highlight)
                    ctx.beginPath();
                    ctx.arc(collectable.x, collectable.y, collectable.radius * scale, 0, Math.PI * 2);
                    ctx.fill();
                    // Inner highlight
                    ctx.beginPath();
                    ctx.fillStyle = "#ffffff";
                    ctx.globalAlpha = 0.7;
                    ctx.arc(
                        collectable.x - collectable.radius * 0.3,
                        collectable.y - collectable.radius * 0.3,
                        collectable.radius * 0.3,
                        0, Math.PI * 2
                    );
                    ctx.fill();
                    break;
            }
            
            ctx.restore();
        }
    }
    
    function spawnObstacle() {
        // Calculate gap position (random vertical position)
        // Use the gameplay boundary (20px from edges)
        const playAreaTop = 20;
        const playAreaBottom = canvas.height - 20;
        const playableHeight = playAreaBottom - playAreaTop;
        
        // Add a minimum margin from the edges for the gap (40px from each edge)
        const edgeMargin = 40; 
        const minGapY = playAreaTop + edgeMargin;
        const maxGapY = playAreaBottom - gapSize - edgeMargin;
        
        // Make sure the gap is placed within the safe area
        const gapPosition = minGapY + Math.random() * (maxGapY - minGapY);
        
        const newObstacle = {
            x: canvas.width - 20, // Start at right edge of playable area
            gapStart: gapPosition,
            gapEnd: gapPosition + gapSize,  // Use current gap size
            passed: [false, false], // Track if each player passed this obstacle
            obstacleIndex: obstacles.length // Add index for tracking
        };
        
        obstacles.push(newObstacle);
        
        // Spawn a collectable randomly between this and the previous obstacle (avoid gaps and edges)
        if (obstacles.length > 1) {
            const prevObstacle = obstacles[obstacles.length - 2];
            spawnCollectableBetweenObstacles(prevObstacle, newObstacle);
        }
    }
    
    function updateObstacles(speedFactor) {
        // Spawn new obstacles at fixed pixel spacing
        spawnDistanceCounter += obstacleSpeed * speedFactor;
        if (spawnDistanceCounter >= spawnDistance) {
            spawnObstacle();
            spawnDistanceCounter -= spawnDistance;
        }

        // Update obstacle positions with consistent speed
        for (let i = obstacles.length - 1; i >= 0; i--) {
            let obstacle = obstacles[i];
            obstacle.x -= obstacleSpeed * speedFactor;
            
            // Check if obstacle has moved off-screen
            if (obstacle.x + obstacleWidth < 0) {
                obstacles.splice(i, 1);
                continue;
            }
            
            // Check if each active player has passed the obstacle
            for (let p = 0; p < 2; p++) {
                if (players[p].active && !obstacle.passed[p] && players[p].x > obstacle.x + obstacleWidth) {
                    obstacle.passed[p] = true;
                    players[p].score++;
                    
                    // Removed boost regeneration when passing obstacles - now it's time-based only
                    
                    // Get max score between players to determine difficulty
                    const maxPlayerScore = Math.max(
                        players[0].active ? players[0].score : 0, 
                        players[1].active ? players[1].score : 0
                    );
                    
                    // Increase speed difficulty every 5 points
                    if (maxPlayerScore % 5 === 0 && maxPlayerScore > 0) {
                        if (obstacleSpeed < 3.5) {
                            obstacleSpeed += 0.1;
                        }
                    }
                    
                    // Decrease gap size every gapShrinkInterval points (new difficulty element)
                    if (maxPlayerScore % gapShrinkInterval === 0 && maxPlayerScore > 0) {
                        // Only shrink if above minimum size
                        if (gapSize > minimumGapSize) {
                            gapSize = Math.max(minimumGapSize, gapSize - gapShrinkRate);
                        }
                    }
                }
            }
            
            // Check for collision for each active player (simplified without tilt)
            for (let p = 0; p < 2; p++) {
                if (!players[p].active) continue;
                
                if (players[p].x + players[p].radius > obstacle.x && 
                    players[p].x - players[p].radius < obstacle.x + obstacleWidth) {
                    
                    if (players[p].y - players[p].radius < obstacle.gapStart || 
                        players[p].y + players[p].radius > obstacle.gapEnd) {
                        playerDeath(p);
                    }
                }
            }
        }
    }
    
    function drawObstacles() {
        ctx.fillStyle = '#00ff88';
        const leftBound = 20;
        const rightBound = canvas.width - 20;
        for (let obstacle of obstacles) {
            // Compute clipped rectangle coordinates
            const xStart = Math.max(leftBound, obstacle.x);
            const xEnd = Math.min(obstacle.x + obstacleWidth, rightBound);
            const width = xEnd - xStart;
            if (width <= 0) continue; // fully off-screen

            // Draw top bar
            ctx.fillRect(
                xStart,
                20,
                width,
                obstacle.gapStart - 20
            );
            // Draw bottom bar
            ctx.fillRect(
                xStart,
                obstacle.gapEnd,
                width,
                canvas.height - 20 - obstacle.gapEnd
            );
        }
    }
    
    // Update player's high score, colouring once a player surpasses the previous record
    function updateHighScore() {
        // Update highScore when any player surpasses it
        for (let p = 0; p < 2; p++) {
            if (players[p].active && players[p].score > gameStats.highScore) {
                gameStats.highScore = players[p].score;
            }
        }
        // Update displayed text
        highScoreElement.textContent = `HI-SCORE: ${gameStats.highScore.toString().padStart(4, '0')}`;
        // Colour yellow if highScore has been broken (>0) and a player holds that score, else green
        const isBroken = gameStats.highScore > 0 && players.some(p => p.active && p.score === gameStats.highScore);
        if (isBroken) {
            highScoreElement.style.color = '#FFFF00';
            highScoreElement.style.textShadow = '0 0 5px #FFFF00';
        } else {
            highScoreElement.style.color = '#00ff88';
            highScoreElement.style.textShadow = '0 0 5px #00ff88';
        }
    }
    
    // Handle when a player dies
    function playerDeath(playerIndex) {
        players[playerIndex].active = false;
        gameStats.activePlayers--;
        
        // Play death sound effect (PacMan style)
        if (audioContext) {
            playSound('death');
        }
        
        // High score is now updated continuously in gameLoop
        
        // Update status message based on which players are still active
        if (gameStats.activePlayers === 0) {
            // All players are dead - freeze the game and timer
            gameStats.gameOver = true;
            statusElement.textContent = 'GAME OVER (PRESS X)';
            // Store the final time when both players are dead
            gameStats.finalTime = gameStats.time;
        } else {
            // Only one player is dead
            const deadPlayerNum = playerIndex + 1;
            statusElement.textContent = `PLAYER ${deadPlayerNum} OUT`;
        }
    }
    
    function resetGame() {
        // Reset both players based on input config
        for (let p = 0; p < 2; p++) {
            players[p].x = canvas.width / 3;
            players[p].y = canvas.height * (p === 0 ? 1/3 : 2/3);
            players[p].score = 0;
            players[p].boostMeter = 100;
            players[p].canBoost = true;
            players[p].boosting = false;

            // Check input config for this player
            const playerInput = p === 0 ? inputConfig.player1 : inputConfig.player2;
            players[p].active = playerInput !== 'none';
        }

        gameStats.startTime = Date.now();
        gameStats.activePlayers = (players[0].active ? 1 : 0) + (players[1].active ? 1 : 0);
        gameStats.singlePlayerMode = gameStats.activePlayers === 1;
        gameStats.gameOver = false;
        gameStats.time = 0;
        gameStats.pausedBy = null;
        gameStats.startButtonWasPressed = [false, false];

        obstacles = [];
        collectables = [];
        scorePopups = [];
        spawnDistanceCounter = 0;
        obstacleSpeed = initialObstacleSpeed;
        gapSize = initialGapSize;

        if (gameStats.singlePlayerMode) {
            statusElement.textContent = 'SINGLE PLAYER MODE';
        } else {
            statusElement.textContent = 'PLAYERS READY';
        }
    }

    function updateGamepads(speedFactor) {
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];

        // Handle menu input from gamepads
        if (inputConfig.menuActive) {
            handleGamepadMenuInput();
            return;
        }

        // Check if we need to restart (when both players are dead)
        if (gameStats.gameOver) {
            // Check for restart input (X button on gamepad or Space/Enter on keyboard)
            let restartPressed = keyboardState.space || keyboardState.enter;

            for (let i = 0; i < gamepads.length; i++) {
                const gamepad = gamepads[i];
                if (gamepad && gamepad.buttons[0] && gamepad.buttons[0].pressed) {
                    restartPressed = true;
                    break;
                }
            }

            if (restartPressed) {
                resetGame();
                return;
            }

            return; // Don't process other inputs when game is over
        }

        // Handle pause (Escape key or Circle button)
        if (keyboardState.escape && !gameStats.escapePressedLastFrame) {
            if (gameStats.pausedBy === null) {
                gameStats.pausedBy = 0;
                statusElement.textContent = 'PAUSED';
            } else {
                gameStats.pausedBy = null;
                statusElement.textContent = gameStats.activePlayers > 1 ? "GAME RESUMED" : "SINGLE PLAYER MODE";
                gameStats.startTime = Date.now() - (gameStats.time * 1000);
            }
        }
        gameStats.escapePressedLastFrame = keyboardState.escape;

        // Per-player pause/resume (Circle button index 1)
        for (let i = 0; i < gamepads.length; i++) {
            const gamepad = gamepads[i];
            if (gamepad && gamepad.buttons[1] && gamepad.buttons[1].pressed) {
                if (!gameStats.startButtonWasPressed[i]) {
                    if (gameStats.pausedBy === null) {
                        // Pause by this player
                        gameStats.pausedBy = i;
                        statusElement.textContent = `PLAYER ${i+1} PAUSED`;
                    } else if (gameStats.pausedBy === i) {
                        // Unpause by same player
                        gameStats.pausedBy = null;
                        statusElement.textContent = gameStats.activePlayers > 1 ? "GAME RESUMED" : "SINGLE PLAYER MODE";
                        // Reset timer to account for paused duration
                        gameStats.startTime = Date.now() - (gameStats.time * 1000);
                    }
                    gameStats.startButtonWasPressed[i] = true;
                }
            } else if (gamepad) {
                // Reset press flag on release
                if (!gamepad.buttons[1].pressed) {
                    gameStats.startButtonWasPressed[i] = false;
                }
            }
        }
        // Don't process movement if paused by any player
        if (gameStats.pausedBy !== null) return;

        // Process each player based on their input configuration
        for (let i = 0; i < 2; i++) {
            if (!players[i].active) continue;

            let axisX = 0;
            let axisY = 0;
            let boostPressed = false;

            const playerInputType = i === 0 ? inputConfig.player1 : inputConfig.player2;

            if (playerInputType === 'keyboard') {
                // Keyboard input for this player
                if (i === 0) {
                    // Player 1: WASD
                    if (keyboardState.a) axisX -= 1;
                    if (keyboardState.d) axisX += 1;
                    if (keyboardState.w) axisY -= 1;
                    if (keyboardState.s) axisY += 1;
                    // Use Space for boost in single player mode, Left Shift in two player
                    boostPressed = gameStats.singlePlayerMode ? keyboardState.space : keyboardState.shiftLeft;
                } else {
                    // Player 2: Arrow keys
                    if (keyboardState.arrowLeft) axisX -= 1;
                    if (keyboardState.arrowRight) axisX += 1;
                    if (keyboardState.arrowUp) axisY -= 1;
                    if (keyboardState.arrowDown) axisY += 1;
                    boostPressed = keyboardState.shiftRight;
                }

                // Normalize diagonal movement
                const magnitude = Math.sqrt(axisX * axisX + axisY * axisY);
                if (magnitude > 1) {
                    axisX /= magnitude;
                    axisY /= magnitude;
                }
            } else if (playerInputType === 'gamepad') {
                // Gamepad input for this player
                const gamepadIndex = i === 0 ? inputConfig.player1GamepadIndex : inputConfig.player2GamepadIndex;
                const gamepad = gamepads[gamepadIndex];

                if (gamepad) {
                    // Improved deadzone handling with normalized vector
                    const deadzone = 0.15;

                    // Get raw axis values
                    axisX = gamepad.axes[0];
                    axisY = gamepad.axes[1];

                    // Calculate magnitude of the vector
                    const magnitude = Math.sqrt(axisX * axisX + axisY * axisY);

                    // If magnitude is below deadzone, set both axes to zero
                    if (magnitude < deadzone) {
                        axisX = 0;
                        axisY = 0;
                    } else {
                        // Normalize vector and apply deadzone
                        const normalizedX = axisX / magnitude;
                        const normalizedY = axisY / magnitude;

                        // Scale the vector based on how far it is beyond the deadzone
                        const scaledMagnitude = Math.min(1, (magnitude - deadzone) / (1 - deadzone));

                        axisX = normalizedX * scaledMagnitude;
                        axisY = normalizedY * scaledMagnitude;
                    }

                    boostPressed = gamepad.buttons[2] && gamepad.buttons[2].pressed;
                }
            }

            // Handle boost activation
            if (boostPressed && players[i].boostMeter > 0 && players[i].canBoost) {
                players[i].boosting = true;
                players[i].speed = players[i].boostSpeed;
                players[i].boostMeter -= players[i].boostDrain;

                if (players[i].boostMeter <= 0) {
                    players[i].boostMeter = 0;
                    players[i].canBoost = false;
                }
            } else {
                players[i].boosting = false;
                if (!players[i].canBoost) {
                    players[i].speed = CONFIG.player.exhaustedSpeed;
                } else {
                    players[i].speed = players[i].normalSpeed;
                }

                if (players[i].boostMeter < 100) {
                    players[i].boostMeter += players[i].boostRegen;

                    if (players[i].boostMeter >= CONFIG.player.boostRechargeThreshold && !players[i].canBoost) {
                        players[i].canBoost = true;
                        players[i].speed = players[i].normalSpeed;
                    }
                }
            }

            // Update player position
            players[i].x += axisX * players[i].speed * speedFactor;
            players[i].y += axisY * players[i].speed * speedFactor;

            // Keep player within canvas bounds
            players[i].x = Math.max(20 + players[i].radius, Math.min(canvas.width - 20 - players[i].radius, players[i].x));
            players[i].y = Math.max(20 + players[i].radius, Math.min(canvas.height - 20 - players[i].radius, players[i].y));
        }
    }

    function drawGameElements() {
        // Draw obstacles
        drawObstacles();
        
        // Draw collectables
        drawCollectables();
        
        // Draw each active player
        for (let i = 0; i < 2; i++) {
            if (players[i].active) {
                // Check for exhausted state
                const isExhausted = !players[i].canBoost && players[i].boostMeter < 100;
                
                // Draw player with glow effect
                ctx.beginPath();
                const gradient = ctx.createRadialGradient(
                    players[i].x, players[i].y, 0, 
                    players[i].x, players[i].y, players[i].radius * 2
                );
                
                if (isExhausted) {
                    // Exhausted effect - pulsing gray/dark version of player color
                    const pulseRate = 0.5; // How fast the effect pulses
                    const pulseAmount = 0.3 + 0.2 * Math.sin(Date.now() * pulseRate / 100); // Pulsing between 0.3-0.5 brightness
                    
                    // Create a "tired" looking glow
                    gradient.addColorStop(0, `rgba(80, 80, 80, ${pulseAmount})`);
                    gradient.addColorStop(0.7, `rgba(40, 40, 40, ${pulseAmount * 0.8})`);
                    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
                    
                    // Add smoke particle effect for exhaustion
                    ctx.save();
                    ctx.globalAlpha = 0.5;
                    // Create a few "smoke" particles
                    for (let s = 0; s < 3; s++) {
                        const angle = Math.random() * Math.PI * 2;
                        const distance = players[i].radius * (1 + Math.random() * 0.5);
                        const size = players[i].radius * 0.3 * Math.random();
                        
                        ctx.beginPath();
                        ctx.fillStyle = 'rgba(100, 100, 100, 0.3)';
                        ctx.arc(
                            players[i].x + Math.cos(angle) * distance,
                            players[i].y + Math.sin(angle) * distance, 
                            size, 0, Math.PI * 2
                        );
                        ctx.fill();
                    }
                    ctx.restore();
                }
                // Refactored player rendering based on state
                else if (players[i].boosting) {
                    drawBoostingPlayer(players[i], i, gradient);
                } else {
                    // Normal glow when not dashing
                    gradient.addColorStop(0, players[i].color);
                    gradient.addColorStop(1, `rgba(${i === 0 ? '255,0,0' : '0,0,255'},0)`);
                }
                
                ctx.fillStyle = gradient;
                ctx.arc(players[i].x, players[i].y, players[i].radius * 2, 0, Math.PI * 2);
                ctx.fill();
                
                // Draw core of the player
                drawPlayerCore(players[i], isExhausted);
            }
        }
        
        // Draw score popups
        drawScorePopups();
    }

    // Helper function to draw player in boosting state 
    function drawBoostingPlayer(player, playerIndex, gradient) {
        // Create a stronger, more vibrant glow when dashing
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(0.5, player.color);
        gradient.addColorStop(1, `rgba(${playerIndex === 0 ? '255,0,0' : '0,0,255'},0)`);
        
        // Draw a dash trail behind the player
        ctx.save();
        ctx.globalAlpha = 0.7;
        drawPlayerTrail(player, playerIndex);
        ctx.restore();
    }

    // Helper function to draw the trail effect when player is boosting
    function drawPlayerTrail(player, playerIndex) {
        for (let t = 1; t <= 5; t++) {
            let trailX = player.x;
            let trailY = player.y;

            // Get movement direction based on input type
            let xDir = 0;
            let yDir = 0;

            const playerInputType = playerIndex === 0 ? inputConfig.player1 : inputConfig.player2;

            if (playerInputType === 'keyboard') {
                if (playerIndex === 0) {
                    if (keyboardState.a) xDir += 1;
                    if (keyboardState.d) xDir -= 1;
                    if (keyboardState.w) yDir += 1;
                    if (keyboardState.s) yDir -= 1;
                } else {
                    if (keyboardState.arrowLeft) xDir += 1;
                    if (keyboardState.arrowRight) xDir -= 1;
                    if (keyboardState.arrowUp) yDir += 1;
                    if (keyboardState.arrowDown) yDir -= 1;
                }
            } else if (playerInputType === 'gamepad') {
                const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
                const gamepadIndex = playerIndex === 0 ? inputConfig.player1GamepadIndex : inputConfig.player2GamepadIndex;
                if (gamepads[gamepadIndex]) {
                    xDir = -gamepads[gamepadIndex].axes[0];
                    yDir = -gamepads[gamepadIndex].axes[1];
                }
            }

            trailX += xDir * (t * 4);
            trailY += yDir * (t * 4);

            // Draw trail element
            ctx.beginPath();
            ctx.fillStyle = `rgba(255, 255, 255, ${0.8 - (t * 0.15)})`;
            ctx.arc(trailX, trailY, player.radius * (1 - t * 0.15), 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Helper function to draw the player's core
    function drawPlayerCore(player, isExhausted) {
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
        
        // Change fill color based on state
        if (isExhausted) {
            // Pulsing gray for exhausted state
            const pulseValue = 128 + 40 * Math.sin(Date.now() / 200);
            ctx.fillStyle = `rgb(${pulseValue}, ${pulseValue}, ${pulseValue})`;
        } else if (player.boosting) {
            ctx.fillStyle = '#ffffff'; // Bright white when dashing
        } else {
            ctx.fillStyle = player.color; // Normal color
        }
        
        ctx.fill();
        ctx.closePath();
    }

    function draw() {
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Show input selection menu if active
        if (inputConfig.menuActive) {
            drawInputMenu();
            return;
        }

        // Update game time only if the game is still active and not paused
        if (!gameStats.gameOver && gameStats.pausedBy === null) {
            gameStats.time = Math.floor((Date.now() - gameStats.startTime) / 1000);
        }

        // Draw single green border line used for gameplay boundary
        drawGameBoundary();

        // Draw game elements with proper layering
        drawGameElements();

        // Update score displays with colored player indicators and matching backlights
        updateScoreDisplays();
    }

    // Helper function to draw game boundary
    function drawGameBoundary() {
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 4;
        // Adjust the rectangle to account for line width to prevent right edge clipping
        ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);
    }

    // Helper function to update score displays
    function updateScoreDisplays() {
        const p1Text = `<span style="color: ${players[0].color}; text-shadow: 0 0 5px ${players[0].color};">P1</span>:${players[0].score.toString().padStart(4, '0')}`;
        const p2Text = `<span style="color: ${players[1].color}; text-shadow: 0 0 5px ${players[1].color};">P2</span>:${players[1].score.toString().padStart(4, '0')}`;
        
        scoreElement.innerHTML = p1Text;
        scoreP2Element.innerHTML = p2Text;
        timeElement.textContent = `TIME: ${gameStats.time.toString().padStart(3, '0')}`;
        
        // Draw boost meters
        drawBoostMeters();
        
        // Draw pause screen if the game is paused
        if (gameStats.pausedBy !== null) {
            drawPauseScreen();
        }
    }

    // Frame timing for consistent movement across different refresh rates
    let lastTimestamp = performance.now();
    let speedFactor = 1;

    // Start the game loop
    requestAnimationFrame(gameLoop);

    function gameLoop(timestamp) {
        // Compute frame-dependent speed factor (scale by 60fps target)
        speedFactor = (timestamp - lastTimestamp) / (1000 / 60);
        lastTimestamp = timestamp;

        // Update player positions based on gamepad input
        updateGamepads(speedFactor);

        // Continue updating game as long as the game is not over or paused
        if (!gameStats.gameOver && gameStats.pausedBy === null) {
            updateObstacles(speedFactor);
            updateCollectables(speedFactor);
            updateScorePopups(speedFactor);

            // Time-based difficulty increase every 30 seconds
            if (gameStats.time > 0 && gameStats.time % timeDifficultyInterval === 0) {
                // Check if we haven't already increased difficulty at this time mark
                if (gameStats.lastDifficultyIncrease !== gameStats.time) {
                    // Increase obstacle speed
                    obstacleSpeed += timeSpeedIncrease;
                    
                    // Decrease gap size (but not below minimum)
                    if (gapSize > minimumGapSize) {
                        gapSize = Math.max(minimumGapSize, gapSize - timeGapDecrease);
                    }
                    
                    // Update last difficulty increase time
                    gameStats.lastDifficultyIncrease = gameStats.time;
                    
                    // Visual feedback for difficulty increase (optional)
                    console.log(`Difficulty increased at ${gameStats.time}s - Speed: ${obstacleSpeed.toFixed(1)}, Gap: ${gapSize}`);
                }
            }
        }

        // Continuously update high score
        updateHighScore();
        
        draw();
        requestAnimationFrame(gameLoop);
    }
    
    function drawPauseScreen() {
        // Darken the screen
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw pause text indicating which player paused
        ctx.font = '32px "Press Start 2P"';
        ctx.fillStyle = '#00ff88';
        ctx.textAlign = 'center';
        const pb = gameStats.pausedBy;
        const pauseMessage = pb !== null ? `PLAYER ${pb + 1} PAUSED` : 'PAUSED';
        ctx.fillText(pauseMessage, canvas.width / 2, canvas.height / 2 - 20);
        
        // Draw instructions - updated for Circle button
        ctx.font = '16px "Press Start 2P"';
        ctx.fillText('PRESS CIRCLE TO CONTINUE', canvas.width / 2, canvas.height / 2 + 30);
        
        // Reset text alignment
        ctx.textAlign = 'left';
    }

    // Listen for gamepad connections
    window.addEventListener("gamepadconnected", (e) => {
        const gamepadIndex = e.gamepad.index;

        if (gamepadIndex < 2 && inputConfig.menuActive) {
            statusElement.textContent = `GAMEPAD ${gamepadIndex + 1} DETECTED`;
        }
    });

    window.addEventListener("gamepaddisconnected", (e) => {
        const gamepadIndex = e.gamepad.index;

        if (gamepadIndex < 2 && !inputConfig.menuActive) {
            // Check if this gamepad was assigned to a player
            const isP1Gamepad = inputConfig.player1 === 'gamepad' && inputConfig.player1GamepadIndex === gamepadIndex;
            const isP2Gamepad = inputConfig.player2 === 'gamepad' && inputConfig.player2GamepadIndex === gamepadIndex;

            if (isP1Gamepad && players[0].active) {
                const currentSpeed = obstacleSpeed;
                playerDeath(0);
                if (!gameStats.gameOver) obstacleSpeed = currentSpeed;
            }
            if (isP2Gamepad && players[1].active) {
                const currentSpeed = obstacleSpeed;
                playerDeath(1);
                if (!gameStats.gameOver) obstacleSpeed = currentSpeed;
            }

            if (!gameStats.gameOver) {
                statusElement.textContent = 'GAMEPAD DISCONNECTED';
            }
        }
    });

    // Add attribution text in bottom left
    const attributionElement = document.createElement('div');
    attributionElement.id = 'attribution';
    attributionElement.textContent = 'Dot Dash v1.0 - vibe coded by vstenby using Claude 3.7 Sonnet and o4-mini';
    attributionElement.style.position = 'fixed';
    attributionElement.style.bottom = '10px';
    attributionElement.style.left = '10px';
    attributionElement.style.color = '#00ff88';
    attributionElement.style.fontFamily = "'Press Start 2P', monospace";
    attributionElement.style.fontSize = '12px';
    attributionElement.style.opacity = '0.8';
    attributionElement.style.zIndex = '5';
    document.body.appendChild(attributionElement);
    
    // Add controls guide in bottom right
    const controlsGuideElement = document.createElement('div');
    controlsGuideElement.id = 'controlsGuide';
    controlsGuideElement.style.position = 'fixed';
    controlsGuideElement.style.bottom = '10px';
    controlsGuideElement.style.right = '10px';
    controlsGuideElement.style.color = '#00ff88';
    controlsGuideElement.style.fontFamily = "'Press Start 2P', monospace";
    controlsGuideElement.style.fontSize = '10px';
    controlsGuideElement.style.opacity = '0.8';
    controlsGuideElement.style.zIndex = '5';
    controlsGuideElement.style.textAlign = 'right';
    controlsGuideElement.innerHTML = 'KEYBOARD:<br>P1: WASD + SPACE/L.SHIFT<br>P2: ARROWS + R.SHIFT<br>ESC - PAUSE<br><br>GAMEPAD:<br>STICK/SQUARE/CIRCLE';
    document.body.appendChild(controlsGuideElement);

    // Initialize
    statusElement.textContent = 'SELECT INPUT METHOD';
    let gameLoopRunning = false;
    
    // Create Audio Context
    let audioContext = null;
    
    // Initialize audio when the user interacts with the game
    function initializeAudio() {
        if (audioContext) return; // Already initialized
        
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            initSounds();
            console.log("Audio initialized successfully");
        } catch (e) {
            console.error("Audio initialization failed:", e);
        }
    }
    
    // Initialize audio on first user gesture (gamepad input)
    window.addEventListener("gamepadconnected", () => {
        initializeAudio();
    });
    
    // Sound effects
    const sounds = {
        gem: null,
        star: null,
        orb: null,
        death: null
    };
    
    // Initialize sound system
    function initSounds() {
        // Create sounds for collectables using Web Audio API for better control
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Create different sound effects for each collectable
        createGemSound();
        createStarSound();
        createOrbSound();
        createDeathSound();
    }
    
    // Create gem sound (simple beep)
    function createGemSound() {
        sounds.gem = audioContext.createOscillator();
        sounds.gem.type = 'sine';
        sounds.gem.frequency.setValueAtTime(830, audioContext.currentTime);
        
        const gemGain = audioContext.createGain();
        gemGain.gain.setValueAtTime(0.2, audioContext.currentTime);
        gemGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        sounds.gem.connect(gemGain);
        sounds.gem.gemGain = gemGain; // Store for later use
    }
    
    // Create star sound (ascending beep)
    function createStarSound() {
        sounds.star = audioContext.createOscillator();
        sounds.star.type = 'sine';
        sounds.star.frequency.setValueAtTime(440, audioContext.currentTime);
        sounds.star.frequency.exponentialRampToValueAtTime(880, audioContext.currentTime + 0.2);
        
        const starGain = audioContext.createGain();
        starGain.gain.setValueAtTime(0.3, audioContext.currentTime);
        starGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        
        sounds.star.connect(starGain);
        sounds.star.starGain = starGain; // Store for later use
    }
    
    // Create orb sound (sparkle)
    function createOrbSound() {
        sounds.orb = audioContext.createOscillator();
        sounds.orb.type = 'triangle';
        sounds.orb.frequency.setValueAtTime(1200, audioContext.currentTime);
        sounds.orb.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.3);
        
        const orbGain = audioContext.createGain();
        orbGain.gain.setValueAtTime(0.3, audioContext.currentTime);
        orbGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        sounds.orb.connect(orbGain);
        sounds.orb.orbGain = orbGain; // Store for later use
    }
    
    // Create death sound (percussive bump)
    function createDeathSound() {
        // No need to store the oscillator as we'll create it on demand
        sounds.death = {
            type: 'custom',
            duration: 0.2  // Store duration for reference
        };
    }
    
    // Play sound for collectable type
    function playSound(type) {
        if (!audioContext) return;
        
        try {
            if (type === 'death') {
                // Create a more percussive "bump" sound for death using multiple oscillators and filters
                
                // Create a lower frequency oscillator for the "thump" part
                const thumpOsc = audioContext.createOscillator();
                thumpOsc.type = 'sine';
                thumpOsc.frequency.setValueAtTime(120, audioContext.currentTime);
                thumpOsc.frequency.exponentialRampToValueAtTime(60, audioContext.currentTime + 0.1);
                
                // Create a noise component for the percussive hit
                const noiseBuffer = createNoiseBuffer();
                const noiseSource = audioContext.createBufferSource();
                noiseSource.buffer = noiseBuffer;
                
                // Create filter for the noise to shape it
                const noiseFilter = audioContext.createBiquadFilter();
                noiseFilter.type = 'lowpass';
                noiseFilter.frequency.setValueAtTime(800, audioContext.currentTime);
                noiseFilter.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.1);
                noiseFilter.Q.value = 1.0;
                
                // Create gain nodes
                const thumpGain = audioContext.createGain();
                thumpGain.gain.setValueAtTime(0.7, audioContext.currentTime);
                thumpGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
                
                const noiseGain = audioContext.createGain();
                noiseGain.gain.setValueAtTime(0.2, audioContext.currentTime);
                noiseGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
                
                // Connect all components
                thumpOsc.connect(thumpGain);
                noiseSource.connect(noiseFilter);
                noiseFilter.connect(noiseGain);
                
                thumpGain.connect(audioContext.destination);
                noiseGain.connect(audioContext.destination);
                
                // Start and stop the sounds
                thumpOsc.start();
                noiseSource.start();
                thumpOsc.stop(audioContext.currentTime + 0.2);
                noiseSource.stop(audioContext.currentTime + 0.2);
            } else {
                const sound = audioContext.createOscillator();
                // Use triangle for stars and sine for others
                sound.type = type === 'star' ? 'triangle' : 'sine';
                
                // Set frequency based on type (swapped orb and star)
                if (type === 'gem') {
                    sound.frequency.setValueAtTime(830, audioContext.currentTime);
                } else if (type === 'orb') {
                    // orb now uses rising beep (previously star)
                    sound.frequency.setValueAtTime(440, audioContext.currentTime);
                    sound.frequency.exponentialRampToValueAtTime(880, audioContext.currentTime + 0.2);
                } else { // star
                    // star now uses sparkle (previously orb)
                    sound.frequency.setValueAtTime(1200, audioContext.currentTime);
                    sound.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.3);
                }
                
                // Create gain node for volume control
                const gain = audioContext.createGain();
                gain.gain.setValueAtTime(0.2, audioContext.currentTime);
                // Swap durations for orb and star
                gain.gain.exponentialRampToValueAtTime(
                    0.01,
                    audioContext.currentTime +
                        (type === 'gem' ? 0.1 : type === 'orb' ? 0.2 : 0.3)
                );
                
                // Connect nodes
                sound.connect(gain);
                gain.connect(audioContext.destination);
                
                // Play the sound
                sound.start();
                sound.stop(
                    audioContext.currentTime +
                        (type === 'gem' ? 0.1 : type === 'orb' ? 0.2 : 0.3)
                );
            }
        } catch (e) {
            console.error("Error playing sound:", e);
        }
    }

    // Helper function to create white noise for percussive sounds
    function createNoiseBuffer() {
        const bufferSize = audioContext.sampleRate * 0.2; // 0.2 seconds of noise
        const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
        const output = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            // Create white noise (random values between -1 and 1)
            output[i] = Math.random() * 2 - 1;
        }
        
        return buffer;
    }

    // Insert helper to spawn collectables between obstacles
    function spawnCollectableBetweenObstacles(prevObstacle, currObstacle) {
        // Check spawn probability from config
        if (Math.random() > CONFIG.collectibles.spawnRate) return;
        
        // Determine game phase by elapsed time and get probability distribution
        const t = gameStats.time;
        let phaseProbs;
        if (t <= 30) {
            // Early game phase (0-30 seconds)
            phaseProbs = CONFIG.collectibles.phases.early;
        } else if (t <= 90) {
            // Mid game phase (30-90 seconds)
            phaseProbs = CONFIG.collectibles.phases.mid;
        } else {
            // Late game phase (90+ seconds)
            phaseProbs = CONFIG.collectibles.phases.late;
        }
        
        // Pick a type based on configured probabilities
        let r = Math.random();
        let chosen = 'gem'; // Default to gem
        
        // Select collectible type based on probability distribution
        if (r < phaseProbs.gem) {
            chosen = 'gem';
        } else if (r < phaseProbs.gem + phaseProbs.orb) {
            chosen = 'orb';
        } else {
            chosen = 'star';
        }
        
        // Find the configuration for the chosen collectible type
        const collectibleConfig = CONFIG.collectibles.types.find(item => item.type === chosen);
        const collectRadius = collectibleConfig ? collectibleConfig.radius : 12;
        
        // Buffer from top/bottom edges from config
        const edgeBuffer = CONFIG.collectibles.edgeBuffer;
        const topLimit = edgeBuffer + collectRadius;
        const bottomLimit = canvas.height - edgeBuffer - collectRadius;
        
        // Try up to 10 times to pick a y position outside both obstacles' gaps
        let yPos;
        let found = false;
        for (let i = 0; i < 10; i++) {
            const candidate = topLimit + Math.random() * (bottomLimit - topLimit);
            if (!(
                (candidate > prevObstacle.gapStart && candidate < prevObstacle.gapEnd) ||
                (candidate > currObstacle.gapStart && candidate < currObstacle.gapEnd)
            )) {
                yPos = candidate;
                found = true;
                break;
            }
        }
        if (!found) return; // skip collectible if no valid position found
        
        // Horizontal position calculation
        const spacing = CONFIG.obstacles.spawnDistance;
        const paddingX = obstacleWidth + 10;
        const offset = paddingX + Math.random() * Math.max(0, spacing - 2 * paddingX);
        const xPos = canvas.width + spacing - offset;
        
        // Push collectible with type-appropriate properties
        collectables.push({
            x: xPos,
            y: yPos,
            type: chosen,
            points: chosen === 'star' ? 10 : chosen === 'orb' ? 5 : 1,
            color: chosen === 'star' ? '#ffff00' : chosen === 'orb' ? '#8a2be2' : '#42f5a7',
            radius: collectRadius,
            collected: false,
            frame: 0,
            active: true
        });
    }
});
