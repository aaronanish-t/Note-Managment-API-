const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) return res.status(403).json({ error: "No token provided" });

  // Tokens usually look like "Bearer eyJhbGci..." so we split it to get just the token
  const actualToken = token.split(" ")[1]; 

  jwt.verify(actualToken, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: "Unauthorized" });
    req.user = decoded; // Attach the user data (id, role) to the request
    next(); // Pass them through to the next function
  });
};

module.exports = { verifyToken };