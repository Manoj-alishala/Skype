# Real-Time Chat Application

A full-stack real-time chat application built with the MERN stack (MongoDB, Express, React, Node.js) and Socket.io. This application features secure authentication, real-time messaging, and a modern UI using TailwindCSS and DaisyUI.

## 🌟 Features

-   **Authentication & Authorization**: Secure signup and login using JWT (JSON Web Tokens).
-   **Real-time Messaging**: Instant message delivery using Socket.io.
-   **Online Status**: See who is currently online.
-   **Global State Management**: Efficient state management with Zustand.
-   **Modern UI**: Responsive and clean interface built with TailwindCSS and DaisyUI.
-   **Security**: bcryptjs for password hashing and secure cookie-based auth.

## 🛠️ Tech Stack

**Frontend:**
-   React.js
-   Vite
-   TailwindCSS
-   DaisyUI
-   Zustand (State Management)
-   Socket.io-client
-   React Router Dom
-   React Hot Toast

**Backend:**
-   Node.js
-   Express.js
-   MongoDB (Database)
-   Socket.io (Real-time communication)
-   JsonWebToken (JWT)
-   Bcryptjs
-   Cookie-parser

## 🚀 Getting Started

Follow these steps to set up the project locally.

### Prerequisites

-   Node.js (v18 or higher recommended)
-   MongoDB (Local or Atlas)

### Installation

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/Manoj-alishala/Chat-Application.git
    cd Chat-Application
    ```

2.  **Install dependencies (root):**

    This will install dependencies for both frontend and backend if configured, or you can do it manually.

    ```bash
    npm install
    cd frontend
    npm install
    cd ../backend
    npm install
    ```

3.  **Environment Configuration:**

    Create a `.env` file in the `backend` directory with the following variables:

    ```env
    PORT=5000
    MONGO_DB_URI=your_mongodb_connection_string
    JWT_SECRET=your_jwt_secret_key
    NODE_ENV=development
    ```

### 🏃‍♂️ Running the App

1.  **Start the backend server:**

    ```bash
    cd backend
    npm start
    ```
    *Or for development with nodemon:*
    ```bash
    npm run dev
    ```

2.  **Start the frontend development server:**

    ```bash
    cd frontend
    npm run dev
    ```

3.  **Access the application:**

    Open your browser and navigate to `http://localhost:3000`.

## 📂 Project Structure

```
Chat-Application/
├── backend/            # Backend server code
│   ├── controllers/    # Request handlers
│   ├── db/             # Database connection
│   ├── middleware/     # Custom middleware (auth, etc.)
│   ├── models/         # Mongoose models
│   ├── routes/         # API routes
│   ├── socket/         # Socket.io configuration
│   └── server.js       # Entry point
├── frontend/           # Frontend React application
│   ├── public/         # Static assets
│   ├── src/            # React components and logic
│   └── vite.config.js  # Vite configuration
└── package.json        # Root configuration
```

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
