const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors()); 

mongoose.connect("mongodb://127.0.0.1:27017/Groceries")
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.error("MongoDB Connection Error:", err));



const userSchema = new mongoose.Schema({
    customer_id: { type: String, unique: true, index: true }, 
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true }
    }, { versionKey: false }); 


userSchema.pre("save", async function (next) {
    if (!this.customer_id) {
        let count = await mongoose.models.User.countDocuments();
        this.customer_id = `CUST${String(count + 1).padStart(3, '0')}`; 
    }
    next();
});

const User = mongoose.model("User", userSchema, "users");

app.post("/signup", async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ error: "All fields are required" });
    }

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: "Email already registered" });
        }

        const newUser = new User({ name, email, password });
        await newUser.save();
        res.json({ message: "User registered successfully", customer_id: newUser.customer_id });
    } catch (err) {
        console.error("Signup Error:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    
    try {
        const user = await User.findOne({ email });
        
        if (!user) {
            return res.status(400).json({ message: 'Customer not found' });
        }
        
        if (password !== user.password) {
            return res.status(400).json({ message: 'Invalid password' });
        }
        
        res.status(200).json({ message: 'Login successful', customer_id: user.customer_id });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

const PORT = 5010;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));