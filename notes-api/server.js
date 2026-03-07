const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs'); // For scrambling passwords
const jwt = require('jsonwebtoken'); // For the "Member's Card" token
const pool = require('./db'); // Imports our database connection
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());
// A simple home route so the browser doesn't show an error
app.get('/', (req, res) => {
    res.send("Welcome to the Notes API! The server is running smoothly.");
});

// --- 1. REGISTER ROUTE ---
app.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Scramble (hash) the password so hackers can't read it
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Save the new user into PostgreSQL
        const newUser = await pool.query(
            "INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username, role",
            [username, hashedPassword]
        );

        res.status(201).json({ message: "User registered!", user: newUser.rows[0] });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Server error or username already exists" });
    }
});

// --- 2. LOGIN ROUTE ---
app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Check if the user exists in the database
        const userResult = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
        if (userResult.rows.length === 0) {
            return res.status(401).json({ error: "User not found" });
        }
        
        const user = userResult.rows[0];

        // Check if the password they typed matches the scrambled one in the DB
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: "Incorrect password" });
        }

        // Generate the "Member's Card" (JWT Token)
        const token = jwt.sign(
            { id: user.id, role: user.role }, 
            process.env.JWT_SECRET, 
            { expiresIn: "1h" } // Token expires in 1 hour
        );

        res.json({ message: "Login successful!", token: token });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Server error" });
    }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
// --- MIDDLEWARE: Check if user is logged in ---
const verifyToken = (req, res, next) => {
    // Look for the token in the headers
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Extracts token from "Bearer <token>"

    if (!token) return res.status(401).json({ error: "Access denied. No token provided." });

    try {
        // Verify the token using your secret key
        const verifiedUser = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verifiedUser; // Attach the user data (id, role) to the request
        next(); // Let them pass!
    } catch (err) {
        res.status(403).json({ error: "Invalid token." });
    }
};

// --- MIDDLEWARE: Check if user is an Admin ---
const isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: "Access denied. Admins only." });
    }
    next(); // Let the admin pass!
};
// --- 1. CREATE A NOTE ---
app.post('/notes', verifyToken, async (req, res) => {
    try {
        const { title, content } = req.body;

        // --- NEW VALIDATION CODE ---
        if (!title || !content) {
            return res.status(400).json({ error: "Title and content are required!" });
        }
        // ---------------------------

        const newNote = await pool.query(
            "INSERT INTO notes (user_id, title, content) VALUES ($1, $2, $3) RETURNING *",
            [req.user.id, title, content]
        );
        res.status(201).json(newNote.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// --- 2. GET MY NOTES ---
app.get('/notes', verifyToken, async (req, res) => {
    try {
        // ONLY fetch notes that belong to the logged-in user
        const myNotes = await pool.query(
            "SELECT * FROM notes WHERE user_id = $1 ORDER BY created_at DESC",
            [req.user.id]
        );
        res.json(myNotes.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- 3. UPDATE MY NOTE ---
app.put('/notes/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content } = req.body;
        
        // Update ONLY if the note ID and User ID match
        const updateNote = await pool.query(
            "UPDATE notes SET title = $1, content = $2 WHERE id = $3 AND user_id = $4 RETURNING *",
            [title, content, id, req.user.id]
        );

        if (updateNote.rows.length === 0) {
            return res.status(404).json({ error: "Note not found or you don't own it." });
        }
        res.json(updateNote.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- 4. DELETE MY NOTE ---
app.delete('/notes/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const deleteNote = await pool.query(
            "DELETE FROM notes WHERE id = $1 AND user_id = $2 RETURNING *",
            [id, req.user.id]
        );

        if (deleteNote.rows.length === 0) {
            return res.status(404).json({ error: "Note not found or you don't own it." });
        }
        res.json({ message: "Note deleted successfully." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// --- ADMIN: GET ALL NOTES ---
app.get('/admin/notes', verifyToken, isAdmin, async (req, res) => {
    try {
        const allNotes = await pool.query("SELECT * FROM notes ORDER BY created_at DESC");
        res.json(allNotes.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- ADMIN: DELETE ANY NOTE ---
app.delete('/admin/notes/:id', verifyToken, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const deleteNote = await pool.query("DELETE FROM notes WHERE id = $1 RETURNING *", [id]);

        if (deleteNote.rows.length === 0) {
            return res.status(404).json({ error: "Note not found." });
        }
        res.json({ message: "Note deleted by Admin." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});