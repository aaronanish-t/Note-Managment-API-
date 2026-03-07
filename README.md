# Notes Management API

A backend REST API that allows authenticated users to create and manage personal notes. It features token-based authentication (JWT) and Role-Based Access Control (RBAC) to differentiate between regular users and administrators.

## Technologies Used
* **Backend Framework:** Node.js with Express.js
* **Database:** PostgreSQL
* **Authentication:** JSON Web Tokens (JWT) & bcryptjs for password hashing
* **Environment Configuration:** dotenv

## Prerequisites
Before you begin, ensure you have the following installed on your machine:
* [Node.js](https://nodejs.org/) (v14 or higher)
* [PostgreSQL](https://www.postgresql.org/) (and pgAdmin 4 for database management)

---

## Setup Instructions

### 1. Install Dependencies
Open your terminal, navigate to the project folder, and run:
\`\`\`bash
npm install
\`\`\`

### 2. Configure Environment Variables
Create a file named `.env` in the root directory of the project and add the following variables. Replace `your_password` with your actual PostgreSQL password:
\`\`\`env
PORT=3000
DATABASE_URL=postgres://postgres:your_password@localhost:5432/notes_api
JWT_SECRET=your_super_secret_jwt_key
\`\`\`

### 3. Database Setup
Open pgAdmin 4, create a new database named `notes_api`, open the Query Tool, and run the following SQL commands to create the required tables:

\`\`\`sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(10) DEFAULT 'user'
);

CREATE TABLE notes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
\`\`\`

---

## Running the Application Locally

To start the server, run the following command in your terminal:
\`\`\`bash
node server.js
\`\`\`
The server should start running at `http://localhost:3000` (or whichever port you specified in your `.env` file).

---

## Example API Requests

### 1. Authentication

**Register a New User**
* **URL:** `/register`
* **Method:** `POST`
* **Body (JSON):**
  \`\`\`json
  {
    "username": "johndoe",
    "password": "securepassword123"
  }
  \`\`\`

**Login**
* **URL:** `/login`
* **Method:** `POST`
* **Body (JSON):** *(Same as Register)*
* **Response:** Returns a JWT token to be used in the `Authorization` header for protected routes.

### 2. Notes Management (Protected Routes)
*Requires `Authorization: Bearer <your_token>` header.*

**Create a Note**
* **URL:** `/notes`
* **Method:** `POST`
* **Body (JSON):**
  \`\`\`json
  {
    "title": "Grocery List",
    "content": "Milk, Eggs, Bread"
  }
  \`\`\`

**Get My Notes**
* **URL:** `/notes`
* **Method:** `GET`
* **Response:** Returns an array of notes belonging only to the authenticated user.

**Update a Note**
* **URL:** `/notes/:id`
* **Method:** `PUT`
* **Body (JSON):** Include updated `title` and `content`.

**Delete a Note**
* **URL:** `/notes/:id`
* **Method:** `DELETE`

### 3. Role-Based Access Control (Admin Routes)
*Requires Admin-level JWT Token.*
*To create an admin, manually update a user's role in the database: `UPDATE users SET role = 'admin' WHERE username = 'your_username';`*

**Get All Notes (From all users)**
* **URL:** `/admin/notes`
* **Method:** `GET`

**Delete Any Note**
* **URL:** `/admin/notes/:id`
* **Method:** `DELETE`
