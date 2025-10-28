document.addEventListener("DOMContentLoaded", () => {
    // 🎭 DOM Elements
    const elements = {
        classicContainer: document.getElementById("classic"),
        primeContainer: document.getElementById("prime"),
        selectedCount: document.getElementById("selectedCount"),
        totalPrice: document.getElementById("totalPrice"),
        bookBtn: document.getElementById("bookBtn"),
        summarySection: document.getElementById("summarySection"),
        modalOverlay: document.getElementById("modalOverlay"),
        closeModal: document.getElementById("closeModal"),
        downloadTicket: document.getElementById("downloadTicket"),
        qrContainer: document.getElementById("qrcode"),
        
        // Ticket elements
        ticketPoster: document.getElementById("ticketPoster"),
        ticketMovieTitle: document.getElementById("ticketMovieTitle"),
        ticketDate: document.getElementById("ticketDate"),
        ticketTime: document.getElementById("ticketTime"),
        seatListText: document.getElementById("seatListText"),
        ticketTotal: document.getElementById("ticketTotal"),
        ticketBookingId: document.getElementById("ticketBookingId"),
        
        // Header elements
        moviePosterHeader: document.getElementById("moviePosterHeader"),
        movieTitleHeader: document.getElementById("movieTitleHeader"),
        movieInfoHeader: document.getElementById("movieInfoHeader"),
        selectedDateHeader: document.getElementById("selectedDateHeader"),
        selectedTimeHeader: document.getElementById("selectedTimeHeader"),
        backToMovies: document.getElementById("backToMovies"),
        
        // Price displays
        classicPriceDisplay: document.getElementById("classicPriceDisplay"),
        primePriceDisplay: document.getElementById("primePriceDisplay")
    };

    // 🎟️ Constants
    const PRICES = {
        CLASSIC: parseFloat(localStorage.getItem('classicPrice')) || 381.36,
        PRIME: parseFloat(localStorage.getItem('primePrice')) || 481.36
    };

    const API_URL = 'http://localhost:3000/api';
    
    // Display prices in the UI
    if (elements.classicPriceDisplay) elements.classicPriceDisplay.textContent = PRICES.CLASSIC.toFixed(2);
    if (elements.primePriceDisplay) elements.primePriceDisplay.textContent = PRICES.PRIME.toFixed(2);

    // ===== APPLICATION STATE =====
    let selectedMovie = null;
    let selectedSeats = new Set();
    let selectedDate = null;
    let selectedTime = null;
    let selectedShowId = null;
    let selectedShow = null;
    let currentUser = null; // Store logged-in user info

    // 🚀 Initialize
    async function init() {
        console.log("🚀 Initializing Seat Selection Page...");
        // Add enter animation class
        document.body.classList.add('page-enter');
        
        // Check if user is logged in
        await checkUserAuth();
        
        // Load movie data from URL parameters or localStorage
        loadMovieData();
        // If a showId is present but no complete movie info, try to enrich from backend
        if (selectedShowId && !selectedMovie) {
            try {
                selectedShow = await fetch(`${API_URL}/shows/${selectedShowId}`).then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)));
                selectedMovie = {
                    id: selectedShow.movie_id,
                    name: selectedShow.movie_title,
                    title: selectedShow.movie_title,
                    language: selectedShow.language || 'English',
                    format: selectedShow.format || '2D',
                    picture: selectedShow.picture
                };
                selectedDate = selectedDate || selectedShow.show_date;
                selectedTime = selectedTime || selectedShow.show_time;
            } catch (e) {
                console.warn('Failed to fetch show details:', e);
            }
        }
        
        if (!selectedMovie) {
            alert("No movie selected. Redirecting to movie selection...");
            window.location.href = "/index.html";
            return;
        }
        
        // Display movie information
        displayMovieInfo();
        
        // Create seats
        createSeats();
        
        // Setup event listeners
        setupEventListeners();
        
        console.log("✅ Seat Selection initialized");
    }

    // � Check User Authentication
    async function checkUserAuth() {
        try {
            const response = await fetch(`${API_URL}/auth/me`, {
                method: 'GET',
                credentials: 'include' // Important: send cookies
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.user) {
                    currentUser = data.user;
                    console.log("✅ User logged in:", currentUser.name);
                }
            } else {
                console.log("ℹ️ User not logged in");
                currentUser = null;
            }
        } catch (error) {
            console.warn("Could not check auth status:", error);
            currentUser = null;
        }
    }

    // �📝 Load Movie Data
    function loadMovieData() {
        // Try URL parameters first
        const urlParams = new URLSearchParams(window.location.search);
        const movieId = urlParams.get('movieId');
        const showId = urlParams.get('showId');
        const date = urlParams.get('date');
        const time = urlParams.get('time');
        
        if (showId) {
            selectedShowId = parseInt(showId, 10);
        }
        
        if (movieId) {
            // Load from URL and store in localStorage
            const movieData = urlParams.get('movieData');
            if (movieData) {
                try {
                    selectedMovie = JSON.parse(decodeURIComponent(movieData));
                    selectedDate = date;
                    selectedTime = time;
                    
                    // Store in localStorage for page refresh
                    localStorage.setItem('selectedMovieForBooking', JSON.stringify({
                        movie: selectedMovie,
                        date: date,
                        time: time,
                        showId: selectedShowId || null
                    }));
                    
                    console.log("✅ Movie loaded from URL:", selectedMovie);
                    return;
                } catch (e) {
                    console.error("Error parsing movie data from URL:", e);
                }
            }
        }
        
        // Fallback to localStorage
        const storedData = localStorage.getItem('selectedMovieForBooking');
        if (storedData) {
            try {
                const parsed = JSON.parse(storedData);
                selectedMovie = parsed.movie;
                selectedDate = parsed.date;
                selectedTime = parsed.time;
                selectedShowId = parsed.showId || null;
                console.log("✅ Movie loaded from localStorage:", selectedMovie);
            } catch (e) {
                console.error("Error parsing stored movie data:", e);
            }
        }
    }

    // 🎬 Display Movie Information
    function displayMovieInfo() {
        if (!selectedMovie) return;
        
        // Update header
        if (elements.moviePosterHeader) {
            elements.moviePosterHeader.src = selectedMovie.picture || selectedMovie.poster;
            elements.moviePosterHeader.alt = selectedMovie.name || selectedMovie.title;
        }
        
        if (elements.movieTitleHeader) {
            elements.movieTitleHeader.textContent = selectedMovie.name || selectedMovie.title;
        }
        
        if (elements.movieInfoHeader) {
            elements.movieInfoHeader.textContent = `${selectedMovie.language || 'English'} | ${selectedMovie.format || '2D'}`;
        }
        
        if (elements.selectedDateHeader && selectedDate) {
            const dateObj = new Date(selectedDate);
            const formattedDate = dateObj.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric'
            });
            elements.selectedDateHeader.textContent = formattedDate;
        }
        
        if (elements.selectedTimeHeader && selectedTime) {
            elements.selectedTimeHeader.textContent = formatTime(selectedTime);
        }
    }

    // ⏰ Format Time for Display
    function formatTime(time) {
        if (!time) return '';
        const parts = time.split(':');
        const hour = parseInt(parts[0], 10);
        const minute = parts[1] || '00';
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
        return `${displayHour}:${minute} ${ampm}`;
    }

    // 🪑 Create Seats
    async function createSeats() {
        if (!elements.classicContainer || !elements.primeContainer) {
            console.warn("Seat containers not found");
            return;
        }
        if (!selectedMovie || !selectedMovie.id) {
            console.warn("No selected movie to load seats for");
            return;
        }

        try {
            const seatRows = await fetchSeats(selectedMovie.id);
            renderSeatsFromData(seatRows);
        } catch (e) {
            console.error('Failed to load seats from API, falling back to default layout', e);
            createSeatSection(elements.classicContainer, 65, 67, "classic");
            createSeatSection(elements.primeContainer, 68, 71, "prime");
        }
    }

    async function fetchSeats(movieId) {
        const endpoint = selectedShowId ? `${API_URL}/shows/${selectedShowId}/seats` : `${API_URL}/movies/${movieId}/seats`;
        const res = await fetch(endpoint);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    }

    function renderSeatsFromData(seatsData) {
        elements.classicContainer.innerHTML = '';
        elements.primeContainer.innerHTML = '';

        // Group by row letter
        const byRow = {};
        seatsData.forEach(s => {
            const match = String(s.seat_number).match(/([A-Z]+)(\d+)/i);
            const row = match ? match[1].toUpperCase() : 'A';
            if (!byRow[row]) byRow[row] = [];
            byRow[row].push({
                seat_number: s.seat_number,
                status: s.status
            });
        });

        const rows = Object.keys(byRow).sort();
        rows.forEach(rowLabel => {
            const seats = byRow[rowLabel].sort((a, b) => {
                const na = parseInt(a.seat_number.replace(/\D/g, ''), 10) || 0;
                const nb = parseInt(b.seat_number.replace(/\D/g, ''), 10) || 0;
                return na - nb;
            });
            // Decide category by row (A-C classic, D+ prime), can be refined
            const category = rowLabel <= 'C' ? 'classic' : 'prime';
            const container = category === 'classic' ? elements.classicContainer : elements.primeContainer;
            const rowDiv = document.createElement('div');
            rowDiv.className = 'row';
            const leftLabel = createRowLabel(rowLabel);
            const rightLabel = createRowLabel(rowLabel);
            const seatDivs = seats.map(s => createSeatFromData(rowLabel, s, category));
            rowDiv.append(leftLabel, ...seatDivs, rightLabel);
            container.appendChild(rowDiv);
        });
    }

    function createSeatFromData(rowLabel, seatData, category) {
        const seat = document.createElement('div');
        seat.className = 'seat';
        seat.dataset.category = category;
        seat.dataset.row = rowLabel;
        const number = (seatData.seat_number || '').replace(/\D/g, '');
        seat.dataset.number = number;
        seat.dataset.seatId = `${rowLabel}${number}`;
        seat.textContent = number;
        if (seatData.status === 'booked') {
            seat.classList.add('occupied');
        }
        seat.addEventListener('click', () => toggleSeatSelection(seat));
        return seat;
    }

    function createSeatSection(container, startRow, endRow, category) {
        container.innerHTML = ''; // Clear existing
        
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

            // Randomly mark some seats as occupied (simulate real booking)
            if (Math.random() < 0.2) {
                seat.classList.add("occupied");
            }

            seat.addEventListener("click", () => toggleSeatSelection(seat));
            seats.push(seat);
        }
        
        return seats;
    }

    // 🎯 Seat Selection Logic
    function toggleSeatSelection(seat) {
        if (seat.classList.contains("occupied")) {
            return;
        }

        const seatId = seat.dataset.seatId;
        
        if (selectedSeats.has(seatId)) {
            selectedSeats.delete(seatId);
            seat.classList.remove("selected");
        } else {
            selectedSeats.add(seatId);
            seat.classList.add("selected");
        }
        
        updateSummary();
    }

    // 💰 Update Summary
    function updateSummary() {
        const count = selectedSeats.size;
        let total = 0;

        selectedSeats.forEach(seatId => {
            const seat = document.querySelector(`.seat[data-seat-id="${seatId}"]`);
            if (seat) {
                const seatPrice = seat.dataset.category === "classic" ? PRICES.CLASSIC : PRICES.PRIME;
                total += seatPrice;
            }
        });

        if (elements.selectedCount) elements.selectedCount.textContent = count;
        if (elements.totalPrice) elements.totalPrice.textContent = total.toFixed(2);

        // Update book button state
        if (elements.bookBtn) {
            elements.bookBtn.disabled = count === 0;
            if (count === 0) {
                elements.bookBtn.style.opacity = '0.5';
                elements.bookBtn.style.cursor = 'not-allowed';
            } else {
                elements.bookBtn.style.opacity = '1';
                elements.bookBtn.style.cursor = 'pointer';
            }
        }
    }

    // 📱 Event Listeners
    function setupEventListeners() {
        // Book button
        if (elements.bookBtn) {
            elements.bookBtn.addEventListener("click", handleBooking);
        }

        // Back to movies button
        if (elements.backToMovies) {
            elements.backToMovies.addEventListener("click", () => {
                localStorage.removeItem('selectedMovieForBooking');
                navigateWithTransition("/index.html");
            });
        }

        // Modal close
        if (elements.closeModal) {
            elements.closeModal.addEventListener("click", closeModal);
        }

        // Download ticket
        if (elements.downloadTicket) {
            elements.downloadTicket.addEventListener("click", downloadTicket);
        }

        // Click outside modal to close
        if (elements.modalOverlay) {
            elements.modalOverlay.addEventListener("click", (e) => {
                if (e.target === elements.modalOverlay) {
                    closeModal();
                }
            });
        }
    }

    // Smooth navigation with View Transitions API fallback
    function navigateWithTransition(url) {
        const go = () => (window.location.href = url);
        try {
            if (document.startViewTransition) {
                document.startViewTransition(() => go());
                return;
            }
        } catch (e) { /* ignore */ }
        let overlay = document.getElementById('pageTransition');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'pageTransition';
            overlay.className = 'page-transition-overlay';
            document.body.appendChild(overlay);
        }
        if (overlay.dataset.busy === '1') return;
        overlay.dataset.busy = '1';
        requestAnimationFrame(() => {
            overlay.classList.add('active');
            setTimeout(go, 360);
        });
    }

    // 🎫 Handle Booking
    async function handleBooking() {
        if (selectedSeats.size === 0) {
            alert("⚠️ Please select at least one seat before booking.");
            return;
        }

        if (!selectedMovie) {
            alert("❌ Movie information is missing. Please try again.");
            return;
        }

        // Show loading
        elements.bookBtn.textContent = "Processing...";
        elements.bookBtn.disabled = true;

        // Get username - either from logged-in user or prompt
        let username;
        if (currentUser && currentUser.name) {
            // User is logged in, use their name
            username = currentUser.name;
            console.log("✅ Using logged-in user:", username);
        } else {
            // User not logged in, offer to login or continue as guest
            const shouldLogin = confirm("You're not logged in. Would you like to:\n\n✅ Login/Signup (Recommended) - Click OK\n👤 Continue as Guest - Click Cancel");
            
            if (shouldLogin) {
                // Save current booking attempt and redirect to login
                localStorage.setItem('pendingBooking', 'true');
                alert("Please login or signup. You'll be redirected back to complete your booking.");
                window.location.href = `/auth/login.html?redirect=${encodeURIComponent(window.location.href)}`;
                return;
            } else {
                // Continue as guest - prompt for name
                username = prompt("Please enter your name to confirm the booking:");
                if (!username || username.trim() === '') {
                    alert("❌ Booking cancelled. Name is required.");
                    elements.bookBtn.textContent = "Book Now";
                    elements.bookBtn.disabled = false;
                    return;
                }
            }
        }

        try {
            const bookingData = collectBookingData(username);
            const response = await saveBookingToBackend(bookingData);
            
            // Update booking data with response
            bookingData.bookingId = response.bookingId || response.id || 'BK-' + Date.now();
            
            // Show success modal
            showBookingConfirmation(bookingData);
            
            // Clear selection
            clearSeats();
            
        } catch (error) {
            console.error("Booking error:", error);
            alert("❌ Booking failed. Please try again.\n\nError: " + error.message);
        } finally {
            elements.bookBtn.textContent = "Book Now";
            elements.bookBtn.disabled = false;
        }
    }

    // 📊 Collect Booking Data
    function collectBookingData(username) {
        const seatsArray = Array.from(selectedSeats).map(seatId => {
            const seat = document.querySelector(`.seat[data-seat-id="${seatId}"]`);
            return `${seat.dataset.row}${seat.dataset.number}`;
        });
        
        let total = 0;
        selectedSeats.forEach(seatId => {
            const seat = document.querySelector(`.seat[data-seat-id="${seatId}"]`);
            if (seat) {
                const seatPrice = seat.dataset.category === "classic" ? PRICES.CLASSIC : PRICES.PRIME;
                total += seatPrice;
            }
        });

        // Format date for display
        let formattedDate = selectedDate;
        if (selectedDate) {
            const dateObj = new Date(selectedDate);
            formattedDate = dateObj.toLocaleDateString('en-US', {
                day: 'numeric',
                month: 'short',
                weekday: 'long'
            });
        }
        
        return {
            username: username.trim(),
            user_id: currentUser ? currentUser.id : null, // Include user_id if logged in
            user_email: currentUser ? currentUser.email : null, // Include email if logged in
            movie_id: selectedMovie.id,
            show_id: selectedShowId || null,
            movieTitle: selectedMovie.name || selectedMovie.title,
            moviePoster: selectedMovie.picture || selectedMovie.poster,
            selectedDate: formattedDate,
            showTime: formatTime(selectedTime),
            seats: seatsArray.join(", "),
            totalPrice: total,
            bookingTimestamp: new Date().toISOString()
        };
    }

    // 💾 Save Booking to Backend
    async function saveBookingToBackend(bookingData) {
        const response = await fetch(`${API_URL}/bookings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: bookingData.username,
                movie_id: bookingData.movie_id,
                show_id: bookingData.show_id || undefined,
                seats: bookingData.seats,
                total_price: bookingData.totalPrice,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
    }

    // ✅ Show Booking Confirmation
    function showBookingConfirmation(bookingData) {
        // Update ticket info
        if (elements.ticketPoster) elements.ticketPoster.src = bookingData.moviePoster;
        if (elements.ticketMovieTitle) elements.ticketMovieTitle.textContent = bookingData.movieTitle;
        if (elements.ticketDate) elements.ticketDate.textContent = bookingData.selectedDate;
        if (elements.ticketTime) elements.ticketTime.textContent = bookingData.showTime;
        if (elements.seatListText) elements.seatListText.textContent = bookingData.seats;
        if (elements.ticketTotal) elements.ticketTotal.textContent = bookingData.totalPrice.toFixed(2);
        if (elements.ticketBookingId) elements.ticketBookingId.textContent = bookingData.bookingId;
        
        // Generate QR code
        generateQRCode(bookingData);
        
        // Show modal
        if (elements.modalOverlay) {
            elements.modalOverlay.style.display = "flex";
        }
    }

    // 🔲 Generate QR Code
    function generateQRCode(bookingData) {
        if (!elements.qrContainer) return;

        elements.qrContainer.innerHTML = "";

        // Create a compact payload to avoid QR capacity overflow
        // Avoid special symbols like ₹ in QR payload to reduce byte length
        const compact = {
            v: 1, // schema version
            id: String(bookingData.bookingId || ""),
            mid: String(bookingData.movie_id || ""),
            sh: String(bookingData.show_id || ""),
            sc: String((bookingData.seats || "").split(",").length), // seat count
            ts: String(Date.now())
        };
        const primaryText = `B|${compact.v}|${compact.id}|${compact.mid}|${compact.sh}|${compact.sc}|${compact.ts}`;

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
                console.warn("Primary QR payload overflow, falling back to minimal payload:", e?.message || e);
                // Minimal fallback: only booking id
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
                    elements.qrContainer.innerHTML = `<div style="padding: 12px; text-align: center; background: #fff; border: 1px solid #ddd; border-radius: 8px; color: #333;">QR unavailable\nID: ${compact.id}</div>`;
                }
            }
        } else {
            console.warn("QRCode library not loaded");
            elements.qrContainer.innerHTML = `<div style="padding: 20px; text-align: center; background: #f0f0f0; border-radius: 8px;">QR Code<br>Not Available</div>`;
        }
    }

    // ❌ Close Modal
    function closeModal() {
        if (elements.modalOverlay) {
            elements.modalOverlay.style.display = "none";
        }
        
        // Redirect back to movies after closing
        setTimeout(() => {
            localStorage.removeItem('selectedMovieForBooking');
            window.location.href = "/index.html";
        }, 500);
    }

    // 📥 Download Ticket
    function downloadTicket() {
        const ticketContainer = document.getElementById("ticketContainer");
        if (!ticketContainer) return;

        if (typeof html2canvas !== 'undefined') {
            html2canvas(ticketContainer, {
                backgroundColor: "#ffffff",
                scale: 2
            }).then(canvas => {
                const link = document.createElement("a");
                link.download = `Cinema-Ticket-${Date.now()}.png`;
                link.href = canvas.toDataURL("image/png");
                link.click();
            }).catch(err => {
                console.error("Download failed:", err);
                alert("❌ Failed to download ticket. Please try again.");
            });
        } else {
            alert("❌ Download feature not available. html2canvas library not loaded.");
        }
    }

    // 🧹 Clear Seats
    function clearSeats() {
        document.querySelectorAll(".seat.selected").forEach(seat => {
            seat.classList.remove("selected");
        });
        selectedSeats.clear();
        updateSummary();
    }

    // 🚀 Start the application
    init();
});
