// Search Journeys
const searchJourneysForm = document.getElementById('search-journeys-form');
searchJourneysForm.addEventListener('submit', (event) => 
{
    event.preventDefault();
    const destination = document.getElementById('destination').value;
    const departureDate = document.getElementById('departure-date').value;
    fetch(`/api/journeys?destination=${destination}&departureDate=${departureDate}`)
        .then((response) => response.json())
        .then((data) => 
        {
            const searchResults = document.getElementById('search-results');
            searchResults.innerHTML = '';
            data.forEach((journey) => 
            {
                const journeyHTML = `
                    <h2>${journey.destination}</h2>
                    <p>${journey.description}</p>
                    <p>Price: ${journey.price}</p>
                `;
                searchResults.insertAdjacentHTML('beforeend', journeyHTML);
            });
        })
        .catch((error) => console.error(error));
});

// Create Journey
const createJourneyForm = document.getElementById('create-journey-form');
createJourneyForm.addEventListener('submit', (event) => 
{
    event.preventDefault();
    const destination = document.getElementById('destination').value;
    const departureDate = document.getElementById('departure-date').value;
    const returnDate = document.getElementById('return-date').value;
    const price = document.getElementById('price').value;
    fetch('/api/journeys', 
    {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destination, departureDate, returnDate, price }),
    })
        .then((response) => response.json())
        .then((data) => console.log(data))
        .catch((error) => console.error(error));
});








const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(cors());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));

// User Schema
const UserSchema = new mongoose.Schema({
    username: String,
    email: String,
    password: String
});
const User = mongoose.model("User", UserSchema);

// Journey Schema
const JourneySchema = new mongoose.Schema({
    userId: mongoose.Schema.Types.ObjectId,
    visitorName: String,
    startLocation: String,
    endLocation: String,
    date: { type: Date, default: Date.now }
});
const Journey = mongoose.model("Journey", JourneySchema);

// Register Endpoint
app.post("/register", async (req, res) => {
    const { username, email, password } = req.body;
    
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: "Email already in use" });
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const newUser = new User({ username, email, password: hashedPassword });
    await newUser.save();
    res.json({ message: "User registered successfully" });
});

// Login Endpoint
app.post("/login", async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) return res.status(400).json({ error: "User not found" });
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });
    
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
    res.json({ token, message: "Login successful" });
});

// Middleware for Authentication
const authenticate = (req, res, next) => {
    const token = req.headers["authorization"];
    if (!token) return res.status(401).json({ error: "Access denied" });
    
    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verified;
        next();
    } catch (err) {
        res.status(400).json({ error: "Invalid token" });
    }
};

// Create Journey Endpoint for Users
app.post("/create-journey", authenticate, async (req, res) => {
    const { startLocation, endLocation } = req.body;
    
    const newJourney = new Journey({
        userId: req.user.id,
        startLocation,
        endLocation
    });
    await newJourney.save();
    res.json({ message: "Journey recorded successfully" });
});

// Get All Journeys for Logged-in User
app.get("/user-journeys", authenticate, async (req, res) => {
    const journeys = await Journey.find({ userId: req.user.id });
    res.json(journeys);
});

// Get All Journeys (Public View)
app.get("/journeys", async (req, res) => {
    const journeys = await Journey.find();
    res.json(journeys);
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
