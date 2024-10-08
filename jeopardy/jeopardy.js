// Set constants for the API URL, number of categories, and clues per category
const API_URL = "https://rithm-jeopardy.herokuapp.com/api/";
const CATEGORY_TOTAL = 6;
const CLUES_PER_CATEGORY = 5;

// Initialize an array to store game categories and scores for each team
let gameCategories = [];
let teamScores = { 1: 0, 2: 0, 3: 0 };

/** 
 * Fetch CATEGORY_TOTAL random category IDs from the API 
 * - Makes an API request for 100 categories
 * - Randomly selects CATEGORY_TOTAL IDs from the list
 */
async function fetchCategoryIds() {
    try {
        // Request data from the API for 100 categories
        const response = await axios.get(`${API_URL}categories`, { params: { count: 100 } });
        // Map category data to an array of category IDs
        const ids = response.data.map(category => category.id);
        // Return a random sample of CATEGORY_TOTAL IDs
        return _.sampleSize(ids, CATEGORY_TOTAL);
    } catch (error) {
        console.error("Failed to fetch category IDs:", error);
    }
}

/** 
 * Fetch category data by ID and prepare clues for the game
 * - Retrieves a category by its ID
 * - Randomly selects CLUES_PER_CATEGORY clues and formats them
 */
async function fetchCategoryData(catId) {
    try {
        // Request data for a single category using its ID
        const response = await axios.get(`${API_URL}category`, { params: { id: catId } });
        // Randomly select CLUES_PER_CATEGORY clues and return formatted data
        const clues = _.sampleSize(response.data.clues, CLUES_PER_CATEGORY).map(clue => ({
            question: clue.question,
            answer: clue.answer,
            showing: null
        }));
        return { title: response.data.title, clues };
    } catch (error) {
        console.error("Failed to fetch category data:", error);
    }
}

/** 
 * Populate the game board with category headers, a values column, and clue cells
 * - Adds a header row with category titles
 * - Creates clue rows with a values column on the left side (100 to 500)
 */
async function createGameBoard() {
    // Clear previous table content
    $('#jeopardy thead, #jeopardy tbody').empty();

    // Create header row for the board with "Value" column and category headers
    const $headerRow = $("<tr>");
    $headerRow.append($("<th>").text("Value"));
    gameCategories.forEach(cat => {
        $headerRow.append($("<th>").text(cat.title));
    });
    $("#jeopardy thead").append($headerRow);

    // Create rows with values and cells for clues
    for (let i = 0; i < CLUES_PER_CATEGORY; i++) {
        const $row = $("<tr>");
        const value = (i + 1) * 100;
        $row.append($("<td>").text(value)); // Value column (100, 200, ...)

        gameCategories.forEach((_, catIndex) => {
            const $cell = $("<td>")
                .attr("id", `cell-${catIndex}-${i}`)
                .text("?")
                .addClass('clue-cell')
                .on("click", handleCellClick);
            $row.append($cell);
        });
        $("#jeopardy tbody").append($row);
    }
}

/** 
 * Handle the click event on a clue cell
 * - Reveals the question or answer based on the current state
 */
function handleCellClick(event) {
    const $cell = $(event.target); // Select clicked cell
    const [_, catIndex, clueIndex] = $cell.attr("id").split("-"); // Extract indexes
    const clue = gameCategories[catIndex].clues[clueIndex]; // Get clue data

    // If clue hasn't been shown, show the question
    if (!clue.showing) {
        $cell.text(clue.question);
        clue.showing = "question";
    } else if (clue.showing === "question") {
        $cell.text(clue.answer); // Show the answer after question
        clue.showing = "answer";
    }
}

/** 
 * Adjust the score for a team and update the leaderboard
 * - Adds or subtracts based on button click
 * - Updates the score display and recalculates rankings
 */
function adjustScore(event) {
    const team = $(event.target).data("team"); // Identify team
    const adjust = $(event.target).data("adjust"); // Identify add/subtract

    // Add or subtract 100 points based on the button clicked
    if (adjust === "add") {
        teamScores[team] += 100;
    } else if (adjust === "subtract") {
        teamScores[team] = Math.max(0, teamScores[team] - 100);
    }

    $(`#team-${team} .score`).text(teamScores[team]); // Update score display
    updateLeaderboard();
}

/** 
 * Update the leaderboard rankings based on scores
 * - Sorts teams by score and updates display
 * - Declares the team with the highest score as the winner
 */
function updateLeaderboard() {
    const sortedTeams = Object.keys(teamScores)
        .sort((a, b) => teamScores[b] - teamScores[a]);

    $("#rankings").empty();
    sortedTeams.forEach(team => {
        $("#rankings").append(`<li>Team ${team}: ${teamScores[team]}</li>`);
    });

    $("#winning-team-heading").text(`Winning Team: Team ${sortedTeams[0]}`);
}

/** 
 * Display the loading screen and clear current board data 
 */
function showLoading() {
    $('#jeopardy thead, #jeopardy tbody').empty();
    $('#loading-screen').show();
}

/** 
 * Hide the loading screen after data has been fetched 
 */
function removeLoading() {
    $('#loading-screen').hide();
}

/** 
 * Initialize and start the game
 * - Show the loading screen while fetching categories
 * - Populate the game board once data is ready
 * - Reset scores and update the scoreboard and leaderboard
 */
async function setupAndStartGame() {
    showLoading();
    teamScores = { 1: 0, 2: 0, 3: 0 }; // Reset team scores to 0
    $(".score").text("0"); // Display 0 scores initially
    updateLeaderboard();

    // Fetch and set up game categories
    const categoryIds = await fetchCategoryIds();
    gameCategories = [];
    for (const id of categoryIds) {
        gameCategories.push(await fetchCategoryData(id));
    }

    createGameBoard(); // Create game board with categories
    $('#winning-team-heading, #leaderboard, #complete-game-btn').show(); // Show game elements
    $('#game-board-screen').show();
    removeLoading(); // Hide loading screen
}

/** 
 * End the game and show final rankings
 * - Hide game board and display team rankings in #rankings-div
 */
function completeGame() {
    $('#game-board-screen').hide();
    const sortedTeams = Object.keys(teamScores).sort((a, b) => teamScores[b] - teamScores[a]);

    $('#final-rankings').empty();
    sortedTeams.forEach(team => {
        $('#final-rankings').append(`<li>Team ${team}: ${teamScores[team]} points</li>`);
    });

    $('#rankings-div').show(); // Show final rankings section
}

/** 
 * Return to start menu from rankings
 * - Hide rankings section and return to start screen
 */
function returnToMain() {
    $('#rankings-div').hide();
    $('#start-screen').show();
}

/** 
 * Set up event listeners for game navigation and score adjustments
 */
$(document).ready(function () {
    $('#start-screen').show(); // Show start screen on load
    $('#loading-screen, #game-board-screen, #rankings-div').hide();

    $('#start-game-btn').on('click', function () {
        $('#start-screen').hide();
        $('#loading-screen').show();

        setTimeout(() => {
            $('#loading-screen').hide();
            setupAndStartGame(); // Start game after loading
        }, 5000);
    });

    $('#restart-game-btn').on('click', function () {
        $('#game-board-screen').hide();
        $('#loading-screen').show();
        setTimeout(() => {
            $('#loading-screen').hide();
            setupAndStartGame(); // Restart game after loading
        }, 5000);
    });

    $('#complete-game-btn').on('click', completeGame); // Complete game
    $('#back-to-main-btn').on('click', returnToMain); // Return to start screen
    $('.adjust-score').on('click', adjustScore); // Adjust team scores
});