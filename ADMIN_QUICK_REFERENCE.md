# 🎬 Admin Panel Quick Reference Guide

## Access
- **URL**: http://localhost:3000/admin.html
- **Navigation**: Sidebar menu (left side)

---

## 📊 Dashboard Section

**Features:**
- View total movies count
- View total bookings
- Track active shows
- Monitor total revenue

**Statistics Cards:**
- 🎬 **Total Movies** - Number of movies in the system
- 🎟️ **Total Bookings** - Number of bookings made
- ⏰ **Active Shows** - Currently active show times
- 💰 **Total Revenue** - Sum of all booking payments

---

## 🎬 Movies Management

### Add New Movie

**Required Fields:**
1. **Movie Title** - Name of the movie
2. **Language** - Single selection from dropdown
3. **Format** - Single selection (2D, 3D, IMAX, etc.)
4. **Price** - Ticket price in ₹
5. **Show Date** - Date picker
6. **Show Time** - Time picker

**Optional Fields:**
- **Movie Poster URL** - Direct link to poster image

**Steps:**
1. Navigate to "Movies" in sidebar
2. Fill out the form
3. Click "Add Movie"
4. Success alert will appear
5. Movie will appear in the list below

### View Movies

**Display:**
- All movies shown in card format
- Each card shows:
  - Title
  - Language
  - Format
  - Price
  - Show Date
  - Show Time

### Delete Movie

**Steps:**
1. Find the movie card
2. Click "Delete" button
3. Confirm in popup
4. Movie will be removed
5. Success alert appears

---

## 🎟️ Bookings Management

**View All Bookings:**
- Navigate to "Bookings" in sidebar
- See all booking details:
  - Username
  - Movie ID
  - Seats booked
  - Total price
  - Booking timestamp

---

## 💰 Pricing Management

**Seat Price Configuration:**

**Steps:**
1. Navigate to "Pricing" in sidebar
2. Enter prices:
   - **Classic Seats** - Standard seating price
   - **Prime Seats** - Premium seating price
3. Click "Update Prices"
4. Prices saved to localStorage

**Notes:**
- Prices must be positive numbers
- Can include decimals (e.g., 381.36)
- Prices persist across sessions

---

## 🎭 Shows Management

**Status:** Coming Soon
- Placeholder section
- Future feature for managing show times

---

## 📱 Mobile Usage

**Sidebar Toggle:**
- On mobile/tablet, sidebar is hidden by default
- Click the **☰ menu button** (top-left) to open sidebar
- Click section to navigate
- Sidebar auto-closes after selection

**Responsive Features:**
- Single column layouts on mobile
- Full-width buttons
- Stacked form fields
- Touch-friendly spacing

---

## 🎨 Color Guide

**Theme:**
- **Primary**: Purple (#8e44ad)
- **Accent**: Yellow/Gold (#ffca28)
- **Success**: Green (#10b981)
- **Danger**: Red (#ef4444)
- **Background**: Dark (#0d0d0d - #1e1e1e)
- **Text**: White/Gray

**Matching:** Same color scheme as user frontend

---

## ⚠️ Alerts & Notifications

**Success Alerts (Green):**
- Movie added successfully
- Movie deleted successfully
- Prices updated successfully

**Error Alerts (Red):**
- Missing required fields
- Invalid data
- Network errors
- API failures

**Auto-dismiss:** Alerts disappear after 5 seconds

---

## 🔄 Data Refresh

**Automatic:**
- Dashboard stats update on load
- Movies list refreshes after add/delete
- Bookings load when section opens

**Manual:**
- Switch between sections to reload data
- Refresh browser page for latest data

---

## ⌨️ Keyboard Shortcuts

**Navigation:**
- Use Tab to move between form fields
- Enter to submit forms
- Esc to cancel confirmations (browser default)

---

## 🐛 Troubleshooting

**Movies Not Loading:**
- Check backend server is running
- Verify database connection
- Check browser console for errors

**Add Movie Failed:**
- Ensure all required fields are filled
- Check date format is valid
- Verify backend API is accessible

**Sidebar Not Showing (Desktop):**
- Browser width must be > 968px
- Try refreshing the page

**Sidebar Stuck Open (Mobile):**
- Click any navigation item to close
- Or click outside sidebar area

---

## 🎯 Best Practices

**Adding Movies:**
1. Use clear, descriptive titles
2. Select appropriate language and format
3. Set realistic prices
4. Choose future dates for shows
5. Use high-quality poster URLs (optional)

**Managing Listings:**
1. Regularly delete past shows
2. Update prices seasonally
3. Check bookings frequently
4. Monitor dashboard statistics

**Pricing:**
1. Set competitive prices
2. Maintain price difference between Classic and Prime
3. Update prices before major releases
4. Consider peak/off-peak pricing

---

## 📞 Support

**If You Encounter Issues:**
1. Check browser console (F12)
2. Verify backend server is running: `npm start`
3. Check MySQL is running
4. Verify `backend/config.env` has correct credentials
5. Check network tab for failed API calls

**Common Solutions:**
- Restart backend server
- Clear browser cache
- Check database connections
- Verify all required fields in forms

---

## 🚀 Quick Start Checklist

- [ ] Start backend: `cd Project && npm start`
- [ ] Open admin panel: http://localhost:3000/admin.html
- [ ] Check dashboard statistics load
- [ ] Add a test movie
- [ ] Verify movie appears in list
- [ ] Update seat prices
- [ ] Check bookings section
- [ ] Test mobile responsiveness
- [ ] Navigate all sidebar sections

---

## 🎓 Tips & Tricks

1. **Fast Navigation**: Use sidebar to quickly jump between sections
2. **Dashboard First**: Check dashboard before making changes
3. **Verify Bookings**: Always check bookings after users book tickets
4. **Price Updates**: Update prices during off-peak hours
5. **Mobile Testing**: Always test on mobile after adding movies
6. **Backup Data**: Regularly backup your database
7. **Monitor Stats**: Keep an eye on dashboard statistics
8. **Clean Old Data**: Delete past shows to keep system fast

---

## 📋 Workflow Example

**Daily Admin Tasks:**
1. Open admin panel
2. Check dashboard statistics
3. Review new bookings
4. Add new movie releases
5. Delete past shows
6. Update prices if needed
7. Monitor revenue

**Weekly Tasks:**
1. Clean up old movies
2. Review pricing strategy
3. Check booking patterns
4. Plan upcoming releases

---

**Admin Panel Version:** 2.0 (Dashboard Edition)
**Last Updated:** October 26, 2025
**Status:** ✅ Fully Functional
