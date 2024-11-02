// effects.js

function initializeSpecialEffects(effects) {
    logDebug('Initializing special effects', effects);
    
    try {
        const effectsList = Array.isArray(effects) ? effects : JSON.parse(effects);
        
        if (!Array.isArray(effectsList)) {
            logError('Effects initialization', new Error('Effects must be an array'));
            return;
        }

        effectsList.forEach(effect => {
            logDebug('Processing effect', effect);
            switch (effect) {
                case 'snow':
                    initializeSnowEffect();
                    break;
                case 'mountains':
                    initializeMountainEffect();
                    break;
                case 'clouds':
                    initializeCloudEffect();
                    break;
                default:
                    logDebug('Unknown effect', effect);
            }
        });
    } catch (error) {
        logError('Effects initialization', error);
    }
}

function initializeSnowEffect() {
    try {
        const container = document.getElementById('special-effects-container');
        logDebug('Snow container', container);

        const snowflakeChars = ['❅', '❆', '❄'];
        const numberOfSnowflakes = 50;

        function createSnowflake() {
            try {
                const snowflake = document.createElement('div');
                snowflake.className = 'snowflake';
                snowflake.textContent = snowflakeChars[Math.floor(Math.random() * snowflakeChars.length)];
                snowflake.style.left = `${Math.random() * 100}vw`;
                snowflake.style.fontSize = `${Math.random() * (24 - 12) + 12}px`;
                snowflake.style.opacity = Math.random();
                
                const duration = Math.random() * (15 - 5) + 5;
                snowflake.style.animationDuration = `${duration}s`;
                
                container.appendChild(snowflake);
                logDebug('Created snowflake', {
                    position: snowflake.style.left,
                    size: snowflake.style.fontSize,
                    duration: snowflake.style.animationDuration
                });

                snowflake.addEventListener('animationend', () => {
                    snowflake.remove();
                    createSnowflake();
                });
            } catch (error) {
                logError('Snowflake creation', error);
            }
        }

        for (let i = 0; i < numberOfSnowflakes; i++) {
            setTimeout(createSnowflake, Math.random() * 5000);
        }
    } catch (error) {
        logError('Snow effect initialization', error);
    }
}

function initializeMountainEffect() {
    try {
        const container = document.getElementById('special-effects-container');
        const mountainSVG = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        mountainSVG.setAttribute("viewBox", "0 0 1000 300");
        mountainSVG.classList.add("mountain-background");
        
        // Create parallax mountains with different depths
        const mountainPaths = [
            {
                color: "rgba(67, 56, 89, 0.7)",
                points: "0,300 200,100 400,250 600,80 800,220 1000,150 1000,300",
                speed: 0.2
            },
            {
                color: "rgba(52, 44, 70, 0.5)",
                points: "0,300 300,180 500,280 700,150 900,250 1000,200 1000,300",
                speed: 0.1
            },
            {
                color: "rgba(38, 32, 51, 0.3)",
                points: "0,300 250,220 450,300 650,200 850,280 1000,240 1000,300",
                speed: 0.05
            }
        ];

        mountainPaths.forEach(mountain => {
            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path.setAttribute("d", `M${mountain.points}`);
            path.setAttribute("fill", mountain.color);
            path.dataset.speed = mountain.speed;
            mountainSVG.appendChild(path);
        });

        container.appendChild(mountainSVG);

        // Add parallax effect on scroll
        window.addEventListener('scroll', () => {
            const scrolled = window.pageYOffset;
            mountainPaths.forEach((mountain, index) => {
                const path = mountainSVG.children[index];
                const yPos = -scrolled * path.dataset.speed;
                path.style.transform = `translateY(${yPos}px)`;
            });
        });

    } catch (error) {
        logError('Mountain effect initialization', error);
    }
}

function initializeCloudEffect() {
    try {
        const container = document.getElementById('special-effects-container');
        const numberOfClouds = 5;
        
        function createCloud() {
            const cloud = document.createElement('div');
            cloud.className = 'cloud';
            
            // Randomize cloud appearance and movement
            const size = Math.random() * (150 - 80) + 80;
            const top = Math.random() * 40; // Keep clouds in top 40% of screen
            const duration = Math.random() * (120 - 60) + 60;
            const delay = Math.random() * -60; // Negative delay for staggered start
            
            cloud.style.cssText = `
                width: ${size}px;
                height: ${size * 0.6}px;
                top: ${top}vh;
                animation: float ${duration}s linear infinite;
                animation-delay: ${delay}s;
            `;
            
            // Create cloud shape with multiple circles
            for (let i = 0; i < 5; i++) {
                const bubble = document.createElement('div');
                bubble.className = 'cloud-bubble';
                cloud.appendChild(bubble);
            }
            
            container.appendChild(cloud);
            
            // Remove cloud when it goes off screen
            cloud.addEventListener('animationend', () => {
                cloud.remove();
                createCloud(); // Create new cloud to maintain count
            });
        }
        
        // Initially create clouds
        for (let i = 0; i < numberOfClouds; i++) {
            createCloud();
        }
        
    } catch (error) {
        logError('Cloud effect initialization', error);
    }
}

// Add CSS for new effects directly to document
function addEffectStyles() {
    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
        .mountain-background {
            position: fixed;
            bottom: 0;
            left: 0;
            width: 100%;
            height: 60vh;
            z-index: 0;
            pointer-events: none;
        }
        
        .cloud {
            position: fixed;
            left: -150px;
            z-index: 1;
            pointer-events: none;
        }
        
        .cloud-bubble {
            position: absolute;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.4);
            box-shadow: 0 0 10px rgba(255, 255, 255, 0.2);
            backdrop-filter: blur(4px);
        }
        
        .cloud-bubble:nth-child(1) { width: 60%; height: 60%; left: 20%; top: 20%; }
        .cloud-bubble:nth-child(2) { width: 40%; height: 40%; left: 50%; top: 30%; }
        .cloud-bubble:nth-child(3) { width: 50%; height: 50%; left: 30%; top: 10%; }
        .cloud-bubble:nth-child(4) { width: 45%; height: 45%; left: 10%; top: 25%; }
        .cloud-bubble:nth-child(5) { width: 55%; height: 55%; left: 40%; top: 15%; }
        
        @keyframes float {
            from { transform: translateX(-150px); }
            to { transform: translateX(calc(100vw + 150px)); }
        }
        
        @media (prefers-reduced-motion: reduce) {
            .mountain-background,
            .cloud {
                animation: none !important;
                transform: none !important;
            }
        }
    `;
    document.head.appendChild(styleSheet);
}

// Initialize styles when the module loads
addEffectStyles();

// Export the initialization function
window.initializeSpecialEffects = initializeSpecialEffects;