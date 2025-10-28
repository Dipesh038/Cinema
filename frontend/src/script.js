document.addEventListener("DOMContentLoaded", () => {
    // Check auth status and populate user menu
    checkAuthStatus();
    
    // 🎭 DOM Elements with null checks
    const elements = {
        // Containers
        classicContainer: document.getElementById("classic"),
        primeContainer: document.getElementById("prime"),
        moviesContainer: document.getElementById("moviesContainer"),
        datesContainer: document.getElementById("datesContainer"),
        bookingArea: document.getElementById("bookingSection"),
        summarySection: document.getElementById("summarySection"),
        mainFooter: document.querySelector(".footer"), // Main footer element
        noMoviesMessage: document.getElementById("noMoviesMessage"), // No movies message
        
        // Display Elements
        selectedCount: document.getElementById("selectedCount"),
        totalPrice: document.getElementById("totalPrice"),
        currentDate: document.getElementById("currentDate"),
        
        // Buttons
        bookBtn: document.getElementById("bookBtn"),
        prevDateBtn: document.getElementById("prevDate"),
        nextDateBtn: document.getElementById("nextDate"),
        closeModal: document.getElementById("closeModal"),
        downloadTicket: document.getElementById("downloadTicket"),
        
        // Modal Elements
        modalOverlay: document.getElementById("modalOverlay"),
        qrContainer: document.getElementById("qrcode"),
        seatListText: document.getElementById("seatListText"),
        ticketTotal: document.getElementById("ticketTotal"),
        ticketMovieTitle: document.getElementById("ticketMovieTitle"),
        ticketDate: document.getElementById("ticketDate"),
        ticketTime: document.getElementById("ticketTime"),
        ticketPoster: document.getElementById("ticketPoster"),
        
        // Movie Info Elements
        movieTitle: document.querySelector(".movie-info h1"),
        movieDetails: document.querySelector(".movie-info p")
    };

    // 🎟️ Constants - Load from localStorage or use defaults
    const PRICES = {
        CLASSIC: parseFloat(localStorage.getItem('classicPrice')) || 381.36,
        PRIME: parseFloat(localStorage.getItem('primePrice')) || 481.36
    };

    // 🎯 Footer Configuration - Minimum seats required to show footer
    const FOOTER_CONFIG = {
        MINIMUM_SEATS: 1, // Change this number to adjust when footer appears
        SHOW_HINTS: true  // Set to false to disable console hints
    };

    const STORAGE_KEYS = {
        SEAT_SELECTION: "movieSeatSelection",
        BOOKINGS: "movieBookings",
        SELECTED_MOVIE: "selectedMovie"
    };

    // ===== APPLICATION STATE =====
    let currentDateOffset = 0;
    let currentlySelectedMovie = null;
    let selectedSeats = new Set();
    let selectedDate = null;
    let selectedTime = null;

    // ===== DYNAMIC DATE SCROLLING FUNCTIONS =====
    function generateDates() {
        if (!elements.datesContainer) {
            console.warn("Dates container not found");
            return;
        }

        elements.datesContainer.innerHTML = '';
        
        updateDateNavigationButtons();
        
        for (let i = -2; i <= 2; i++) {
            const date = new Date();
            date.setDate(date.getDate() + currentDateOffset + i);
            
            const dateElement = createDateElement(date, i);
            elements.datesContainer.appendChild(dateElement);
        }
    }

    function createDateElement(date, index) {
        const dateElement = document.createElement('div');
        dateElement.className = 'date';

        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        const dayNumber = date.getDate();
        const monthName = date.toLocaleDateString('en-US', { month: 'short' });

        // Use class names that match styles.css (.day, .date-num, .month)
        dateElement.innerHTML = `
            <div class="day">${dayName}</div>
            <div class="date-num">${dayNumber}</div>
            <div class="month">${monthName}</div>
        `;

        // Handle date states (past, present, future)
        handleDateStates(dateElement, date, index);

        return dateElement;
    }

    function handleDateStates(dateElement, date, index) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const currentDate = new Date(date);
        currentDate.setHours(0, 0, 0, 0);
        
        // Disable past dates
        if (currentDate < today) {
            dateElement.classList.add('disabled');
            dateElement.style.opacity = '0.5';
            dateElement.style.pointerEvents = 'none';
            return;
        }
        
        // Set today as selected by default
        if (index === 0 && currentDateOffset === 0 && currentDate.getTime() === today.getTime()) {
            dateElement.classList.add('selected');
            updateCurrentDateDisplay(date);
        }
        
        // Add click event for future dates
        dateElement.addEventListener('click', function() {
            selectDate(this, date);
        });
    }

    function selectDate(dateElement, date) {
        document.querySelectorAll('.date').forEach(d => {
            d.classList.remove('selected');
        });
        dateElement.classList.add('selected');
        updateCurrentDateDisplay(date);
        
        // Update selected date and filter movies
        selectedDate = date;
        console.log("📅 Date selected:", selectedDate);
        console.log("📅 Formatted date:", formatDateForComparison(selectedDate));
        console.log("🔄 Triggering time update and movie filter refresh...");
        
        // Recompute time availability for this date, then filter
        updateShowtimes(movies);
        // filterAndDisplayMovies() is called inside updateShowtimes()
    }

    function updateDateNavigationButtons() {
        if (!elements.prevDateBtn) return;
        
        elements.prevDateBtn.disabled = currentDateOffset === 0;
        elements.prevDateBtn.style.opacity = currentDateOffset === 0 ? '0.5' : '1';
        elements.prevDateBtn.style.cursor = currentDateOffset === 0 ? 'not-allowed' : 'pointer';
    }

    function updateCurrentDateDisplay(date) {
        if (!elements.currentDate) return;
        
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const formattedDate = date.toLocaleDateString('en-US', options);
        elements.currentDate.textContent = formattedDate;
    }

    function navigateDates(direction) {
        if (direction === -1 && currentDateOffset === 0) return;
        
        currentDateOffset += direction;
        generateDates();
    }

    // ===== MOVIE MANAGEMENT =====

    // 🎥 Movies Data (will be fetched from backend)
    let movies = [];

    // API Endpoint
    const API_URL = 'http://localhost:3000/api';

    // 🚀 Initialize Application
    function init() {
        try {
            console.log("🚀 Initializing Movie Booking System...");
            console.log("DOM Elements found:", {
                moviesContainer: !!elements.moviesContainer,
                bookingArea: !!elements.bookingArea,
                summarySection: !!elements.summarySection
            });
            
            loadMovies();
            createSeats();
            loadFromLocalStorage();
            setupEventListeners();
            generateDates();
            setupDateNavigation();
            
            // Initially hide booking area and summary
            safelyHideElement(elements.bookingArea);
            safelyHideElement(elements.summarySection);
            
            // Ensure footer is completely hidden on page load
            if (elements.summarySection) {
                elements.summarySection.style.display = "none";
                elements.summarySection.classList.remove("visible");
                console.log("🚫 Cart footer hidden on page load");
            }
            
            // Ensure main footer is visible on page load
            showMainFooter();
            
            // Initialize selected date and time
            initializeSelectedDateTime();
            
            console.log("🎬 Movie Booking System initialized successfully");
        } catch (error) {
            console.error("❌ Initialization error:", error);
        }
    }

    function safelyHideElement(element) {
        if (element) {
            element.style.display = "none";
        }
    }

    // 🎥 Load Movies
    async function loadMovies() {
        console.log("🎬 Starting to load movies...");
        console.log("Movies container:", elements.moviesContainer);
        console.log("API URL:", API_URL);
        
        if (!elements.moviesContainer) {
            console.warn("❌ Movies container not found");
            return;
        }

        try {
            console.log("📡 Fetching movies from API...");
            const response = await fetch(`${API_URL}/movies`);
            
            console.log("📡 Response status:", response.status);
            console.log("📡 Response ok:", response.ok);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            movies = await response.json();
            console.log("🎬 Movies loaded:", movies.length, "movies");
            console.log("🎬 First movie:", movies[0]);

            // First, update showtimes based on loaded movies (this sets selectedTime)
            updateShowtimes(movies);
            
            // Then filter and display movies based on selected date and time
            // filterAndDisplayMovies() is already called inside updateShowtimes()
        } catch (error) {
            console.error("❌ Failed to fetch movies:", error);
            elements.moviesContainer.innerHTML = `<p style="color: #ff6b6b;">Could not load movies. Error: ${error.message}</p>`;
        }
    }

    // 🎯 Filter Movies Based on Date and Time
    function filterAndDisplayMovies() {
        if (!movies || movies.length === 0) {
            showNoMoviesMessage();
            return;
        }

        const filteredMovies = filterMoviesByDateTime(movies, selectedDate, selectedTime);

        if (filteredMovies.length === 0) {
            showNoMoviesMessage();
        } else {
            hideNoMoviesMessage();
            displayMovies(filteredMovies);
        }
    }

    // 🔍 Filter Movies by Date and Time
    function filterMoviesByDateTime(movies, date, time) {
        console.log(`🔍 Starting filter with date: ${date}, time: ${time}`);
        
        if (!movies || movies.length === 0) {
            console.log("🎬 No movies to filter");
            return [];
        }

        // STRICT filtering: Both date AND time must be selected
        if (!date || !time) {
            console.log("🎬 Date or time not selected, cannot filter properly");
            return [];
        }

        const selectedDateStr = formatDateForComparison(date);
        const selectedTimeStr = formatTimeForComparison(time);

        console.log(`🔍 STRICT filtering for date: ${selectedDateStr}, time: ${selectedTimeStr}`);

        const filteredMovies = movies.filter(movie => {
            const movieDate = movie.show_date;
            const movieTime = movie.showtime || movie.show_time;
            
            // Format movie date and time for comparison
            const movieDateStr = formatDateForComparison(movieDate);
            const movieTimeStr = formatTimeForComparison(movieTime);
            
            // STRICT match: Movie must have BOTH date and time that exactly match
            if (!movieDateStr || !movieTimeStr) {
                console.log(`🎬 Movie "${movie.name}": SKIPPED - missing date or time`);
                return false;
            }
            
            const dateMatch = movieDateStr === selectedDateStr;
            const timeMatch = movieTimeStr === selectedTimeStr;
            const isMatch = dateMatch && timeMatch;
            
            console.log(`🎬 Movie "${movie.name}": date=${movieDateStr} vs ${selectedDateStr} (${dateMatch}), time=${movieTimeStr} vs ${selectedTimeStr} (${timeMatch}) -> ${isMatch ? '✅ MATCH' : '❌ NO MATCH'}`);
            
            return isMatch;
        });

        console.log(`🎬 Filter result: ${filteredMovies.length} movies found for ${selectedDateStr} at ${selectedTimeStr}`);
        return filteredMovies;
    }

    // 📅 Format Date for Comparison
    function formatDateForComparison(date) {
        if (!date) return null;
        
        // Handle different date formats
        if (typeof date === 'string') {
            // If it's already a string in YYYY-MM-DD format, return as is
            if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
                return date;
            }
            // Handle ISO format dates (e.g., "2025-10-23T18:30:00.000Z")
            if (date.includes('T')) {
                return date.split('T')[0];
            }
            // Try to parse and format
            const parsedDate = new Date(date);
            return parsedDate.toISOString().split('T')[0];
        }
        
        // Handle Date object
        if (date instanceof Date) {
            return date.toISOString().split('T')[0];
        }
        
        console.warn("⚠️ Unknown date format:", date);
        return null;
    }

    // ⏰ Format Time for Comparison
    function formatTimeForComparison(time) {
        if (!time) return null;
        
        // Convert time to HH:MM:SS format for consistent comparison
        if (typeof time === 'string') {
            if (time.includes(':')) {
                const parts = time.split(':');
                // Ensure we have HH:MM:SS format
                if (parts.length === 2) {
                    return `${parts[0]}:${parts[1]}:00`;
                }
                if (parts.length === 3) {
                    return time; // Already in HH:MM:SS format
                }
            }
        }
        
        return time;
    }

    // 🎬 Display Movies
    function displayMovies(moviesToShow) {
        // Hide no movies message first
        hideNoMoviesMessage();
        
        // Clear only movie cards, preserve noMoviesMessage element
        const movieCards = elements.moviesContainer.querySelectorAll('.movie-card');
        movieCards.forEach(card => card.remove());
        
        // Add new movies
        moviesToShow.forEach((movie, index) => {
            console.log(`Creating card for movie ${index + 1}:`, movie.name);
            const card = createMovieCard(movie);
            elements.moviesContainer.appendChild(card);
        });
        console.log("✅ All movie cards created and added to DOM");
    }

    // 🚫 Show No Movies Message
    function showNoMoviesMessage() {
        console.log("🚫 showNoMoviesMessage called");
        
        // Clear any existing movie cards but keep the noMoviesMessage
        if (elements.moviesContainer) {
            // Remove all movie cards but keep the noMoviesMessage
            const movieCards = elements.moviesContainer.querySelectorAll('.movie-card');
            movieCards.forEach(card => card.remove());
            console.log("🧹 Cleared movie cards");
        }
        
        // Ensure noMoviesMessage element exists
        if (!elements.noMoviesMessage) {
            console.log("❌ noMoviesMessage element not found, re-querying...");
            elements.noMoviesMessage = document.getElementById("noMoviesMessage");
        }
        
        // Show the no movies message with contextual date/time info
        if (elements.noMoviesMessage) {
            const selDateText = selectedDate 
                ? new Date(selectedDate).toLocaleDateString('en-US', { day: '2-digit', month: 'short', weekday: 'short' })
                : 'selected date';
            
            const timeText = selectedTime ? (() => {
                const [h, m] = (selectedTime || '00:00:00').split(':');
                const hour = parseInt(h, 10);
                const ampm = hour >= 12 ? 'PM' : 'AM';
                const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
                return `${displayHour}:${m} ${ampm}`;
            })() : null;

            const messageHtml = `
                <h3>🎬 Movies are not available on this date</h3>
                <p>No movies are scheduled for ${selDateText}${timeText ? ` at ${timeText}` : ''}.</p>
                <p class="suggestion">Please try selecting a different date or time to see available movies.</p>
            `;
            elements.noMoviesMessage.innerHTML = messageHtml;
            elements.noMoviesMessage.classList.add("visible");
            elements.noMoviesMessage.style.display = "block";
            console.log("✅ No movies message shown");
        } else {
            console.log("❌ Still cannot find noMoviesMessage element!");
        }
    }

    // ✅ Hide No Movies Message
    function hideNoMoviesMessage() {
        console.log("✅ hideNoMoviesMessage called");
        if (elements.noMoviesMessage) {
            elements.noMoviesMessage.classList.remove("visible");
            elements.noMoviesMessage.style.display = "none";
            console.log("✅ No movies message hidden");
        } else {
            console.log("❌ noMoviesMessage element not found for hiding");
        }
    }

    // 🚀 Initialize Selected Date and Time
    function initializeSelectedDateTime() {
        // Set default selected date (today)
        const today = new Date();
        selectedDate = today;
        
        console.log("🚀 Initializing date/time selection...");
        console.log("🚀 Initial date:", selectedDate);
        console.log("🚀 Formatted date:", formatDateForComparison(selectedDate));
        
        // selectedTime will be set by updateShowtimes() after movies are loaded
        // Don't try to read it from DOM here as times haven't been rendered yet
    }

    function createMovieCard(movie) {
        const card = document.createElement("div");
        card.className = "movie-card";
        card.setAttribute("data-movie-id", movie.id);
        // Safe price conversion with error handling
        let displayPrice = '0.00';
        try {
            const priceNum = parseFloat(movie.price);
            if (!isNaN(priceNum)) {
                displayPrice = priceNum.toFixed(2);
            } else {
                console.warn('Invalid price for movie:', movie.name, 'Price:', movie.price);
            }
        } catch (error) {
            console.error('Error converting price for movie:', movie.name, 'Error:', error);
        }
        
        card.innerHTML = `
            <img src="${movie.picture}" alt="${movie.name}" loading="lazy">
            <h3>${movie.name}</h3>
            <p>${movie.language} | ${movie.format}</p>
            <p>₹${displayPrice}</p>
        `;

        card.addEventListener("click", () => handleMovieSelection(movie, card));
        return card;
    }

    // 🕐 Update Showtimes based on loaded movies
    function updateShowtimes(movies) {
        const showtimesContainer = document.querySelector('.showtimes');
        if (!showtimesContainer) {
            console.warn("Showtimes container not found");
            return;
        }

        // Get unique showtimes from movies, ignoring missing values
        const uniqueShowtimes = [...new Set(
            (movies || [])
                .map(movie => movie.showtime || movie.show_time)
                .filter(Boolean)
        )];

        // Compute available times for the currently selected date
        const selectedDateStr = formatDateForComparison(selectedDate);
        const availableTimesSet = new Set(
            (movies || [])
                .filter(m => {
                    const mDate = formatDateForComparison(m.show_date);
                    return !selectedDateStr || !mDate || mDate === selectedDateStr;
                })
                .map(m => m.showtime || m.show_time)
                .filter(Boolean)
        );

        // If no showtimes from API, keep existing ones or use a sensible fallback
        if (uniqueShowtimes.length === 0) {
            // If container already has time buttons, keep them and ensure one is selected
            const existingTimes = Array.from(showtimesContainer.querySelectorAll('.time'));
            if (existingTimes.length > 0) {
                // Ensure one is selected
                if (!showtimesContainer.querySelector('.time.selected')) {
                    existingTimes[0].classList.add('selected');
                    selectedTime = existingTimes[0].getAttribute('data-time');
                }
                setupShowtimeHandlers();
                // Trigger filtering so the no-movies message shows appropriately
                filterAndDisplayMovies();
                return;
            }

            // Fallback set when nothing is available
            const fallback = ['08:55:00', '09:55:00', '12:45:00', '15:55:00', '18:55:00'];
            showtimesContainer.innerHTML = '';
            fallback.forEach(st => {
                const el = document.createElement('div');
                el.className = 'time';
                el.setAttribute('data-time', st);
                const [h, m] = st.split(':');
                const hour = parseInt(h, 10);
                const ampm = hour >= 12 ? 'PM' : 'AM';
                const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
                el.textContent = `${displayHour}:${m} ${ampm}`;
                showtimesContainer.appendChild(el);
            });
            const first = showtimesContainer.querySelector('.time');
            if (first) {
                first.classList.add('selected');
                selectedTime = first.getAttribute('data-time');
            }
            setupShowtimeHandlers();
            // Trigger filtering with the fallback selection
            filterAndDisplayMovies();
            return;
        }
        
        // Clear existing showtimes
        showtimesContainer.innerHTML = '';
        
        // Add showtime buttons
        uniqueShowtimes.forEach(showtime => {
            if (!showtime || typeof showtime !== 'string') {
                return;
            }
            const timeElement = document.createElement('div');
            timeElement.className = 'time';
            timeElement.setAttribute('data-time', showtime);
            
            // Format time for display
            const parts = showtime.split(':');
            const hours = parts[0];
            const minutes = parts[1] || '00';
            const hour = parseInt(hours, 10);
            if (Number.isNaN(hour)) {
                timeElement.textContent = showtime; // fallback to raw value
                showtimesContainer.appendChild(timeElement);
                return;
            }
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
            const displayTime = `${displayHour}:${minutes} ${ampm}`;
            
            timeElement.textContent = displayTime;
            showtimesContainer.appendChild(timeElement);
        });

        // Mark times with no shows on selected date as disabled
        Array.from(showtimesContainer.querySelectorAll('.time')).forEach(el => {
            const t = el.getAttribute('data-time');
            if (selectedDateStr && !availableTimesSet.has(t)) {
                el.classList.add('disabled');
                el.title = 'No shows at this time for the selected date';
            } else {
                el.classList.remove('disabled');
                el.removeAttribute('title');
            }
        });

        // Preserve previously selected time if still present; otherwise select first
        let selected = null;
        if (selectedTime) {
            selected = showtimesContainer.querySelector(`.time[data-time="${selectedTime}"]`);
        }
        if (!selected) {
            selected = showtimesContainer.querySelector('.time');
        }
        if (selected) {
            selected.classList.add('selected');
            selectedTime = selected.getAttribute('data-time');
        } else {
            selectedTime = null;
        }
        
        // Re-setup event listeners for new showtimes
        setupShowtimeHandlers();
        // Trigger filtering to reflect the current selection
        filterAndDisplayMovies();
    }

    // 🎬 Handle Movie Selection with Animation
    function handleMovieSelection(movie, card) {
        console.log("🎬 Movie selected:", movie.name);

        // Ensure a date and time are selected
        const dateToUse = selectedDate || new Date();
        if (!selectedTime) {
            alert("Please select a show time first.");
            return;
        }

        // Build payload for next page
        const moviePayload = {
            id: movie.id,
            name: movie.name || movie.title,
            title: movie.title || movie.name,
            picture: movie.picture,
            language: movie.language,
            format: movie.format,
            price: movie.price
        };

        const params = new URLSearchParams({
            movieId: String(movie.id),
            date: formatDateForComparison(dateToUse),
            time: selectedTime,
            movieData: encodeURIComponent(JSON.stringify(moviePayload))
        });

        // Persist for refresh/backups
        localStorage.setItem('selectedMovieForBooking', JSON.stringify({
            movie: moviePayload,
            date: formatDateForComparison(dateToUse),
            time: selectedTime
        }));

        // Build destination URL
        const dest = `/seat.html?${params.toString()}`;
        // Navigate with transition
        navigateWithTransition(dest);
    }

    // Smooth navigation with View Transitions API fallback
    function navigateWithTransition(url) {
        const go = () => (window.location.href = url);
        try {
            if (document.startViewTransition) {
                document.startViewTransition(() => go());
                return;
            }
        } catch (e) {
            // ignore and fallback
        }
        // Fallback: fade overlay
        let overlay = document.getElementById('pageTransition');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'pageTransition';
            overlay.className = 'page-transition-overlay';
            document.body.appendChild(overlay);
        }
        // Prevent double navigation
        if (overlay.dataset.busy === '1') return;
        overlay.dataset.busy = '1';
        requestAnimationFrame(() => {
            overlay.classList.add('active');
            setTimeout(go, 360);
        });
    }

    // Add enter animation class to body
    document.body.classList.add('page-enter');

    // 🆕 MISSING FUNCTION: Update Movie Header
    function updateMovieHeader(movie) {
        if (elements.movieTitle) {
            elements.movieTitle.textContent = movie.name;
        }
        if (elements.movieDetails) {
            elements.movieDetails.textContent = `${movie.language} | ${movie.format}`;
        }
    }

    // 🆕 MISSING FUNCTION: Hide Other Movies
    function hideOtherMovies(selectedMovieId) {
        const allMovieCards = document.querySelectorAll('.movie-card');
        
        allMovieCards.forEach(card => {
            const movieId = card.getAttribute('data-movie-id');
            if (movieId != selectedMovieId) {
                card.style.display = 'none';
            }
        });

        // Update movie list heading
        const movieListHeading = document.querySelector('#movie-list h2');
        if (movieListHeading) {
            movieListHeading.innerHTML = '🎬 Selected Movie';
        }
        
        // Add change movie button
        addChangeMovieButton();
    }

    // 🆕 MISSING FUNCTION: Add Change Movie Button
    function addChangeMovieButton() {
        if (document.querySelector('.change-movie-btn')) return;

        const changeButton = document.createElement('button');
        changeButton.className = 'change-movie-btn';
        changeButton.innerHTML = '<i class="fas fa-arrow-left"></i>';
        changeButton.title = 'Change Movie';
        
        changeButton.addEventListener('click', showAllMovies);
        
        const movieSection = document.getElementById('movie-list');
        if (movieSection) {
            movieSection.appendChild(changeButton);
        }
    }

    function showAllMovies() {
        // Remove change movie button
        const changeButton = document.querySelector('.change-movie-btn');
        if (changeButton) {
            changeButton.remove();
        }

        // Show all movies
        const allMovieCards = document.querySelectorAll('.movie-card');
        allMovieCards.forEach((card, index) => {
            card.style.display = 'block';
            card.classList.remove('fade-out');
        });

        // Reset movie list heading
        const movieListHeading = document.querySelector('#movie-list h2');
        if (movieListHeading) {
            movieListHeading.innerHTML = '🎬 Available Movies';
        }
        
        // Hide booking area
        if (elements.bookingArea) {
            elements.bookingArea.style.display = "none";
        }
        
        // Hide cart footer when going back to movie selection
        if (elements.summarySection) {
            elements.summarySection.style.display = "none";
            elements.summarySection.classList.remove("visible");
            console.log("🚫 Cart footer hidden - back to movie selection");
            // Show main footer when going back to movie selection
            showMainFooter();
        }

        // Clear selected movie
        currentlySelectedMovie = null;
        localStorage.removeItem(STORAGE_KEYS.SELECTED_MOVIE);
        clearSeatSelection();
    }

    function showBookingInterface() {
        console.log("🎬 Showing booking interface...");
        if (elements.bookingArea) {
            elements.bookingArea.style.display = "block";
            // Trigger animation
            setTimeout(() => {
                elements.bookingArea.classList.add("visible");
            }, 10);
        }
        
        // Don't show summary section until seats are selected
        if (elements.summarySection) {
            console.log("🚫 Hiding cart footer - no seats selected yet");
            elements.summarySection.style.display = "none";
            elements.summarySection.classList.remove("visible");
            // Show main footer when cart footer is hidden
            showMainFooter();
        }
    }

    // 🪑 Seat Management
    function createSeats() {
        if (!elements.classicContainer || !elements.primeContainer) {
            console.warn("Seat containers not found");
            return;
        }
        
        createSeatSection(elements.classicContainer, 65, 67, "classic");
        createSeatSection(elements.primeContainer, 68, 71, "prime");
    }

    function createSeatSection(container, startRow, endRow, category) {
        for (let row = startRow; row <= endRow; row++) {
            const rowDiv = document.createElement("div");
            rowDiv.className = "row";
            
            const label = String.fromCharCode(row);
            const leftLabel = createRowLabel(label);
            const rightLabel = createRowLabel(label);

            const seats = createSeatRow(label, category);
            rowDiv.append(leftLabel, ...seats, rightLabel);
            container.appendChild(rowDiv);
        }
    }

    function createRowLabel(label) {
        const labelElement = document.createElement("div");
        labelElement.className = "row-label";
        labelElement.textContent = label;
        return labelElement;
    }

    function createSeatRow(rowLabel, category) {
        const seats = [];
        
        for (let number = 12; number >= 1; number--) {
            const seat = document.createElement("div");
            seat.className = "seat";
            seat.dataset.category = category;
            seat.dataset.row = rowLabel;
            seat.dataset.number = number;
            seat.dataset.seatId = `${rowLabel}${number}`;
            seat.textContent = number;

            // Randomly mark some seats as occupied
            if (Math.random() < 0.2) {
                seat.classList.add("occupied");
            }

            seat.addEventListener("click", () => toggleSeatSelection(seat));
            seats.push(seat);
        }
        
        return seats;
    }

    function toggleSeatSelection(seat) {
        if (seat.classList.contains("occupied")) return;

        const seatId = seat.dataset.seatId;
        
        if (selectedSeats.has(seatId)) {
            selectedSeats.delete(seatId);
            seat.classList.remove("selected");
        } else {
            selectedSeats.add(seatId);
            seat.classList.add("selected");
        }
        
        updateSummary();
        saveToLocalStorage();
        updateSummarySectionVisibility();
    }

    function clearSeatSelection() {
        document.querySelectorAll(".seat.selected").forEach(seat => {
            seat.classList.remove("selected");
        });
        selectedSeats.clear();
        updateSummary();
        updateSummarySectionVisibility();
    }

    function updateSummarySectionVisibility() {
        if (!elements.summarySection) return;
        
        const selectedSeatsCount = selectedSeats.size;
        const minimumSeatsForFooter = FOOTER_CONFIG.MINIMUM_SEATS;
        const shouldShowFooter = selectedSeatsCount >= minimumSeatsForFooter;
        
        console.log(`📊 Footer visibility check: ${selectedSeatsCount} seats selected (minimum: ${minimumSeatsForFooter})`);
        
        if (shouldShowFooter) {
            console.log("✅ Showing cart footer - enough seats selected for booking");
            elements.summarySection.style.display = "flex";
            setTimeout(() => {
                elements.summarySection.classList.add("visible");
            }, 10);
            // Hide main footer when cart footer is visible
            hideMainFooter();
        } else {
            console.log("🚫 Hiding cart footer - not enough seats selected yet");
            elements.summarySection.style.display = "none";
            elements.summarySection.classList.remove("visible");
            // Show main footer when cart footer is hidden
            showMainFooter();
            
            // Show a subtle hint if user has selected some seats but not enough
            if (FOOTER_CONFIG.SHOW_HINTS && selectedSeatsCount > 0 && selectedSeatsCount < minimumSeatsForFooter) {
                const remaining = minimumSeatsForFooter - selectedSeatsCount;
                console.log(`💡 Hint: Select ${remaining} more seat${remaining > 1 ? 's' : ''} to see booking summary`);
            }
        }
    }

    // 🎭 Main Footer Toggle Functions
    function hideMainFooter() {
        if (elements.mainFooter) {
            elements.mainFooter.classList.add("hidden-when-cart-visible");
            console.log("🚫 Main footer hidden - cart footer is visible");
        }
    }

    function showMainFooter() {
        if (elements.mainFooter) {
            elements.mainFooter.classList.remove("hidden-when-cart-visible");
            console.log("✅ Main footer shown - cart footer is hidden");
        }
    }

    // 💰 Summary & Pricing
    function updateSummary() {
        if (!elements.selectedCount || !elements.totalPrice) return;

        const count = selectedSeats.size;
        let total = 0;

        console.log(`💰 Updating pricing: ${count} seats selected`);

        selectedSeats.forEach(seatId => {
            const seat = document.querySelector(`.seat[data-seat-id="${seatId}"]`);
            if (seat) {
                const seatPrice = seat.dataset.category === "classic" ? PRICES.CLASSIC : PRICES.PRIME;
                total += seatPrice;
                console.log(`💰 Seat ${seatId} (${seat.dataset.category}): ₹${seatPrice}`);
            }
        });

        elements.selectedCount.textContent = count;
        elements.totalPrice.textContent = total.toFixed(2);
        console.log(`💰 Total: ₹${total.toFixed(2)} for ${count} seat(s)`);
    }

    // 💾 Local Storage
    function saveToLocalStorage() {
        const selectedSeatsData = Array.from(selectedSeats).map(seatId => {
            const seat = document.querySelector(`.seat[data-seat-id="${seatId}"]`);
            return {
                category: seat.dataset.category,
                row: seat.dataset.row,
                number: seat.dataset.number,
                seatId: seatId
            };
        });

        localStorage.setItem(STORAGE_KEYS.SEAT_SELECTION, JSON.stringify(selectedSeatsData));
    }

    function loadFromLocalStorage() {
        try {
            // Load selected seats
            const savedSeats = JSON.parse(localStorage.getItem(STORAGE_KEYS.SEAT_SELECTION) || "[]");
            
            savedSeats.forEach(seatData => {
                const seat = document.querySelector(`.seat[data-seat-id="${seatData.seatId}"]`);
                if (seat && !seat.classList.contains("occupied")) {
                    seat.classList.add("selected");
                    selectedSeats.add(seatData.seatId);
                }
            });

            // Load selected movie (legacy behavior disabled to avoid unexpected auto-navigation)
            // const savedMovie = JSON.parse(localStorage.getItem(STORAGE_KEYS.SELECTED_MOVIE) || "null");
            // if (savedMovie) {
            //     console.log('Previously selected movie found in storage; not auto-navigating.');
            // }

            updateSummary();
            updateSummarySectionVisibility();
        } catch (error) {
            console.error("Error loading from localStorage:", error);
            // Clear corrupted data
            localStorage.removeItem(STORAGE_KEYS.SEAT_SELECTION);
            localStorage.removeItem(STORAGE_KEYS.SELECTED_MOVIE);
        }
    }

    // 🧾 Booking System
    function setupBookingHandler() {
        if (!elements.bookBtn) return;

        elements.bookBtn.addEventListener("click", handleBooking);
    }

    function handleBooking() {
        if (selectedSeats.size === 0) {
            alert("Please select at least one seat.");
            return;
        }

        if (!currentlySelectedMovie) {
            alert("Please select a movie first.");
            return;
        }

        const bookingData = collectBookingData();
        processBooking(bookingData);
    }

    function collectBookingData() {
        const selectedDateElement = document.querySelector(".date.selected");
        const selectedTimeElement = document.querySelector(".time.selected");
        
        let selectedDate;
        if (selectedDateElement) {
            const dayName = selectedDateElement.querySelector('.day-name').textContent;
            const dayNumber = selectedDateElement.querySelector('.day-number').textContent;
            const monthName = selectedDateElement.querySelector('.month-name').textContent;
            selectedDate = `${dayNumber} ${monthName}, ${dayName}`;
        } else {
            selectedDate = new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "short",
                day: "numeric",
            });
        }
        
        const seatsArray = Array.from(selectedSeats).map(seatId => {
            const seat = document.querySelector(`.seat[data-seat-id="${seatId}"]`);
            return `${seat.dataset.row}${seat.dataset.number}`;
        });
        
        return {
            movieTitle: currentlySelectedMovie.name,
            selectedDate: selectedDate,
            showTime: selectedTimeElement?.textContent || currentlySelectedMovie.showtime,
            seats: seatsArray.join(", "),
            totalPrice: parseFloat(elements.totalPrice?.textContent || 0),
            bookingTimestamp: new Date().toISOString(),
            bookingId: 'BK-' + Date.now()
        };
    }

    function processBooking(bookingData) {
        // Show loading state
        elements.bookBtn.textContent = "Booking...";
        elements.bookBtn.disabled = true;

        // Prompt for username
        const username = prompt("Please enter your name to confirm the booking:");
        if (!username) {
            alert("Booking cancelled. Name is required.");
            elements.bookBtn.textContent = "Book Now";
            elements.bookBtn.disabled = false;
            return;
        }

        // Add username to booking data
        bookingData.username = username;
        bookingData.movie_id = currentlySelectedMovie.id;

        setTimeout(async () => {
            try {
                const bookingResponse = await saveBookingToBackend(bookingData);
                bookingData.bookingId = bookingResponse.bookingId; // Get ID from backend
                showBookingConfirmation(bookingData); // Show modal
            } catch (error) {
                alert("Booking failed. Please try again.");
                console.error("Booking error:", error);
            } finally {
                elements.bookBtn.textContent = "Book Now";
                elements.bookBtn.disabled = false;
            }
        }, 1000);
    }

    async function saveBookingToBackend(bookingData) {
        const response = await fetch(`${API_URL}/bookings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: bookingData.username,
                movie_id: bookingData.movie_id,
                seats: bookingData.seats,
                total_price: bookingData.totalPrice,
            }),
        });

        if (!response.ok) throw new Error('Booking request failed');
        return await response.json();
    }

    function showBookingConfirmation(bookingData) {
        updateTicketInfo(bookingData);
        generateQRCode(bookingData);
        
        if (elements.modalOverlay) {
            elements.modalOverlay.style.display = "flex";
        }
    }

    function updateTicketInfo(bookingData) {
        if (elements.ticketMovieTitle) elements.ticketMovieTitle.textContent = bookingData.movieTitle;
        if (elements.ticketDate) elements.ticketDate.textContent = bookingData.selectedDate;
        if (elements.ticketTime) elements.ticketTime.textContent = bookingData.showTime;
        if (elements.seatListText) elements.seatListText.textContent = bookingData.seats;
        if (elements.ticketTotal) elements.ticketTotal.textContent = bookingData.totalPrice.toFixed(2);
        
        // Update poster
        if (elements.ticketPoster && currentlySelectedMovie) {
            elements.ticketPoster.src = currentlySelectedMovie.picture;
        }
    }

    function generateQRCode(bookingData) {
        if (!elements.qrContainer) return;

        elements.qrContainer.innerHTML = "";

        // Compact QR payload to avoid overflow; avoid special currency symbol
        const compact = {
            v: 1,
            id: String(bookingData.bookingId || ""),
            mid: String(bookingData.movie_id || ""),
            sc: String((bookingData.seats || "").split(",").filter(Boolean).length),
            ts: String(Date.now())
        };
        const primaryText = `B|${compact.v}|${compact.id}|${compact.mid}|${compact.sc}|${compact.ts}`;

        // Using QRCode generator (ensure QRCode library is included)
        if (typeof QRCode !== 'undefined') {
            try {
                new QRCode(elements.qrContainer, {
                    text: primaryText,
                    width: 140,
                    height: 140,
                    colorDark: "#000000",
                    colorLight: "#ffffff",
                    correctLevel: QRCode.CorrectLevel.L
                });
            } catch (e) {
                console.warn("QR overflow, using fallback text only with booking id", e?.message || e);
                const fallbackText = `B|${compact.id}`;
                try {
                    new QRCode(elements.qrContainer, {
                        text: fallbackText,
                        width: 140,
                        height: 140,
                        colorDark: "#000000",
                        colorLight: "#ffffff",
                        correctLevel: QRCode.CorrectLevel.L
                    });
                } catch (e2) {
                    console.error("QR generation failed even with fallback:", e2?.message || e2);
                    elements.qrContainer.innerHTML = `<div class="qr-placeholder">QR Unavailable<br>ID: ${compact.id}</div>`;
                }
            }
        } else {
            console.warn("QRCode library not loaded");
            elements.qrContainer.innerHTML = `<div class="qr-placeholder">QR Code<br>Not Available</div>`;
        }
    }

    // 📱 Event Listeners
    function setupEventListeners() {
        setupBookingHandler();
        setupModalHandlers();
        setupShowtimeHandlers();
        setupDateNavigation();
    }

    function setupDateNavigation() {
        if (elements.prevDateBtn) {
            elements.prevDateBtn.addEventListener("click", () => navigateDates(-1));
        }
        if (elements.nextDateBtn) {
            elements.nextDateBtn.addEventListener("click", () => navigateDates(1));
        }
    }

    function setupModalHandlers() {
        if (elements.closeModal) {
            elements.closeModal.addEventListener("click", closeBookingModal);
        }

        if (elements.downloadTicket) {
            elements.downloadTicket.addEventListener("click", downloadTicket);
        }

        if (elements.modalOverlay) {
            elements.modalOverlay.addEventListener("click", (e) => {
                if (e.target === elements.modalOverlay) {
                    closeBookingModal();
                }
            });
        }
    }

    function setupShowtimeHandlers() {
        const showtimes = document.querySelectorAll(".time");
        showtimes.forEach(time => {
            time.addEventListener("click", function() {
                // Ignore clicks on disabled times
                if (this.classList.contains('disabled')) return;
                
                showtimes.forEach(t => t.classList.remove("selected"));
                this.classList.add("selected");
                
                // Update selected time and filter movies
                selectedTime = this.getAttribute('data-time');
                console.log("⏰ Time selected:", selectedTime);
                console.log("🔄 Triggering movie filter refresh...");
                
                // Force immediate refresh of movie list
                filterAndDisplayMovies();
            });
        });
    }

    function closeBookingModal() {
        if (elements.modalOverlay) {
            elements.modalOverlay.style.display = "none";
        }
        
        clearSeatSelection();
        localStorage.removeItem(STORAGE_KEYS.SEAT_SELECTION);
    }

    function downloadTicket() {
        const ticketContainer = document.getElementById("ticketContainer");
        if (!ticketContainer) return;

        if (typeof html2canvas !== 'undefined') {
            html2canvas(ticketContainer, {
                backgroundColor: "#ffffff",
                scale: 2
            }).then(canvas => {
                const link = document.createElement("a");
                link.download = `MovieTicket-${Date.now()}.png`;
                link.href = canvas.toDataURL("image/png");
                link.click();
            });
        } else {
            alert("Download feature not available. Please try again later.");
        }
    }

    // ===== AUTH HELPERS =====
    async function checkAuthStatus() {
        try {
            const res = await fetch(`${API_URL}/auth/me`, { credentials: 'include' });
            const data = await res.json();
            renderUserMenu(data.user);
        } catch (err) {
            console.warn('Auth check failed:', err);
            renderUserMenu(null);
        }
    }

    function renderUserMenu(user) {
        const menu = document.getElementById('userMenu');
        if (!menu) return;
        if (user) {
            menu.innerHTML = `
                <span class="user-greeting">Hello, ${escapeHtml(user.name || user.email)}</span>
                <button class="logout-btn" onclick="handleLogout()">Logout</button>
            `;
        } else {
            menu.innerHTML = `
                <a href="/auth/login.html?redirect=/">Login</a>
                <a href="/auth/signup.html">Sign Up</a>
            `;
        }
    }

    window.handleLogout = async function() {
        try {
            await fetch(`${API_URL}/auth/logout`, { method: 'POST', credentials: 'include' });
            location.reload();
        } catch (err) {
            console.error('Logout failed:', err);
        }
    };

    function escapeHtml(s) {
        return String(s||'').replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
    }

    // ===== END AUTH HELPERS =====

    // 🚀 Start the Application
    init();
});