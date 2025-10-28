# 🎬 Movie Booking System

A modern, responsive movie booking system with seat selection, admin panel, and real-time booking management.

## 📁 Project Structure

```
movie-booking-system/
├── 📁 frontend/                    # Frontend application
│   ├── 📁 public/                  # Static assets & main pages
│   │   ├── index.html              # Main application page
│   │   ├── admin.html              # Admin panel for movie management
│   │   └── styles.css              # Main stylesheet
│   ├── 📁 src/                     # Source code
│   │   ├── script.js               # Main application logic
│   │   └── script-backup.js        # Backup script
│   └── 📁 auth/                    # Authentication pages
│       ├── login.html              # User login page
│       ├── signup.html             # User registration page
│       └── forgot-password.html    # Password recovery page
├── 📁 backend/                     # Backend API server
│   ├── server.js                   # Main server file with API routes
│   ├── db.js                       # Database configuration
│   ├── config.env                  # Environment variables
│   ├── package.json                # Backend dependencies
│   └── package-lock.json           # Dependency lock file
├── 📁 database/                    # Database related files
│   └── database_setup.sql          # Database schema & setup
├── 📁 docs/                        # Documentation
│   └── README.md                   # This file
└── package.json                    # Root package.json
```

## 🚀 Features

### Frontend Features
- **Movie Selection**: Browse available movies with posters and details
- **Seat Booking**: Interactive seat selection with different pricing tiers
- **Date & Time Selection**: Choose show dates and times
- **Booking Summary**: Real-time price calculation and booking confirmation
- **Ticket Generation**: Downloadable tickets with QR codes
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Admin Panel**: Manage movies, prices, and bookings

### Backend Features
- **RESTful API**: Complete CRUD operations for movies and bookings
- **Database Integration**: MySQL database with connection pooling
- **Admin Management**: Add, update, and delete movies
- **Booking System**: Handle seat reservations and user bookings
- **Price Management**: Dynamic pricing for different seat categories

## 🛠️ Technology Stack

### Frontend
- **HTML5**: Semantic markup and structure
- **CSS3**: Modern styling with animations and responsive design
- **JavaScript (ES6+)**: Interactive functionality and API integration
- **External Libraries**:
  - QRCode.js: Generate QR codes for tickets
  - html2canvas: Download tickets as images
  - Font Awesome: Icons

### Backend
- **Node.js**: Runtime environment
- **Express.js**: Web framework
- **MySQL**: Database management
- **CORS**: Cross-origin resource sharing
- **Body Parser**: Request parsing

## 📋 Prerequisites

Before running the application, make sure you have:

- **Node.js** (v14 or higher)
- **MySQL** (v8.0 or higher)
- **npm** or **yarn** package manager

## 🔧 Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd movie-booking-system
```

### 2. Install Dependencies
```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

### 3. Database Setup
1. Create a MySQL database named `Cinema`
2. Import the database schema:
```bash
mysql -u root -p Cinema < database/database_setup.sql
```

### 4. Environment Configuration
Update the database configuration in `backend/config.env`:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=Cinema
DB_PORT=3306
```

### 5. Start the Application
```bash
# Start the backend server
cd backend
npm start

# The application will be available at:
# Frontend: http://localhost:3000
# Admin Panel: http://localhost:3000/admin
```

## 🎯 Usage

### For Users
1. **Browse Movies**: Visit the homepage to see available movies
2. **Select Movie**: Click on a movie to proceed with booking
3. **Choose Date & Time**: Select your preferred show date and time
4. **Select Seats**: Click on available seats (green) to select them
5. **Book Tickets**: Review your selection and complete the booking
6. **Download Ticket**: Get your ticket with QR code for entry

### For Administrators
1. **Access Admin Panel**: Visit `/admin` to manage the system
2. **Add Movies**: Use the form to add new movies with details
3. **Manage Prices**: Update seat pricing for different categories
4. **View Bookings**: Monitor all bookings and user activity
5. **Delete Movies**: Remove movies that are no longer showing

## 🎨 Customization

### Styling
- Main styles are in `frontend/public/styles.css`
- Uses CSS custom properties for easy theme customization
- Responsive design with mobile-first approach

### Configuration
- Database settings in `backend/config.env`
- API endpoints in `backend/server.js`
- Frontend API calls in `frontend/src/script.js`

## 🔒 Security Features

- **Input Validation**: Server-side validation for all inputs
- **SQL Injection Prevention**: Parameterized queries
- **CORS Configuration**: Controlled cross-origin access
- **Error Handling**: Comprehensive error management

## 📱 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Check MySQL service is running
   - Verify database credentials in `config.env`
   - Ensure database `Cinema` exists

2. **Port Already in Use**
   - Change port in `backend/server.js`
   - Kill existing processes on port 3000

3. **Static Files Not Loading**
   - Check file paths in HTML files
   - Verify static file serving configuration

4. **API Calls Failing**
   - Ensure backend server is running
   - Check CORS configuration
   - Verify API endpoint URLs

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👨‍💻 Author

**Dipesh Kunwar**
- GitHub: [@Dipesh038](https://github.com/Dipesh038)
- LinkedIn: [Dipesh Kunwar](https://www.linkedin.com/feed/)
- Instagram: [@dipesh_3643](https://www.instagram.com/dipesh_3643/)

## 🙏 Acknowledgments

- Movie data provided by TMDB API
- Icons by Font Awesome
- QR Code generation by QRCode.js
- Ticket download functionality by html2canvas

---

**Happy Movie Booking! 🍿🎬**
