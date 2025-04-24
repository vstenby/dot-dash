// Dot Dash Game Configuration
const CONFIG = {
    // Player settings
    player: {
        normalSpeed: 6,       // Base movement speed
        boostSpeed: 10,       // Speed when boosting
        exhaustedSpeed: 4.5,  // Reduced speed when dash is depleted
        boostDrain: 0.7,      // How quickly boost meter drains
        boostRegen: 0.2,      // How quickly boost meter refills
        boostRechargeThreshold: 50,  // Percent of boost needed to re-enable boost after depletion
        radius: 10            // Player radius in pixels
    },
    
    // Obstacle settings
    obstacles: {
        initialSpeed: 5,    // Increased from 4.5 to 5
        width: 30,            // Width of obstacle bars
        spawnDistance: 300,   // Fixed pixel spacing between obstacles
        
        // Gap settings
        initialGapSize: 150,  // Starting size of gaps
        minimumGapSize: 50,   // Minimum gap size (don't go below this)
        edgeMargin: 40        // Minimum margin from top/bottom for gaps
    },
    
    // Difficulty progression
    difficulty: {
        timeInterval: 15,     // Changed from 30 to 15 seconds between difficulty increases
        speedIncrease: 0.25,   // Increased from 0.2 to 0.25
        gapDecrease: 5,       // How much to shrink the gap each interval
        
        // Score-based difficulty (legacy, mostly replaced by time-based)
        pointSpeedupInterval: 5,  // Increase speed every X points
        gapShrinkInterval: 10,    // Shrink gap every X points
        gapShrinkRate: 1          // How much to shrink gap per interval
    },
    
    // Collectible settings
    collectibles: {
        spawnRate: 0.4,       // Probability (0-1) of spawning a collectible between obstacles
        edgeBuffer: 40,       // Buffer from top/bottom edges
        
        // Game phase collectible distributions
        phases: {
            early: {          // <= 30 seconds
                gem: 0.95,    // 1 point
                orb: 0.05,    // 5 points
                star: 0       // 10 points
            },
            mid: {            // 30-90 seconds
                gem: 0.8,
                orb: 0.15,
                star: 0.05
            },
            late: {           // > 90 seconds
                gem: 0.5,
                orb: 0.35,
                star: 0.15
            }
        },
        types: [
            { type: "gem", points: 1, color: "#00ff00", radius: 10, probability: 0.8 },
            { type: "orb", points: 5, color: "#0000ff", radius: 15, probability: 0.1 },
            { type: "star", points: 10, color: "#ffff00", radius: 25, probability: 0.1 }
        ]
    },
    
    // Game area
    boundary: {
        padding: 20,          // Padding from canvas edge
        lineWidth: 4          // Width of boundary line
    }
};

// Prevent modifications to the configuration object
Object.freeze(CONFIG);
Object.freeze(CONFIG.player);
Object.freeze(CONFIG.obstacles);
Object.freeze(CONFIG.difficulty);
Object.freeze(CONFIG.collectibles);
Object.freeze(CONFIG.collectibles.phases);
Object.freeze(CONFIG.collectibles.phases.early);
Object.freeze(CONFIG.collectibles.phases.mid);
Object.freeze(CONFIG.collectibles.phases.late);
Object.freeze(CONFIG.boundary);
Object.freeze(CONFIG.collectibles.types);