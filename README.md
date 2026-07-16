# RentEd

RentEd is a student marketplace where users can rent items, buy or sell second-hand goods. This is a vanilla HTML, CSS, and JavaScript frontend with sample data.

## Stack

- Frontend: Vanilla HTML + CSS + JavaScript
- Data: Sample data stored in JavaScript

## Folder Structure

```text
RentED/
├── index.html
├── marketplace.html
├── sell-rent.html
├── dashboard.html
├── login.html
├── signup.html
├── item-details.html
├── styles.css
├── app.js
├── public/
│   └── images/
├── package.json
└── README.md
```

## Features

- 🏠 **Home Page**: Landing page with featured listings and platform features
- 🛒 **Marketplace**: Browse items with search and filter functionality
- 📝 **Post Item**: Create new rental or sale listings
- 📊 **Dashboard**: View your listings and activity
- 🔐 **Authentication**: Login/Signup with sample data storage
- 📱 **Responsive**: Mobile-friendly design

## Getting Started

### 1. Clone/Download the project
```bash
cd RentED
```

### 2. Run a local server
Using Python:
```bash
python -m http.server 8000
```

Using Node.js (http-server):
```bash
npx http-server
```

Using Node.js (simpler):
```bash
npm run dev
```

### 3. Open in browser
Navigate to `http://localhost:8000` (or your configured port)

## Sample Credentials

You can sign up with any email/password combination. Sample data is pre-loaded for the marketplace:

- Test email: `student@university.edu`
- Test password: `password123`

## Pages Overview

- **Home** (`/index.html`): Landing page with platform overview
- **Marketplace** (`/marketplace.html`): Browse and filter all items
- **Sell/Rent** (`/sell-rent.html`): Post new items (requires login)
- **Dashboard** (`/dashboard.html`): View your listings (requires login)
- **Login** (`/login.html`): Sign in to your account
- **Signup** (`/signup.html`): Create new account
- **Item Details** (`/item-details.html`): View full item details

## Sample Data

The marketplace includes 6 sample items:
1. Introduction to Algorithms (Book - Sale)
2. Laptop Stand (Equipment - Rental)
3. Single Room (Room - Rental)
4. Physics Textbook (Book - Sale)
5. Desk Lamp (Equipment - Rental)
6. Double Room (Room - Rental)

## Styling

All styling is done with vanilla CSS using CSS variables for theming:
- Canvas: `#f7f3ea`
- Ink: `#13232f`
- Accent: `#ec6f36`
- Pine: `#275245`
- Gold: `#f2c66d`
- Mist: `#e8ddd0`

## Notes

- This is a frontend-only implementation using sample data
- Authentication data is stored in browser localStorage
- No backend server is required
- All functionality is simulated with client-side JavaScript
- Images are using placeholder URLs from placeholder.co

