
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
    visitorName: String,
    startLocation: String,
    endLocation: String,
    date: { type: Date, default: Date.now }
});
const Journey = mongoose.model("Journey", JourneySchema);

// Register Endpoint
app.post("/register", async (req, res) => {
    const { username, email, password } = req.body;
    
    // Hash password
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
    res.json({ token });
});

// Protected Route - Profile
app.get("/profile", async (req, res) => {
    const token = req.headers["authorization"];
    if (!token) return res.status(401).json({ error: "Access denied" });
    
    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(verified.id);
        res.json({ username: user.username, email: user.email });
    } catch (err) {
        res.status(400).json({ error: "Invalid token" });
    }
});

// Create Journey Endpoint for Visitors
app.post("/visitor-journey", async (req, res) => {
    const { visitorName, startLocation, endLocation } = req.body;
    
    const newJourney = new Journey({ visitorName, startLocation, endLocation });
    await newJourney.save();
    res.json({ message: "Journey recorded successfully" });
});

// Get All Journeys
app.get("/journeys", async (req, res) => {
    const journeys = await Journey.find();
    res.json(journeys);
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));





 
