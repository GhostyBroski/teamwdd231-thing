// =================================================================
//                      VIO GUESSER - MAIN.JS
// =================================================================

// --- CONSTANTS & DOM ELEMENTS ---
// CRITICAL: You MUST replace the placeholder below with your actual RAWG API key!
const API_KEY = "86e4d2cca2034df1bb2340b8279b47cd"; 
const BASE_URL = "https://api.rawg.io/api";

const ALL_ESRB_RATINGS = [
    "Everyone", "Everyone 10+", "Teen", "Mature", 
    "Adults Only", "Rating Pending"
];
const questionSequence = ['platforms', 'creators', 'year', 'reviews', 'esrb', 'playtime'];

// DOM Elements used across game logic
const mainScreen = document.getElementById('screen');
const buttonContainer = document.querySelector('.container'); 
const buttons = [
    document.getElementById('Q1'), 
    document.getElementById('Q2'), 
    document.getElementById('Q3')
];
const genreGrid = document.getElementById('genre-grid');
const reviewList = document.getElementById('review-list');


// ------------------- Genre Toggle (EXISTING FUNCTIONALITY) -------------------
window.addEventListener('load', () => {
    const toggleBtn = document.getElementById('toggle-genres');
    const divider = document.getElementById('divider1');
    const containers = document.querySelectorAll('.genre-container');

    // --- Initial state ---
    divider.classList.remove('collapsed'); 
    containers.forEach(container => container.classList.remove('hidden'));
    if (toggleBtn) toggleBtn.textContent = '▲ Show Less'; // Added check for safety

    // --- Click toggle handler ---
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            const isCollapsed = divider.classList.contains('collapsed');
            divider.classList.toggle('collapsed', !isCollapsed);
            containers.forEach(container =>
                container.classList.toggle('hidden', !isCollapsed)
            );
            toggleBtn.textContent = isCollapsed ? '▲ Show Less' : '▼ Show More';
        });
    }
});


// ------------------- Review Panel & Reset (EXISTING FUNCTIONALITY FIX) -------------------
// CRITICAL FIX: Ensure these listeners are defined outside of any other load/init function
const reviewBtn = document.getElementById('review-btn');
const reviewPanel = document.getElementById('review-panel');
const overlay = document.getElementById('review-overlay');
const closeReview = document.getElementById('close-review');
const resetBtn = document.getElementById('reset-btn');

if (reviewBtn) {
    reviewBtn.addEventListener('click', () => {
        updateReviewPanel();
        reviewPanel.style.display = 'block';
        overlay.style.display = 'block';
    });
}

if (closeReview) {
    closeReview.addEventListener('click', () => {
        reviewPanel.style.display = 'none';
        overlay.style.display = 'none';
    });
}

if (overlay) {
    overlay.addEventListener('click', () => {
        reviewPanel.style.display = 'none';
        overlay.style.display = 'none';
    });
}

if (resetBtn) {
    resetBtn.addEventListener('click', () => {
        // Use custom modal for confirmation instead of alert/confirm
        if (window.confirm("Are you sure you want to reset your progress?")) {
            localStorage.clear();
            location.reload();
        }
    });
}


// ------------------- Compact Mode (EXISTING FUNCTIONALITY) -------------------
(function () {
    const COMPACT_BREAK_HEIGHT = 600; 
    const COMPACT_BREAK_WIDTH = 768; 

    function checkCompactMode() {
        const isCompact = window.innerHeight <= COMPACT_BREAK_HEIGHT || window.innerWidth <= COMPACT_BREAK_WIDTH;
        document.body.classList.toggle("compact", isCompact);
    }

    window.addEventListener("load", () => setTimeout(checkCompactMode, 100)); 
    window.addEventListener("resize", () => {
        clearTimeout(window._resizeTimeout);
        window._resizeTimeout = setTimeout(checkCompactMode, 150);
    });
})();


// ------------------- Force "Show Less" (EXISTING FUNCTIONALITY) -------------------
window.addEventListener("load", () => {
    const toggleBtn = document.getElementById("toggle-genres");
    if (toggleBtn) toggleBtn.textContent = "Show Less";
});

// ------------------- Login Redirect (EXISTING FUNCTIONALITY) -------------------
const form = document.getElementById("login-register");

if (form) {
    form.addEventListener("submit", (event) => {
        event.preventDefault();

        const username = document.getElementById("username").value.trim();
        const password = document.getElementById("password").value;

        if (!username || !password) {
            // Use console error instead of alert
            console.error("Please enter both username and password.");
            return;
        }

        const users = JSON.parse(localStorage.getItem("users") || "{}");

        if (users[username]) {
            if (users[username] === password) {
                console.log("Login successful!");
            } else {
                console.error("Incorrect password.");
                return;
            }
        } else {
            users[username] = password;
            localStorage.setItem("users", JSON.stringify(users));
            console.log("Account registered successfully!");
        }

        localStorage.setItem("loggedInUser", username);
        window.location.href = "index.html";
    });
}


// =================================================================
//                      VIO GUESSER - QUIZ CORE
// =================================================================

// --- STATE MANAGEMENT ---
let gameState = {
    correctGame: null,
    distractorGames: [],
    currentGenre: '',
    userAnswers: {} 
};

// --- API FETCH HELPERS (FIXED: Centralized Key Injection and Error Handling) ---
async function safeFetch(endpoint) {
    const url = `${BASE_URL}${endpoint}&key=${API_KEY}`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            // Log the error response status for diagnosis
            console.error(`API Error for ${endpoint}: Status ${response.status} - Check your API_KEY!`);
            return null;
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(`Fetch failed for ${endpoint}:`, error);
        return null;
    }
}

async function fetchGamesList(genreSlug) {
    let endpoint = `/games?genres=${genreSlug}&page_size=40&ordering=-rating`; 
    const data = await safeFetch(endpoint);
    return data ? data.results || [] : [];
}

async function fetchGameDetails(gameId) {
    let endpoint = `/games/${gameId}?`; 
    return await safeFetch(endpoint);
}

async function fetchScreenshots(gameId) {
    let endpoint = `/games/${gameId}/screenshots?`;
    const data = await safeFetch(endpoint);
    // FIX: Return the entire data object, not just data.results. 
    // The calling function (generateFinalGuess) needs the full response object
    // to correctly check for 'results.length'.
    return data;
}


// --- CORE HELPERS ---

// Utility for shuffling simple string answers and assigning correctness
function formatAndShuffleAnswers(correctAnswer, wrongAnswers) {
    const options = [
        { value: String(correctAnswer), isCorrect: true },
        { value: String(wrongAnswers[0]), isCorrect: false },
        { value: String(wrongAnswers[1]), isCorrect: false }
    ];

    for (let i = options.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [options[i], options[j]] = [options[j], options[i]];
    }
    return options;
}

// Utility for shuffling complex objects (used for final game guess)
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function saveGameState() {
    const minimalState = {
        correctGameId: gameState.correctGame ? gameState.correctGame.id : null,
        correctGameName: gameState.correctGame ? gameState.correctGame.name : null,
        userAnswers: gameState.userAnswers,
    };
    localStorage.setItem('vioGuesserState', JSON.stringify(minimalState));
}

function getReviewStatus(score) {
    if (score === null || score === undefined) return "Rating Unavailable";
    if (score >= 75) return "Positive Reviews";
    if (score >= 50) return "Mixed Reviews";
    return "Negative Reviews";
}

function getPlaytimeRange(hours) {
    if (hours === 0) return "Less than 5 Hours";
    if (hours <= 10) return "5 - 10 Hours";
    if (hours <= 25) return "10 - 25 Hours";
    if (hours <= 50) return "25 - 50 Hours";
    if (hours <= 80) return "50 - 80 Hours";
    return "Over 80 Hours";
}

// --- INITIALIZATION ---
async function initializeGame(genreSlug) {
    gameState = { correctGame: null, distractorGames: [], currentGenre: genreSlug, userAnswers: {} };
    
    // 1. Fetch a pool of games
    const gamePool = await fetchGamesList(genreSlug);
    if (!gamePool || gamePool.length < 3) {
        console.error("Initialization Failed: Insufficient games in the pool for genre:", genreSlug);
        // Use console error instead of alert
        console.error("Not enough unique games found for this genre! Please choose another.");
        genreGrid.style.display = 'flex'; // Show genres again
        return; 
    } 

    // 2. Select and fetch the target game details
    // FIX: Changed misspelled 'ńst.random()' to 'Math.random()'
    const randomIndex = Math.floor(Math.random() * gamePool.length);
    const targetGameId = gamePool[randomIndex].id;
    
    gameState.correctGame = await fetchGameDetails(targetGameId);
    
    if (!gameState.correctGame || !gameState.correctGame.id) {
        console.error("Initialization Failed: Could not retrieve details for the target game ID:", targetGameId);
        // Use console error instead of alert
        console.error("There was an error loading the game details. Please try another genre.");
        genreGrid.style.display = 'flex'; 
        return;
    }
    
    // 3. Select and fetch distractor game details (Limit to 2)
    const availableDistractors = gamePool.filter(game => game.id !== targetGameId);
    let distractorIds = [];
    while(distractorIds.length < 2 && availableDistractors.length > distractorIds.length) {
        const dIndex = Math.floor(Math.random() * availableDistractors.length);
        const distractorId = availableDistractors[dIndex].id;
        if (!distractorIds.includes(distractorId)) distractorIds.push(distractorId);
    }
    
    gameState.distractorGames = [];
    for (const id of distractorIds.slice(0, 2)) {
        const details = await fetchGameDetails(id);
        if (details) gameState.distractorGames.push(details);
    }

    // 4. Update UI and start the first question
    genreGrid.style.display = 'none';
    mainScreen.style.display = 'flex'; 
    buttonContainer.style.display = 'flex'; 
    buttons.forEach(btn => btn.style.display = 'block'); 
    
    console.log("Game initialized successfully with target:", gameState.correctGame.name);
    
    // CRITICAL: Start the platforms question which handles skipping if data is missing
    await generateQuestion('platforms'); 
}


// --- ANSWER HANDLING & PROGRESSION (FIXED: Added async/await) ---
async function handleAnswer(questionId, isCorrect, chosenValue) {
    gameState.userAnswers[questionId] = {
        chosen: chosenValue,
        isCorrect: isCorrect,
    };
    saveGameState(); 
    updateReviewPanel(); 

    const currentIndex = questionSequence.indexOf(questionId);
    buttons.forEach(btn => btn.disabled = true);
    
    // Add a slight pause for visual feedback
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (currentIndex < questionSequence.length - 1) {
        await generateQuestion(questionSequence[currentIndex + 1]);
    } else {
        await generateFinalGuess();
    }
    buttons.forEach(btn => btn.disabled = false);
}

function submitFinalGuess(chosenGameId) {
    if (chosenGameId === gameState.correctGame.id) {
        endGame('win');
    } else {
        endGame('loss');
    }
}

function endGame(result) {
    buttons.forEach(btn => btn.disabled = true);
    buttonContainer.style.display = 'none'; 

    
    mainScreen.innerHTML = `
        <h2>${result === 'win' ? '🎉 CONGRATULATIONS! YOU GUESSED IT!' : '😭 GAME OVER!'}</h2>
        <p>The correct game was: <strong>${gameState.correctGame.name}</strong></p>
        <p>${result === 'loss' ? 'You must restart to try again.' : ''}</p>
        <button class="final-guess-btn" onclick="location.reload()">Start New Game</button>
    `;
    
    localStorage.removeItem('vioGuesserState'); 
}


// =================================================================
//                    QUESTION GENERATION FUNCTIONS (FIXED: Bold Formatting)
// =================================================================

async function generatePlatformsQuestion() {
    const { correctGame, distractorGames } = gameState;
    
    // CRITICAL FIX: Skip if platform data is missing
    if (!correctGame.platforms || correctGame.platforms.length === 0) {
        console.warn("Skipping 'platforms' question due to missing data for the game.");
        // Use handleAnswer to move to the next question and update state
        await handleAnswer('platforms', true, 'Skipped (Data Missing)'); 
        return;
    }

    const correctPlatforms = correctGame.platforms.map(p => p.platform.name).join(', ');
    
    // Ensure distractors also have platforms before using them
    const wrongPlatforms = distractorGames.map(game => 
        game.platforms && game.platforms.length > 0 ? game.platforms.map(p => p.platform.name).join(', ') : 'Various Platforms'
    );
    
    const answers = formatAndShuffleAnswers(correctPlatforms, wrongPlatforms);
    // FIXED: Using <strong> instead of ** to fix display issue
    renderQuestion(`What <strong>platforms</strong> was the game released on?`, answers, 'platforms');
}

function generateCreatorsQuestion() {
    const { correctGame, distractorGames } = gameState;
    const getPrimaryCreator = (game) => game.developers?.[0]?.name || game.publishers?.[0]?.name || "Unknown Studio";

    const correctCreator = getPrimaryCreator(correctGame);
    const wrongCreators = distractorGames.map(game => getPrimaryCreator(game)).slice(0, 2);
    
    const answers = formatAndShuffleAnswers(correctCreator, wrongCreators);
    // FIXED: Using <strong> instead of ** to fix display issue
    renderQuestion(`Who was the <strong>Primary Creator (Developer)</strong> of this game?`, answers, 'creators');
}

function generateReleaseYearQuestion() {
    const { correctGame, distractorGames } = gameState;
    const correctYear = correctGame.released ? parseInt(correctGame.released.substring(0, 4)) : 0;
    if (!correctYear) return generateQuestion('reviews'); 

    let wrongAnswers = new Set();
    distractorGames.forEach(game => {
        if (game.released) {
            const year = parseInt(game.released.substring(0, 4));
            if (year !== correctYear) wrongAnswers.add(year);
        }
    });

    let offset = 1;
    while (wrongAnswers.size < 2 && offset < 5) {
        const year1 = correctYear - offset; 
        const year2 = correctYear + offset;
        if (year1 > 1980) wrongAnswers.add(year1);
        if (year2 < new Date().getFullYear()) wrongAnswers.add(year2);
        offset++;
    }
    
    const wrongAnswersArray = Array.from(wrongAnswers).slice(0, 2);
    const answers = formatAndShuffleAnswers(String(correctYear), wrongAnswersArray.map(String));
    // FIXED: Using <strong> instead of ** to fix display issue
    renderQuestion(`What <strong>Year</strong> was the game originally released?`, answers, 'year');
}

function generateRatingQuestion() {
    const { correctGame } = gameState;
    const allStatuses = ["Positive Reviews", "Mixed Reviews", "Negative Reviews"];
    const correctStatus = getReviewStatus(correctGame.metacritic);

    let wrongAnswers = allStatuses.filter(status => status !== correctStatus);
    if (correctStatus === "Rating Unavailable") wrongAnswers = ["Positive Reviews", "Mixed Reviews"];
    
    const answers = formatAndShuffleAnswers(correctStatus, wrongAnswers.slice(0, 2));
    // FIXED: Using <strong> instead of ** to fix display issue
    renderQuestion(`Based on its Metacritic score, does the game have <strong>Positive, Mixed, or Negative Reviews</strong>?`, answers, 'reviews');
}

function generateEsrbRatingQuestion() {
    const { correctGame, distractorGames } = gameState;
    const correctRating = correctGame.esrb_rating?.name || "Rating Pending"; 
    const distractorRatings = distractorGames.map(game => game.esrb_rating?.name || "Rating Pending");
    
    let wrongAnswers = [];
    if (distractorRatings[0] !== correctRating) wrongAnswers.push(distractorRatings[0]);
    if (wrongAnswers.length < 2 && distractorRatings[1] !== correctRating && distractorRatings[1] !== wrongAnswers[0]) wrongAnswers.push(distractorRatings[1]);
    
    let fallbackIndex = 0;
    while (wrongAnswers.length < 2) {
        const fallbackRating = ALL_ESRB_RATINGS[fallbackIndex % ALL_ESRB_RATINGS.length];
        if (fallbackRating !== correctRating && !wrongAnswers.includes(fallbackRating)) {
            wrongAnswers.push(fallbackRating);
        }
        fallbackIndex++;
    }

    const answers = formatAndShuffleAnswers(correctRating, wrongAnswers);
    // FIXED: Using <strong> instead of ** to fix display issue
    renderQuestion(`What <strong>ESRB Rating</strong> does the game have?`, answers, 'esrb');
}

function generatePlaytimeQuestion() {
    const { correctGame } = gameState;
    const correctPlaytime = correctGame.playtime || 0;
    const correctRange = getPlaytimeRange(correctPlaytime);
    const allPlaytimeRanges = [
        "Less than 5 Hours", "5 - 10 Hours", "10 - 25 Hours", 
        "25 - 50 Hours", "50 - 80 Hours", "Over 80 Hours"
    ];

    const finalWrongAnswers = allPlaytimeRanges
        .filter(range => range !== correctRange)
        .slice(0, 2);

    const answers = formatAndShuffleAnswers(correctRange, finalWrongAnswers);
    // FIXED: Using <strong> instead of ** to fix display issue
    renderQuestion(`Approximately how many <strong>hours</strong> does it take to finish the main story?`, answers, 'playtime');
}

// --- FINAL GUESS STAGE (FIXED: Data Handling and UI) ---
async function generateFinalGuess() {
    const { correctGame, distractorGames } = gameState;
    
    const allGames = [correctGame, ...distractorGames].filter(g => g);

    // 1. Fetch Screenshots
    const screenshotPromises = allGames.map(game => fetchScreenshots(game.id));
    const allScreenshots = await Promise.all(screenshotPromises);
    
    const finalOptions = allGames.map((game, index) => {
        // Accessing the first screenshot's image URL. Fallback to a placeholder.
        const screenshotUrl = allScreenshots[index] && allScreenshots[index].results.length > 0
            ? allScreenshots[index].results[0].image 
            : `https://placehold.co/300x169/2d3748/cbd5e0?text=NO+IMAGE`;
            
        return {
            id: game.id,
            name: game.name,
            screenshot: screenshotUrl
        };
    });

    // 2. Shuffle the options (Using the new, general shuffle utility)
    const shuffledOptions = shuffleArray(finalOptions);

    // 3. Render the Final Guess UI
    mainScreen.innerHTML = '<h2>Which game is the correct answer?</h2><div id="final-guess-container"></div>';
    
    const finalGuessContainer = document.getElementById('final-guess-container');
    
    // FIXED: game is now a clean object {id, name, screenshot}
    finalGuessContainer.innerHTML = shuffledOptions.map(game => `
        <button class="final-guess-btn final-game-option" data-game-id="${game.id}">
            <div class="game-image-wrapper">
                <img src="${game.screenshot}" alt="${game.name} screenshot" onerror="this.onerror=null; this.src='https://placehold.co/300x169/2d3748/cbd5e0?text=Image+Unavailable';">
            </div>
            <span class="game-name">${game.name}</span>
        </button>
    `).join('');
    
    // 4. Attach click handlers
    document.querySelectorAll('.final-guess-btn').forEach(element => {
        element.onclick = () => {
            const chosenId = parseInt(element.getAttribute('data-game-id'));
            submitFinalGuess(chosenId);
        };
    });
    
    buttonContainer.style.display = 'none'; 
}

// --- QUIZ FLOW ORCHESTRATION ---
async function generateQuestion(questionId) {
    genreGrid.style.display = 'none';
    mainScreen.style.display = 'flex'; 

    buttonContainer.style.display = 'flex';
    buttons.forEach(btn => btn.style.display = 'block');

    switch (questionId) {
        case 'platforms':
            await generatePlatformsQuestion(); 
            break;
        case 'creators':
            generateCreatorsQuestion();
            break;
        case 'year':
            generateReleaseYearQuestion();
            break;
        case 'reviews':
            generateRatingQuestion();
            break;
        case 'esrb':
            generateEsrbRatingQuestion();
            break;
        case 'playtime':
            generatePlaytimeQuestion();
            break;
        default:
            console.error("Invalid question ID:", questionId);
    }
}


// --- UI RENDERING & REVIEW PANEL ---
function renderQuestion(questionText, answers, questionId) {
    // QUESTION: innerHTML handles the <strong> tags correctly now.
    mainScreen.innerHTML = `<h2>${questionText}</h2>`;
    buttons.forEach(btn => btn.classList.remove('answered-correct', 'answered-wrong'));

    buttons.forEach((button, index) => {
        const option = answers[index];
        // CRITICAL CHECK: Ensure the option exists before accessing its properties
        button.textContent = option ? option.value : `Option ${index + 1} (Error)`; 
        button.onclick = () => {
            buttons.forEach(btn => btn.classList.remove('answered-correct', 'answered-wrong'));
            // Safety check for option existence
            if (option) {
                button.classList.add(option.isCorrect ? 'answered-correct' : 'answered-wrong');
                handleAnswer(questionId, option.isCorrect, option.value);
            } else {
                console.error("Attempted to handle click on an undefined option.");
            }
        };
    });
}

function updateReviewPanel() {
    const answers = gameState.userAnswers;
    const items = [];

    const questionLabels = {
        'platforms': 'Platforms',
        'creators': 'Creators',
        'year': 'Release Year',
        'reviews': 'Review Status',
        'esrb': 'ESRB Rating',
        'playtime': 'Playtime'
    };

    for (const key of questionSequence) {
        const answer = answers[key];
        const label = questionLabels[key] || key;
        
        if (answer) {
            const icon = answer.isCorrect ? '✅' : '❌';
            items.push(`
                <li>
                    <span class="review-icon">${icon}</span> 
                    <span class="review-label">${label}:</span> 
                    <span class="review-answer">${answer.chosen}</span>
                </li>
            `);
        } else if (gameState.correctGame) {
             items.push(`<li><span class="review-icon">❓</span> <span class="review-label">${label}:</span> <span class="review-answer">Pending...</span></li>`);
        }
    }

    if (items.length > 0) {
        reviewList.innerHTML = items.join('');
    } else {
        reviewList.innerHTML = '<li>No prompts yet! Select a genre to begin.</li>';
    }
}


// --- GENRE BUTTON HANDLERS ---
const genreMap = {
    'Action': 'action',
    'Adventure': 'adventure',
    'Horror': 'horror', // Use 'horror' genre slug
    'Puzzle': 'puzzle',
    'Strategy': 'strategy',
    'RPG': 'role-playing-games', 
    'Sports': 'sports',
    'Racing': 'racing',
    'Simulation': 'simulation'
};

document.querySelectorAll('.genre-btn').forEach(button => {
    button.addEventListener('click', (e) => {
        const genreName = e.target.textContent.trim();
        const genreSlug = genreMap[genreName];
        if (genreSlug) {
            initializeGame(genreSlug);
        } else {
            console.error(`Missing slug for genre: ${genreName}`);
        }
    });
});

// --- LOAD STATE ON STARTUP ---
window.addEventListener('load', () => {
    const savedState = localStorage.getItem('vioGuesserState');
    if (savedState) {
        const minimalState = JSON.parse(savedState);
        gameState.userAnswers = minimalState.userAnswers || {};
        updateReviewPanel();
        
        if (minimalState.correctGameId) {
            console.log("Previous game progress found. Check Review panel.");
        }
    }
});