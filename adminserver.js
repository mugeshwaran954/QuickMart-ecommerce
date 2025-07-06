const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const fileUpload = require("express-fileupload");
const path = require("path");
const PORT = 7000;

const app = express();
app.use(express.json());
app.use(cors());
app.use(fileUpload());
app.use("/", express.static(__dirname));

mongoose.connect("mongodb://127.0.0.1:27017/Groceries")
  .then(() => console.log("Connected to MongoDB"))
  .catch(err => console.error("MongoDB Connection Error:", err));
const fs = require("fs");
const session = require("express-session");

app.use(session({
    name:'admin_sid',
    secret: "grocery_admin_secret",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

const adminSchema = new mongoose.Schema({
    username: String,
    login_time: Date,
    session_duration: Number
});
const Admin = mongoose.model("Admin", adminSchema, "Admins");

app.get("/login", (req, res) => {
    const filePath = path.join(__dirname, "adminlogin.html");
    fs.readFile(filePath, "utf8", (err, data) => {
        if (err) {
            res.status(500).send("Could not load login page.");
        } else {
            res.setHeader("Content-Type", "text/html");
            res.send(data);
        }
    });
});

app.post("/admin-login", async (req, res) => {
    const { username, password } = req.body;

    if (!/^Admin#0[1-9]$/.test(username)) {
        return res.status(401).json({ success: false, message: "Invalid username format." });
    }

    const expectedPass = "Admin@" + username.slice(6);
    if (password !== expectedPass) {
        return res.status(401).json({ success: false, message: "Incorrect password." });
    }

    req.session.admin = {
        username,
        login_time: Date.now()
    };

    const newLogin = new Admin({
        username,
        login_time: new Date(),
        session_duration: 0
    });
    await newLogin.save();

    res.json({ success: true, redirect: "/f&vadmin.html" });

});

function checkAdminSession(req, res, next) {
    if (req.session.admin) {
        next();
    } else {
        res.status(401).json({ error: "Unauthorized. Please login." });
    }
}


const productSchema = new mongoose.Schema({
    _id: String,  
    name: String,
    description: String,
    price: Number,
    current_price: Number,
    stock_quantity: Number,
    category_id: String,
    subcat: String,
    image_url: String
});

const Product = mongoose.model('Product', productSchema,'Products');


app.post("/products", async (req, res) => {
    try {
        console.log("Received Request:", req.body);

        let { name, description, price, current_price, stock_quantity, subcat, category_id } = req.body;
        let image_url = "default.jpg";

        if (!name || !description || isNaN(price) || isNaN(current_price) || isNaN(stock_quantity) || !subcat) {
            return res.status(400).json({ error: "Please fill all required fields correctly." });
        }

        if (!category_id) {
            return res.status(400).json({ error: "Category ID is required." });
        }        

        const existingProduct = await Product.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
        if (existingProduct) {
            return res.status(409).json({ error: "Product with this name already exists." });
        }

        const products = await Product.find();
        let highestProductId = 0;
        if (products.length > 0) {
            highestProductId = Math.max(...products.map(p => parseInt(p._id.substring(1))));
        }
        const nextId = `P${String(highestProductId + 1).padStart(3, "0")}`;

        if (req.files && req.files.image) {
            let imageFile = req.files.image;
            const fileName = imageFile.name;
            const fileExt = path.extname(fileName).toLowerCase();

            if (![".jpg", ".jpeg", ".png"].includes(fileExt)) {
                return res.status(400).json({ error: "Only .jpg, .jpeg, .png files allowed." });
            }

            const maxSize = 5 * 1024 * 1024; 
            if (imageFile.size > maxSize) {
                return res.status(400).json({ error: "Image size must be 5MB or less." });
            }

            image_url = fileName;
            const uploadPath = path.join(__dirname,  image_url);

            try {
                await imageFile.mv(uploadPath);
                console.log("Image uploaded:", image_url);
            } catch (err) {
                console.error("Upload failed:", err);
                return res.status(500).json({ error: "Image upload failed." });
            }
        }

        const newProduct = new Product({
            _id: nextId,
            name,
            description,
            price,
            current_price,
            stock_quantity,
            subcat,
            category_id,
            image_url
        });

        const savedProduct = await newProduct.save();
        console.log("Product added:", savedProduct);
        res.status(201).json({ message: "Product added successfully!", product: savedProduct });

    } catch (error) {
        console.error("Product Insertion Error:", error);
        res.status(500).json({ error: "Server error", details: error.message });
    }
}); 

app.get("/products", async (req, res) => {
    try {
        const { category, subcategories } = req.query;

        let filter = {};

        if (category) {
            filter.category_id = category;
        }

        if (subcategories) {
            const subcatArray = subcategories.split(",").map(s => decodeURIComponent(s.trim()));
            filter.subcat = { $in: subcatArray };
        }

        const products = await Product.find(filter);
        res.json(products);
    } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).json({ error: "Server error while fetching products." });
    }
});


app.put("/products/:id", async (req, res) => {
    try {
        let productId = req.params.id;
        let updatedData = req.body;

        const result = await Product.updateOne(
            { _id: productId },
            { $set: updatedData }
        );

        if (result.modifiedCount > 0) {
            res.json({ message: "Product updated successfully" });
        } else {
            res.status(400).json({ message: "No changes made or product not found" });
        }
    } catch (error) {
        console.error("Update Error:", error); 
        res.status(500).json({ error: error.message }); 
    }
});

app.get("/logout", async (req, res) => {
  try {
    const sessionData = req.session.admin;

    if (!sessionData || !sessionData.username || !sessionData.login_time) {
      return res.redirect("/adminlogin.html");
    }

    const logoutTime = new Date();
    const loginTime = new Date(sessionData.login_time);
    const sessionDuration = Math.floor((logoutTime - loginTime) / 1000); 

    await Admin.updateOne(
      { username: sessionData.username, login_time: loginTime },
      { $set: { session_duration: sessionDuration } }
    );

    req.session.destroy(err => {
      if (err) {
        return res.status(500).send("Logout failed.");
      }
      res.redirect("/adminlogin.html");
    });

  } catch (err) {
    console.error("Error during logout:", err);
    res.status(500).send("Server error during logout.");
  }
});

const orderSchema = new mongoose.Schema({
    order_id: String,
    customer_id: String,
    name: String,
    address: String,
    phone: String,
    items: [
        {
            product_id: String,
            product_name: String,
            quantity: Number,
            price: Number
        }
    ],
    total: Number,
    payment_status: {
        type: String,
        default: "pending"
    },
    placed_at: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        default: "placed"
    }
}, { versionKey: false });

const OrderModel = mongoose.model("Order", orderSchema, "orders");

app.get("/admin/orders", checkAdminSession, async (req, res) => {
    const { date } = req.query;
    if (!date) {
        return res.status(400).json({ success: false, message: "Date is required." });
    }

    try {
        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(date);
        end.setHours(23, 59, 59, 999);

        const utcStart = new Date(start.getTime() - (start.getTimezoneOffset() * 60000));
        const utcEnd = new Date(end.getTime() - (end.getTimezoneOffset() * 60000));

        const orders = await OrderModel.find({
            placed_at: { $gte: utcStart, $lte: utcEnd }
        }).sort({ placed_at: -1 });
        console.log("Orders found:", orders);

        if (orders.length === 0) {
            return res.json({ success: false, message: "No orders found for this date." });
        }

        res.json({ success: true, orders });
    } catch (err) {
        console.error("Error fetching admin orders:", err);
        res.status(500).json({ success: false, message: "Server error fetching orders." });
    }
});

app.post("/admin/update-status", checkAdminSession, async (req, res) => {
    const { order_id, new_status } = req.body;
    console.log("Received update request:");
    console.log("order_id:", order_id, typeof order_id);
    console.log("new_status:", new_status);

    if (!order_id || !["shipped", "delivered","placed"].includes(new_status)) {
        console.log("Invalid request data");
        return res.status(400).json({ success: false, message: "Invalid request data." });
    }

    try {
        console.log("Searching for order with order_id:", order_id);
        const order = await OrderModel.findOne({ order_id });
        console.log("Found order:", order);

        if (!order) {
            console.log("Order not found");
            return res.status(404).json({ success: false, message: "Order not found." });
        }

        if (order.status === "delivered") {
            console.log("Order already delivered");
            return res.status(400).json({ success: false, message: "Order already delivered. Status update disabled." });
        }

        order.status = new_status;
        await order.save();
        console.log("Order status updated to:", new_status);

        res.json({ success: true, message: "Order status updated successfully." });
    } catch (err) {
        console.error("Error updating order status:", err);
        res.status(500).json({ success: false, message: "Server error updating status." });
    }
});



app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });