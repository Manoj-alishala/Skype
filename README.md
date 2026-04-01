# 💬 ChatApp — Real-Time Chat Application

![CI](https://github.com/Manoj-alishala/Chat-Application/actions/workflows/ci.yml/badge.svg)
![Docker](https://img.shields.io/badge/Docker-Containerized-2496ED?logo=docker&logoColor=white)
![Kubernetes](https://img.shields.io/badge/Kubernetes-Deployed-326CE5?logo=kubernetes&logoColor=white)

🌐 **Live Demo:** [https://chat-application-zchp.onrender.com](https://chat-application-zchp.onrender.com)

A full-stack real-time chat application built with the **MERN stack** (MongoDB, Express, React, Node.js) and **Socket.io**. Packed with modern features like group chats, WebRTC video/audio calls, message reactions, typing indicators, read receipts, and more.

---

## 🌟 Features

### 💬 Messaging
- **Real-time Messaging** — Instant delivery using Socket.io
- **Group Chats** — Create and manage group conversations
- **Message Reactions** — React to messages with emojis
- **Unsend Messages** — Delete messages for everyone
- **Image & Audio Messages** — Share media in chats
- **Typing Indicators** — See when someone is typing
- **Read Receipts** — Know when messages are read (✓✓)
- **Delivered Receipts** — Know when messages are delivered

### 📞 Calls
- **WebRTC Video Calls** — Peer-to-peer video calling
- **WebRTC Audio Calls** — Peer-to-peer voice calling
- **Incoming Call Modal** — Accept or reject calls in real time

### 👥 Friends & Social
- **Friend Requests** — Send, accept, and reject friend requests
- **Online Status** — See who is currently online
- **Friend Removal** — Remove friends from your list

### 🔐 Auth & Security
- **JWT Authentication** — Secure login & signup
- **Password Hashing** — Bcryptjs for secure storage
- **Cookie-based Auth** — HTTP-only cookies

### ⚙️ CI/CD
- **GitHub Actions** — Automated lint and build on every push to `main`

### 🐳 Docker & Kubernetes
- **Dockerized** — Multi-stage Docker build (React + Express in one image)
- **Kubernetes Ready** — Full K8s manifests (Deployment, Service, ConfigMap, Secrets)
- **2 Replicas** — High availability with automatic pod restarts
- **LoadBalancer Service** — Exposed on port 80

---

## 🛠️ Tech Stack

**Client:**
- React.js + Vite
- TailwindCSS + DaisyUI
- Zustand (State Management)
- Socket.io-client
- React Router Dom
- React Hot Toast

**Server:**
- Node.js + Express.js
- MongoDB + Mongoose
- Socket.io
- JsonWebToken (JWT)
- Bcryptjs + Cookie-parser

**DevOps:**
- Docker (Multi-stage build)
- Kubernetes (kubeadm)
- GitHub Actions CI/CD

---

## 🐳 Docker & Kubernetes Deployment

### Run with Docker Compose (Quickest)
```bash
# Clone the repo
git clone https://github.com/Manoj-alishala/Chat-Application.git
cd Chat-Application

# Add your credentials to docker-compose.yml, then:
docker compose up --build
```
Visit `http://localhost:5000` 🚀

### Deploy to Kubernetes
```bash
# 1. Build the image
docker build -t chat-app:latest .

# 2. Fill in your secrets in k8s/secret.yaml

# 3. Deploy all manifests
kubectl apply -f k8s/

# 4. Check pods
kubectl get pods -n chat-app
```
Visit `http://localhost` 🚀

---

## 🚀 Getting Started (Local Dev)

### Prerequisites
- Node.js (v20 or higher)
- MongoDB (Local or Atlas)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Manoj-alishala/Chat-Application.git
   cd Chat-Application
   ```

2. **Install all dependencies:**
   ```bash
   npm install
   npm install --prefix server
   npm install --prefix client
   ```

3. **Environment Configuration:**

   Create a `.env` file in the `server/` directory:
   ```env
   PORT=5000
   MONGO_DB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret_key
   NODE_ENV=development
   ```

   Create a `.env` file in the `client/` directory:
   ```env
   VITE_API_BASE_URL=http://localhost:5000
   ```

### 🏃 Running the App

1. **Start the server:**
   ```bash
   npm run dev --prefix server
   ```

2. **Start the client:**
   ```bash
   npm run dev --prefix client
   ```

3. Open `http://localhost:3000` in your browser.

---

## 📂 Project Structure

```
Chat-Application/
├── .github/
│   └── workflows/
│       └── ci.yml              # GitHub Actions CI pipeline
├── k8s/
│   ├── namespace.yaml          # Kubernetes namespace
│   ├── configmap.yaml          # Non-secret env vars
│   ├── secret.yaml             # Secret credentials (gitignored)
│   ├── deployment.yaml         # App deployment (2 replicas)
│   └── service.yaml            # LoadBalancer service
├── server/
│   ├── controllers/            # Route handlers
│   ├── db/                     # MongoDB connection
│   ├── middleware/             # Auth middleware
│   ├── models/                 # Mongoose schemas
│   ├── routes/                 # API routes
│   ├── socket/                 # Socket.io events
│   └── server.js               # Entry point
├── client/
│   ├── public/                 # Static assets
│   ├── src/
│   │   ├── components/         # UI components
│   │   ├── context/            # React context (Auth, Socket)
│   │   ├── hooks/              # Custom hooks
│   │   ├── pages/              # Page components
│   │   └── zustand/            # Global state store
│   └── vite.config.js
├── Dockerfile                  # Multi-stage Docker build
├── docker-compose.yml          # Local dev with MongoDB
├── .dockerignore
└── package.json
```

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.

## 🤝 Contributing

Contributions are welcome! Feel free to open an issue or submit a Pull Request.
