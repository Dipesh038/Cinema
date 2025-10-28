document.addEventListener("DOMContentLoaded", () => {
    // 🎭 DOM Elements with null checks
    const elements = {
        // Containers
        classicContainer: document.getElementById("classic"),
        primeContainer: document.getElementById("prime"),
        moviesContainer: document.getElementById("moviesContainer"),
        datesContainer: document.getElementById("datesContainer"),
        bookingArea: document.getElementById("bookingSection"),
        summarySection: document.getElementById("summarySection"),
        
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

    // 🎟️ Constants
    const PRICES = {
        CLASSIC: 381.36,
        PRIME: 481.36
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
        
        dateElement.innerHTML = `
            <div class="day-name">${dayName}</div>
            <div class="day-number">${dayNumber}</div>
            <div class="month-name">${monthName}</div>
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
            loadMovies();
            createSeats();
            loadFromLocalStorage();
            setupEventListeners();
            generateDates();
            setupDateNavigation();
            
            // Initially hide booking area and summary
            safelyHideElement(elements.bookingArea);
            safelyHideElement(elements.summarySection);
            
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
        if (!elements.moviesContainer) {
            console.warn("Movies container not found");
            return;
        }

        try {
            const response = await fetch(`${API_URL}/movies`);
            movies = await response.json();

            elements.moviesContainer.innerHTML = "";
            movies.forEach(movie => {
                const card = createMovieCard(movie);
                elements.moviesContainer.appendChild(card);
            });
        } catch (error) {
            console.error("❌ Failed to fetch movies:", error);
            elements.moviesContainer.innerHTML = `<p style="color: #ff6b6b;">Could not load movies. Is the backend server running?</p>`;
        }
    }

    function createMovieCard(movie) {
        const card = document.createElement("div");
        card.className = "movie-card";
        card.setAttribute("data-movie-id", movie.id);
        card.innerHTML = `
            <img src="${movie.picture}" alt="${movie.name}" loading="lazy">
            <h3>${movie.name}</h3>
            <p>${movie.language} | ${movie.format}</p>
            <p>₹${movie.price.toFixed(2)}</p>
        `;

        card.addEventListener("click", () => handleMovieSelection(movie, card));
        return card;
    }

    // 🎬 Handle Movie Selection with Animation
    function handleMovieSelection(movie, card) {
        console.log("🎬 Movie selected:", movie.name);

        // Store currently selected movie
        currentlySelectedMovie = movie;

        // Add selection animation to clicked card
        card.classList.add('selected-movie');

        // Add fade-out animation to other movies
        const allMovieCards = document.querySelectorAll('.movie-card');
        allMovieCards.forEach(otherCard => {
            if (otherCard !== card) {
                otherCard.classList.add('fade-out');
            }
        });

        // After animation, hide other movies and show booking interface
        setTimeout(() => {
            hideOtherMovies(movie.id);
            card.classList.remove('selected-movie');
            updateMovieHeader(movie);
            showBookingInterface();
            
            // Scroll to booking area
            if (elements.bookingArea) {
                elements.bookingArea.scrollIntoView({ 
                    behavior: "smooth", 
                    block: "start" 
                });
            }

            // Save selected movie to localStorage
            localStorage.setItem(STORAGE_KEYS.SELECTED_MOVIE, JSON.stringify(movie));
        }, 400);
    }

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
        
        if (elements.summarySection) {
            elements.summarySection.style.display = "none";
        }

        // Clear selected movie
        currentlySelectedMovie = null;
        localStorage.removeItem(STORAGE_KEYS.SELECTED_MOVIE);
        clearSeatSelection();
    }

    function showBookingInterface() {
        if (elements.bookingArea) {
            elements.bookingArea.style.display = "block";
            // Trigger animation
            setTimeout(() => {
                elements.bookingArea.classList.add("visible");
            }, 10);
        }
        
        // Don't show summary section until seats are selected
        if (elements.summarySection) {
            elements.summarySection.style.display = "none";
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
        
        const hasSelectedSeats = selectedSeats.size > 0;
        
        if (hasSelectedSeats) {
            elements.summarySection.style.display = "flex";
            setTimeout(() => {
                elements.summarySection.classList.add("visible");
            }, 10);
        } else {
            elements.summarySection.style.display = "none";
            elements.summarySection.classList.remove("visible");
        }
    }

    // 💰 Summary & Pricing
    function updateSummary() {
        if (!elements.selectedCount || !elements.totalPrice) return;

        const count = selectedSeats.size;
        let total = 0;

        selectedSeats.forEach(seatId => {
            const seat = document.querySelector(`.seat[data-seat-id="${seatId}"]`);
            if (seat) {
                total += seat.dataset.category === "classic" ? PRICES.CLASSIC : PRICES.PRIME;
            }
        });

        elements.selectedCount.textContent = count;
        elements.totalPrice.textContent = total.toFixed(2);
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

            // Load selected movie
            const savedMovie = JSON.parse(localStorage.getItem(STORAGE_KEYS.SELECTED_MOVIE) || "null");
            if (savedMovie) {
                const movieCard = document.querySelector(`.movie-card[data-movie-id="${savedMovie.id}"]`);
                if (movieCard) {
                    // Use setTimeout to ensure DOM is ready
                    setTimeout(() => {
                        handleMovieSelection(savedMovie, movieCard);
                    }, 100);
                }
            }

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
        
        const qrText = `MOVIE|${bookingData.bookingId}|${bookingData.movieTitle}|${bookingData.seats}|${bookingData.totalPrice}`;

        // Using QRCode generator (make sure QRCode library is included)
        if (typeof QRCode !== 'undefined') {
            new QRCode(elements.qrContainer, {
                text: qrText,
                width: 120,
                height: 120,
                colorDark: "#000000",
                colorLight: "#ffffff",
            });
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
                showtimes.forEach(t => t.classList.remove("selected"));
                this.classList.add("selected");
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

    // 🚀 Start the Application
    init();
});