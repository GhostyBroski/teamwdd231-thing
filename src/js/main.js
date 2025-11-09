// =================================================================
//                      VIO GUESSER - MAIN.JS
//              (INTEGRATED AUTHENTICATION AND GAME CORE)
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

// DOM Elements used across application logic (Note: Many are queried in the main block)
const mainScreen = document.getElementById('screen');
const buttonContainer = document.querySelector('.container'); 
const buttons = [
    document.getElementById('Q1'), 
    document.getElementById('Q2'), 
    document.getElementById('Q3')
];
const genreGrid = document.getElementById('genre-grid');
const reviewList = document.getElementById('review-list');
const reviewOverlay = document.getElementById('review-overlay');


// --- GAME STATE MANAGEMENT ---
let gameState = {
    correctGame: null,
    distractorGames: [],
    currentGenre: '',
    userAnswers: {},
    loggedInUser: null // New state property for the authenticated user
};


// =================================================================
//                      NEW AUTH & UI FUNCTIONS
// =================================================================

/**
 * Toggles the visibility of the user panel and its overlay.
 */
function toggleUserPanel() {
    const userPanel = document.getElementById('user-panel');
    const userOverlay = document.getElementById('user-overlay');
    const hamburgerBtn = document.getElementById('hamburger');

    if (userPanel && userOverlay && hamburgerBtn) {
        userPanel.classList.toggle('open');
        userOverlay.classList.toggle('open');
        
        // Update ARIA attributes
        const isExpanded = userPanel.classList.contains('open');
        hamburgerBtn.setAttribute('aria-expanded', isExpanded);
    }
}

/**
 * Handles the user logout process (clears both game state and login state).
 */
function logoutUser() {
    console.warn("User initiated logout. Clearing game state and login session.");
    
    // Log out clears both keys: game state and user session
    localStorage.removeItem("loggedInUser"); 
    localStorage.removeItem('vioGuesserState'); 
    
    // CRITICAL: Redirects back to the login page
    window.location.href = 'login.html'; 
}

/**
 * Handles resetting the game progress without affecting the user's login session.
 */
function resetGameProgress() {
    console.warn("Game reset confirmed. Clearing Vio Guesser game state ONLY. Login session retained.");
    
    // 1. REMOVE ONLY THE GAME STATE KEY
    localStorage.removeItem('vioGuesserState');
    
    // 2. DO NOT remove "loggedInUser"
    
    // 3. Reload the page to restart the game
    location.reload();
}

/**
 * Initializes all necessary event listeners, including the revised Reset button logic.
 */
function setupPanelListeners() {
    // ------------------- USER PANEL LISTENERS -------------------
    const hamburgerBtn = document.getElementById('hamburger');
    const closePanelBtn = document.getElementById('close-user-panel');
    const userOverlay = document.getElementById('user-overlay');
    const panelLogoutBtn = document.getElementById('panel-logout-btn'); 
    
    if (hamburgerBtn) { hamburgerBtn.addEventListener('click', toggleUserPanel); }
    if (closePanelBtn) { closePanelBtn.addEventListener('click', toggleUserPanel); }
    if (userOverlay) { userOverlay.addEventListener('click', toggleUserPanel); }
    if (panelLogoutBtn) { panelLogoutBtn.addEventListener('click', logoutUser); }

    // ------------------- RESET CONFIRMATION LOGIC -------------------
    
    const resetBtn = document.getElementById('reset-btn');
    const confirmResetPanel = document.getElementById('confirm-reset-panel');
    const confirmResetOverlay = document.getElementById('confirm-reset-overlay');
    const confirmResetYes = document.getElementById('confirm-reset-yes');
    const confirmResetNo = document.getElementById('confirm-reset-no');

    // Helper function to show the reset modal
    function showResetModal() {
        if (confirmResetPanel && confirmResetOverlay) {
             confirmResetPanel.style.display = 'block';
             confirmResetOverlay.style.display = 'block';
             // Hide other panels if they are open (e.g., user panel)
             document.getElementById('user-panel')?.classList.remove('open');
             document.getElementById('user-overlay')?.classList.remove('open');
        }
    }

    // Helper function to hide the reset modal
    function hideResetModal() {
        if (confirmResetPanel && confirmResetOverlay) {
            confirmResetPanel.style.display = 'none';
            confirmResetOverlay.style.display = 'none';
        }
    }

    // 1. Show Confirmation Modal when 'Reset' is clicked
    if (resetBtn) {
        resetBtn.addEventListener('click', showResetModal);
    }
    // Also allow clicking the overlay to cancel
    if (confirmResetOverlay) {
        confirmResetOverlay.addEventListener('click', hideResetModal);
    }

    // 2. Hide Confirmation Modal (No/Cancel button)
    if (confirmResetNo) {
        confirmResetNo.addEventListener('click', hideResetModal); // Only hides, no reload/reset
    }

    // 3. Execute Reset (Yes button)
    if (confirmResetYes) {
        confirmResetYes.addEventListener('click', () => {
            // 1. Hide the modal immediately
            hideResetModal();
            
            // 2. Execute the game-only reset and reload
            resetGameProgress();
        });
    }

    // ------------------- REVIEW PANEL LOGIC -------------------
    const closeReview = document.getElementById('close-review');
    const reviewBtn = document.getElementById('review-btn');
    const reviewPanel = document.getElementById('review-panel');
    const reviewOverlay = document.getElementById('review-overlay');

    if (reviewBtn) { 
        reviewBtn.addEventListener('click', () => {
            // Logic to update and show review panel
            if (reviewPanel) reviewPanel.style.display = 'block';
            if (reviewOverlay) reviewOverlay.style.display = 'block';
        }); 
    }
    if (closeReview) { 
        closeReview.addEventListener('click', () => {
            if (reviewPanel) reviewPanel.style.display = 'none';
            if (reviewOverlay) reviewOverlay.style.display = 'none';
        }); 
    }
}

// Call the setup function when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', setupPanelListeners);

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


// =================================================================
//                      VIO GUESSER - QUIZ CORE
// =================================================================

// --- API FETCH HELPERS ---
async function safeFetch(endpoint) {
    const url = `${BASE_URL}${endpoint}&key=${API_KEY}`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
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
    return data;
}


// --- CORE HELPERS ---

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
        // Include username for future multi-user features
        user: gameState.loggedInUser 
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

// --- INITIALIZATION (Triggered by genre selection) ---
async function initializeGame(genreSlug) {
    // Reset state for new game
    gameState = { 
        correctGame: null, 
        distractorGames: [], 
        currentGenre: genreSlug, 
        userAnswers: {},
        loggedInUser: gameState.loggedInUser 
    };
    
    // 1. Fetch a pool of games
    const gamePool = await fetchGamesList(genreSlug);
    if (!gamePool || gamePool.length < 3) {
        console.error("Initialization Failed: Insufficient games in the pool for genre:", genreSlug);
        mainScreen.innerHTML = `<h2>Not enough unique games found for this genre! Please choose another.</h2>`;
        genreGrid.style.display = 'flex'; // Show genres again
        return; 
    } 

    // 2. Select and fetch the target game details
    const randomIndex = Math.floor(Math.random() * gamePool.length);
    const targetGameId = gamePool[randomIndex].id;
    
    gameState.correctGame = await fetchGameDetails(targetGameId);
    
    if (!gameState.correctGame || !gameState.correctGame.id) {
        console.error("Initialization Failed: Could not retrieve details for the target game ID:", targetGameId);
        mainScreen.innerHTML = `<h2>There was an error loading the game details. Please try another genre.</h2>`;
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
    
    // Start the platforms question which handles skipping if data is missing
    await generateQuestion('platforms'); 
}


// --- ANSWER HANDLING & PROGRESSION ---
async function handleAnswer(questionId, isCorrect, chosenValue) {
    gameState.userAnswers[questionId] = {
        chosen: chosenValue,
        isCorrect: isCorrect,
    };
    saveGameState(); 
    updateReviewPanel(); 

    const currentIndex = questionSequence.indexOf(questionId);
    buttons.forEach(btn => btn.disabled = true);
    
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

// --- END GAME FUNCTION ---
function endGame(result) {
    // 1. Update mainScreen content
    const resultText = result === 'win' ? 
        '<h2 style="font-size: 2.5rem; color: #48bb78; margin-bottom: 20px;">🎉 CONGRATULATIONS! YOU GUESSED IT!</h2>' : 
        '<h2 style="font-size: 2.5rem; color: #f56565; margin-bottom: 20px;">😭 GAME OVER!</h2>';
        
    mainScreen.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            ${resultText}
            <div style="margin-top: 10px;">
                <p style="font-size: 1.2rem; margin-bottom: 5px; font-weight: 500;">The correct game was:</p>
                <strong style="font-size: 1.8rem; color: #63b3ed;">${gameState.correctGame.name}</strong>
            </div>
            <p style="font-size: 1.1rem; margin-top: 30px; font-weight: 500;">
                Would you like to try again?
            </p>
        </div>
    `;

    // 2. Repurpose buttons for "Play Again?"
    buttonContainer.style.display = 'flex'; 
    buttonContainer.style.justifyContent = 'center'; 

    const restartButton = buttons[1]; 
    
    buttons[0].style.display = 'none';
    buttons[0].disabled = true;
    buttons[0].style.width = ''; 

    buttons[2].style.display = 'none';
    buttons[2].disabled = true;
    buttons[2].style.width = ''; 

    restartButton.textContent = 'Play Again?';
    restartButton.disabled = false;
    restartButton.onclick = () => {
        // Clear only the game state, keep the user logged in
        localStorage.removeItem('vioGuesserState'); 
        location.reload();
    };
    
    restartButton.style.width = '100px'; 
    restartButton.classList.remove('answered-correct', 'answered-wrong');
    restartButton.style.display = 'block';
    restartButton.style.minHeight = 'auto'; 
    restartButton.style.height = 'auto';
    restartButton.innerHTML = restartButton.textContent; 

    localStorage.removeItem('vioGuesserState'); 
}


// --- QUESTION GENERATION FUNCTIONS ---

async function generatePlatformsQuestion() {
    const { correctGame } = gameState;
    
    if (!correctGame.platforms || correctGame.platforms.length === 0) {
        console.warn("Skipping 'platforms' question due to missing data for the game.");
        await handleAnswer('platforms', true, 'Skipped (Data Missing)'); 
        return;
    }

    const correctPlatforms = correctGame.platforms.map(p => p.platform.name).join(', ');
    
    const wrongPlatforms = gameState.distractorGames.map(game => 
        game.platforms && game.platforms.length > 0 ? game.platforms.map(p => p.platform.name).join(', ') : 'Various Platforms'
    );
    
    const answers = formatAndShuffleAnswers(correctPlatforms, wrongPlatforms);
    renderQuestion(`What <strong>platforms</strong> was the game released on?`, answers, 'platforms');
}

function generateCreatorsQuestion() {
    const { correctGame } = gameState;
    const getPrimaryCreator = (game) => game.developers?.[0]?.name || game.publishers?.[0]?.name || "Unknown Studio";

    const correctCreator = getPrimaryCreator(correctGame);
    const wrongCreators = gameState.distractorGames.map(game => getPrimaryCreator(game)).slice(0, 2);
    
    const answers = formatAndShuffleAnswers(correctCreator, wrongCreators);
    renderQuestion(`Who was the <strong>Primary Creator (Developer)</strong> of this game?`, answers, 'creators');
}

function generateReleaseYearQuestion() {
    const { correctGame } = gameState;
    const correctYear = correctGame.released ? parseInt(correctGame.released.substring(0, 4)) : 0;
    if (!correctYear) return generateQuestion('reviews'); 

    let wrongAnswers = new Set();
    gameState.distractorGames.forEach(game => {
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
    renderQuestion(`What <strong>Year</strong> was the game originally released?`, answers, 'year');
}

function generateRatingQuestion() {
    const { correctGame } = gameState;
    const allStatuses = ["Positive Reviews", "Mixed Reviews", "Negative Reviews"];
    const correctStatus = getReviewStatus(correctGame.metacritic);

    let wrongAnswers = allStatuses.filter(status => status !== correctStatus);
    if (correctStatus === "Rating Unavailable") wrongAnswers = ["Positive Reviews", "Mixed Reviews"];
    
    const answers = formatAndShuffleAnswers(correctStatus, wrongAnswers.slice(0, 2));
    renderQuestion(`Based on its Metacritic score, does the game have <strong>Positive, Mixed, or Negative Reviews</strong>?`, answers, 'reviews');
}

function generateEsrbRatingQuestion() {
    const { correctGame } = gameState;
    const correctRating = correctGame.esrb_rating?.name || "Rating Pending"; 
    const distractorRatings = gameState.distractorGames.map(game => game.esrb_rating?.name || "Rating Pending");
    
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
    renderQuestion(`Approximately how many <strong>hours</strong> does it take to finish the main story?`, answers, 'playtime');
}

// --- FINAL GUESS STAGE ---
async function generateFinalGuess() {
    const { correctGame, distractorGames } = gameState;
    
    // Combine correct and distractor games
    const allGames = [correctGame, ...distractorGames].filter(g => g);

    // 1. Fetch Screenshots (Restored)
    const screenshotPromises = allGames.map(game => fetchScreenshots(game.id));
    const allScreenshots = await Promise.all(screenshotPromises);
    
    const finalOptions = allGames.map((game, index) => {
        // Accessing the first screenshot's image URL. Fallback to a placeholder.
        const screenshotUrl = allScreenshots[index] && allScreenshots[index].results && allScreenshots[index].results.length > 0
            ? allScreenshots[index].results[0].image 
            : `https://placehold.co/100x100/2d3748/cbd5e0?text=NO+IMAGE`;
            
        return {
            id: game.id,
            name: game.name,
            screenshot: screenshotUrl
        };
    });

    // Shuffle the options
    const shuffledOptions = shuffleArray(finalOptions);

    // 2. Render UI title (Centered to fix left misalignment)
    mainScreen.innerHTML = '<h2 style="text-align: center;">Which game is the correct answer?</h2>';
    
    // Ensure button container is visible (already done in generateQuestion flow)
    buttonContainer.style.display = 'flex'; 
    buttons.forEach(btn => {
        btn.style.display = 'block';
        btn.classList.remove('answered-correct', 'answered-wrong');
        btn.textContent = ''; // Clear previous text
        btn.style.width = ''; // CRITICAL FIX: Ensure width is cleared before this stage
    });


    // 3. Update the global buttons (Q1, Q2, Q3) content and logic
    buttons.forEach((button, index) => {
        const option = shuffledOptions[index];

        if (option) {
            // CRITICAL FIX: Only apply the minimum height for the card view here.
            button.style.minHeight = '220px'; 
            button.style.height = 'auto'; // Allow content to determine height

            // New styling for larger, circular image buttons, applied via inner HTML
            button.innerHTML = `
                <div style="
                    height: 100%; 
                    display: flex; 
                    flex-direction: column; 
                    justify-content: center; 
                    align-items: center; 
                    padding: 8px; /* Increased padding */
                    border-radius: 8px;
                    background-color: rgba(255, 255, 255, 0.05); /* Subtle background */
                ">
                    <img src="${option.screenshot}" alt="${option.name} screenshot" 
                         onerror="this.onerror=null; this.src='https://placehold.co/100x100/2d3748/cbd5e0?text=IMG';"
                         style="
                            width: 100px; 
                            height: 100px; 
                            object-fit: cover; 
                            border-radius: 50%; /* Circular image */
                            border: 4px solid #fff; /* White ring around image */
                            display: block; 
                            margin-bottom: 8px;
                            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                        ">
                    <span style="
                        display: block; 
                        font-weight: 700; /* Bold title */
                        font-size: 1.1em; /* Slightly larger text */
                        text-align: center; 
                        line-height: 1.3; 
                        max-height: 2.8em; 
                        overflow: hidden; 
                        text-overflow: ellipsis;
                        padding: 0 4px;
                    ">${option.name}</span>
                </div>
            `;
            
            // Assign final submission handler
            button.onclick = () => {
                submitFinalGuess(option.id);
            };
        } else {
            // Hide any unused buttons 
            button.style.display = 'none';
        }
    });
}

// --- QUIZ FLOW ORCHESTRATION ---
async function generateQuestion(questionId) {
    genreGrid.style.display = 'none';
    mainScreen.style.display = 'flex'; 

    buttonContainer.style.display = 'flex';
    buttonContainer.style.justifyContent = 'space-between';

    buttons.forEach(btn => {
        btn.style.display = 'block';
        btn.style.width = ''; 
        btn.style.minHeight = 'auto'; 
        btn.disabled = false; 
    });

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
    mainScreen.innerHTML = `<h2>${questionText}</h2>`;
    buttons.forEach(btn => {
        btn.classList.remove('answered-correct', 'answered-wrong');
        btn.style.minHeight = 'auto'; 
        btn.innerHTML = ''; 
    });

    buttons.forEach((button, index) => {
        const option = answers[index];
        button.textContent = option ? option.value : `Option ${index + 1} (Error)`; 
        button.onclick = () => {
            buttons.forEach(btn => btn.classList.remove('answered-correct', 'answered-wrong'));
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
    'Horror': 'horror', 
    'Puzzle': 'puzzle',
    'Strategy': 'strategy',
    'RPG': 'role-playing-games', 
    'Sports': 'sports',
    'Racing': 'racing',
    'Simulation': 'simulation'
};


// =================================================================
//                    MAIN APPLICATION INITIALIZATION
//                  (Runs when the DOM is fully loaded)
// =================================================================

document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. Element References for new/merged UI ---
    const loginRegisterForm = document.getElementById('login-register');
    const hamburgerBtn = document.getElementById('hamburger');
    const logoutBtn = document.getElementById('logout-btn');
    const userGreeting = document.getElementById('user-greeting');
    const closeUserPanelBtn = document.getElementById('close-user-panel');
    const userOverlay = document.getElementById('user-overlay');
    const toggleBtn = document.getElementById('toggle-genres');
    const divider = document.getElementById('divider1');
    const containers = document.querySelectorAll('.genre-container');
    const resetBtn = document.getElementById('reset-btn');

    // --- 2. Compact Mode (Original IIFE simplified and integrated) ---
    const COMPACT_BREAK_HEIGHT = 600; 
    const COMPACT_BREAK_WIDTH = 768; 

    function checkCompactMode() {
        const isCompact = window.innerHeight <= COMPACT_BREAK_HEIGHT || window.innerWidth <= COMPACT_BREAK_WIDTH;
        document.body.classList.toggle("compact", isCompact);
    }

    checkCompactMode(); // Check immediately on load
    window.addEventListener("resize", () => {
        clearTimeout(window._resizeTimeout);
        window._resizeTimeout = setTimeout(checkCompactMode, 150);
    });

    // --- 3. Authentication Check and Redirection Logic ---
    function checkAuthentication() {
        const loggedInUser = localStorage.getItem("loggedInUser");
        // Check if we are currently on the login page (based on the presence of the form)
        const currentPageIsLogin = !!loginRegisterForm;
        
        if (loggedInUser && currentPageIsLogin) {
            // Case 1: Logged in, but on the login page -> Redirect to game page
            window.location.href = 'index.html';
        } else if (!loggedInUser && !currentPageIsLogin) {
            // Case 2: NOT logged in, but on the game page -> Redirect to login page
            window.location.href = 'login.html';
        } else if (loggedInUser && !currentPageIsLogin) {
            // Case 3: Logged in and on the game page (index.html)
            gameState.loggedInUser = loggedInUser;
            if (userGreeting) {
                userGreeting.textContent = `Hi, ${loggedInUser}!`;
            }
            // Start the game-specific initialization and listeners
            initializeGameUI(); 
        }
    }
    
    // Function that runs only once the user is confirmed on index.html
    function initializeGameUI() {
        // --- A. Load Saved Game State (Your original logic) ---
        const savedState = localStorage.getItem('vioGuesserState');
        if (savedState) {
            const minimalState = JSON.parse(savedState);
            gameState.userAnswers = minimalState.userAnswers || {};
            updateReviewPanel();
            
            if (minimalState.correctGameId) {
                console.log("Previous game progress found. Check Review panel.");
            }
        }
        
        // --- B. Genre Toggle Listeners (Your original logic) ---
        if (toggleBtn) {
            // Set initial state (Force show less)
            divider.classList.add('collapsed'); 
            containers.forEach(container => container.classList.add('hidden'));
            toggleBtn.textContent = '▼ Show More'; 
            
            toggleBtn.addEventListener('click', () => {
                const isCollapsed = divider.classList.contains('collapsed');
                divider.classList.toggle('collapsed', !isCollapsed);
                containers.forEach(container =>
                    container.classList.toggle('hidden', !isCollapsed)
                );
                toggleBtn.textContent = isCollapsed ? '▲ Show Less' : '▼ Show More';
            });
        }
        
        // --- C. Game Button Listeners (Genre Select) ---
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
        
        // --- D. User Panel/Logout Listeners ---
        if (hamburgerBtn) {
            hamburgerBtn.addEventListener('click', toggleUserPanel);
            closeUserPanelBtn.addEventListener('click', toggleUserPanel);
            userOverlay.addEventListener('click', toggleUserPanel);
        }
        if (logoutBtn) {
            logoutBtn.addEventListener('click', logoutUser);
        }
        
        // --- E. Review Panel Listeners (Your original logic, simplified) ---
        if (reviewBtn && reviewPanel && reviewOverlay) {
            reviewBtn.addEventListener('click', () => {
                updateReviewPanel();
                reviewPanel.classList.add('open');
                reviewOverlay.classList.add('open');
            });

            closeReview.addEventListener('click', () => {
                reviewPanel.classList.remove('open');
                reviewOverlay.classList.remove('open');
            });

            reviewOverlay.addEventListener('click', () => {
                reviewPanel.classList.remove('open');
                reviewOverlay.classList.remove('open');
            });
        }
        
        // --- F. Reset Button Listener (Your original logic) ---
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                // IMPORTANT: Since we can't use window.confirm(), we'll use 
                // console log and proceed, but a custom modal is required for a real app.
                console.warn("Resetting game progress (clearing local state).");
                localStorage.removeItem('vioGuesserState'); // Only clear game state
                location.reload();
            });
        }
    }


    // --- 4. Login/Registration Handler (Only runs on login.html) ---
    if (loginRegisterForm) {
        loginRegisterForm.addEventListener("submit", (event) => {
            event.preventDefault();

            const username = document.getElementById("username").value.trim();
            const password = document.getElementById("password").value;

            if (!username || !password) {
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
            // *** CRITICAL LOGIN REDIRECT ***
            window.location.href = "index.html";
        });
    }

    // --- 5. Start the Application Flow ---
    checkAuthentication();
});