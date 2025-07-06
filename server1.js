const mongoose = require('mongoose');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require("cors");
const PORT = 5000;
const app = express();
const schema = mongoose.Schema;

app.use(express.static(__dirname));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const url = "mongodb://127.0.0.1:27017/Groceries";
const session = require("express-session");

app.use(
    session({
      secret: "your_secret_key",
      resave: false,
      saveUninitialized: false, 
      cookie: { 
        secure: false, 
        maxAge: 24 * 60 * 60 * 1000 
      }
    })
  );
  

mongoose.connect(url)
  .then(() => console.log("Connected with MongoDB"))
  .catch(error => console.log("Error in DB Connection:", error));

const ProductSchema = new schema({
  _id: String, 
  name: String,
  category_id: String,
  subcat: String,
  price: Number,
  current_price: Number, 
  stock_quantity: Number,
  image_url: String
});

const ProductModel = mongoose.model('Products', ProductSchema, 'Products');

const CartSchema = new schema({
  cart_id: String, 
  customer_id: String, 
  product_id: String,  
  product_name: String,
  price: Number,
  quantity: Number
});

CartSchema.index({ customer_id: 1, product_id: 1 }, { unique: true });

const CartModel = mongoose.model("Cart", CartSchema, "Carts");

app.get('/products', async (req, res) => {
    try {
        let filter = { stock_quantity: { $gt: 0 } };

        if (req.query.search) {
            filter.name = { $regex: req.query.search, $options: "i" };
        }
        if (req.query.category) {
            filter.category_id = req.query.category;
        }
        if (req.query.subcategories) {
            let subcategories = req.query.subcategories.split(",").map(decodeURIComponent);
            filter.subcat = { $in: subcategories };
        }

        let sortOption = {};
        if (req.query.sort === "asc") {
            sortOption.current_price = 1;
        } else if (req.query.sort === "desc") {
            sortOption.current_price = -1;
        }

        const products = await ProductModel.find(filter).sort(sortOption);
        res.json(products);
    } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.post('/add-to-cart', async (req, res) => {
    try {
        let { product_id, product_name, quantity } = req.body;
        if (!product_id || typeof product_id !== "string") {
            return res.status(400).json({ error: "Invalid product ID" });
        }

        const customer_id = req.session.customer_id;
        if (!customer_id) {
            return res.status(401).json({ error: "User not logged in" });
        }
        let existingCart = await CartModel.findOne({ customer_id });
        const cart_id = existingCart ? existingCart.cart_id : `CART_${customer_id}`;

        const existingItem = await CartModel.findOne({ customer_id, product_id });

        if (existingItem) {
            return res.status(400).json({ error: "Item is already in cart" });
        }

        const product = await ProductModel.findOne({ _id: product_id });

        if (!product) {
            return res.status(400).json({ error: "Product not found" });
        }

        if (quantity > product.stock_quantity) {
            return res.status(400).json({ error: `Cannot add more than available stock quantity of ${product.stock_quantity}` });
        }

        const cartItem = new CartModel({
            cart_id,
            customer_id,
            product_id,  
            product_name,
            price: product.current_price,
            quantity: quantity || 1
        });

        await cartItem.save();
        res.json({ message: "Item added to cart" });

    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
});


app.get('/cart', async (req, res) => {
    try {
        const customer_id = req.session.customer_id;
        if (!customer_id) {
            return res.status(401).json({ error: "User not logged in" });
        }
        const cartItems = await CartModel.find({ customer_id });

        let updatedCart = await Promise.all(cartItems.map(async (item) => {
            let product = await ProductModel.findOne({ _id: item.product_id });
            return { ...item._doc, image_url: product ? product.image_url : "",  stock_quantity: product ? product.stock_quantity : 0 };
        }));

        res.json(updatedCart);
    } catch (error) {
        console.error("Error fetching cart:", error);
        res.status(500).json({ error: "Error fetching cart" });
    }
});

app.post('/update-cart', async (req, res) => {
    try {
        const { product_id, quantity } = req.body;
        const customer_id = req.session.customer_id;
        if (!customer_id) {
            return res.status(401).json({ error: "User not logged in" });
        } 

        let product = await ProductModel.findOne({ _id: product_id });

        if (!product || quantity > product.stock_quantity) {
            return res.status(400).json({ error: `Cannot exceed stock quantity of ${product ? product.stock_quantity : 0}` });
        }

        await CartModel.updateOne({ customer_id, product_id }, { $set: { quantity } });
        res.json({ message: "Cart updated successfully" });
    } catch (error) {
        res.status(500).json({ error: "Error updating cart" });
    }
});

app.delete('/remove-from-cart', async (req, res) => {
    try {
        const { product_id } = req.body;
        const customer_id = req.session.customer_id;
        if (!customer_id) {
            return res.status(401).json({ error: "User not logged in" });
        }

        await CartModel.deleteOne({ customer_id, product_id });
        res.json({ message: "Item removed from cart" });
    } catch (error) {
        res.status(500).json({ error: "Error removing item" });
    }
});

const userSchema = new mongoose.Schema({
    customer_id: { type: String, unique: true, index: true }, 
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    address: { type: String, default: "" }, 
    phone: { type: String, default: "" }
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
app.post('/login2', async (req, res) => {
    if (req.session.customer_id) {
        console.log("User already logged in:", req.session.customer_id);
        return res.status(400).json({ message: "User already logged in" });
      }
    const { email, password } = req.body;
    
    try {
        const user = await User.findOne({ email }).lean();
        
        if (!user) {
            return res.status(400).json({ message: 'Customer not found' });
        }
        
        if (password !== user.password) {
            return res.status(400).json({ message: 'Invalid password' });
        }
        req.session.customer_id = user.customer_id;
        const existingCart = await CartModel.find({ customer_id: user.customer_id });
        console.log("Session after login:", req.session);
        req.session.save(err => {
            if (err) {
                console.log("Error saving session:", err);
                return res.status(500).json({ message: "Error saving session" });
            }
            console.log("Login successful, session saved:", req.session.customer_id);
            res.status(200).json({ 
                message: 'Login successful', 
                customer_id: user.customer_id,
                cart: existingCart 
            });
            
        });

    } catch (error) {
        console.log("Server error during login:", error);
        res.status(500).json({ message: 'Server error' });
    }
    
});

app.get("/session", (req, res) => {
    console.log("Checking session:", req.session);
    console.log("Session customer_id:", req.session.customer_id); 
    if (req.session.customer_id) {
        console.log("Session found:", req.session.customer_id);
        return res.json({ loggedIn: true, customer_id: req.session.customer_id });
    }
    console.log("No active session");
    res.json({ loggedIn: false });
});

app.post("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: "Logout failed" });
        }
        res.clearCookie("connect.sid"); 
        res.json({ message: "Logged out successfully" });
    });
});

app.get("/checkout", async (req, res) => {
    const customer_id = req.session.customer_id;
    if (!customer_id) {
        return res.status(401).json({ error: "User not logged in" });
    }

    try {
        const cartItems = await CartModel.find({ customer_id });
        const total = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        const user = await User.findOne({ customer_id }).lean();

        res.json({
            cart: cartItems,
            total,
            customer: {
                name: user.name,
                address: user.address,
                phone: user.phone
            }
        });
    } catch (error) {
        console.error("Error in /checkout route:", error);
        res.status(500).json({ error: "Internal server error" });
    }
    
});

app.post("/update-address", async (req, res) => {
    const customer_id = req.session.customer_id;
    if (!customer_id) {
        return res.status(401).json({ error: "User not logged in" });
    }

    const { name, address, phone } = req.body;
    try {
        await User.updateOne({ customer_id }, { $set: { name, address, phone } });
        res.json({ message: "Details saved as default" });
    } catch (err) {
        console.error("Error updating user info:", err);
        res.status(500).json({ error: "Failed to update" });
    }
});


const OrderSchema = new mongoose.Schema({
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
  
const OrderModel = mongoose.model("Order", OrderSchema, "orders"); 
  
 app.post("/place-order", async (req, res) => {
  const customer_id = req.session.customer_id;

  if (!customer_id) {
    return res.status(401).json({ error: "User not logged in" });
  }

  try {
    const { address, phone, setDefault } = req.body;
    console.log("Received body:", req.body);

    const user = await User.findOne({ customer_id });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const cartItems = await CartModel.find({ customer_id });

    if (!cartItems.length) {
      return res.status(400).json({ error: "Cart is empty" });
    }

    const total = cartItems.reduce(
      (sum, item) => sum + item.quantity * item.price,
      0
    );


    await OrderModel.deleteMany({ customer_id, payment_status: "pending" });

    const latestOrder = await OrderModel
      .findOne({})
      .sort({ order_id: -1 })
      .lean();

    let nextOrderId;
    if (latestOrder && latestOrder.order_id) {
      const currentNum = parseInt(latestOrder.order_id.replace("ORDER", ""), 10);
      nextOrderId = `ORDER${String(currentNum + 1).padStart(4, "0")}`;
    } else {
      nextOrderId = "ORDER0001"; 
    }

    const order = new OrderModel({
      order_id: nextOrderId,
      customer_id,
      name: user.name,
      address,
      phone,
      items: cartItems.map((item) => ({
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        price: item.price,
      })),
      total,
      payment_status: "pending",
      placed_at: new Date()
    });

    console.log("Saving order:", order);

    const result = await order.save();
    console.log("Order saved:", result);

    if (setDefault) {
      await User.updateOne({ customer_id }, { $set: { address, phone } });
    }

    res.json({ message: "Proceeding to payment", order_id: nextOrderId });

  } catch (err) {
    console.error("Error placing order:", err);
    res.status(500).json({ error: "Failed to place order" });
  }
});

app.get('/profile', async (req, res) => {
        const customer_id = req.session.customer_id;
        if (!customer_id) {
            return res.status(401).json({ error: "User not logged in" });
        }
    
        try {
            const user = await User.findOne(
                { customer_id },
                { _id: 0, name: 1, email: 1, address: 1, phone: 1 }
            );
    
            if (!user) {
                return res.status(404).json({ error: "User not found" });
            }
    
            res.json(user);
        } catch (error) {
            console.error("Error fetching user profile:", error);
            res.status(500).json({ error: "Server error" });
        }
});

app.post('/update-profile', async (req, res) => {
    const customer_id = req.session.customer_id;
    if (!customer_id) {
        return res.status(401).json({ error: "User not logged in" });
    }

    const { name, phone, address } = req.body;

    try {
        const updatedUser = await User.findOneAndUpdate(
            { customer_id },
            { name, phone, address },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json({ message: "Profile updated successfully", user: updatedUser });
    } catch (error) {
        console.error("Error updating user profile:", error);
        res.status(500).json({ error: "Server error" });
    }
});

const paymentSchema = new mongoose.Schema({
    order_id: String,
    customer_id: String,
    payment_method: String,
    amount_paid: Number,
    payment_status: String,
    payment_time: { type: Date, default: Date.now }
  });
  app.get("/get-latest-order", async (req, res) => {
    const customer_id = req.session.customer_id;
    if (!customer_id) return res.status(401).json({ error: "Not logged in" });
  
    try {
      const order = await OrderModel.findOne({ customer_id })
        .sort({ placed_at: -1 }) 
        .limit(1);
      if (!order) return res.status(404).json({ error: "Order not found" });
  
      res.json({ order_id: order.order_id, total: order.total });
    } catch (err) {
      console.error("Error fetching latest order:", err);
      res.status(500).json({ error: "Server error" });
    }
  });
  
const PaymentModel = mongoose.model('Payment', paymentSchema);
app.post("/payment", async (req, res) => {
    const customer_id = req.session.customer_id;

    if (!customer_id) {
        return res.status(401).json({ error: "User not logged in" });
    }

    const { order_id, payment_method, amount_paid, payment_status } = req.body;

    try {
        const order = await OrderModel.findOne({ order_id });

        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }

        if (payment_status === "Success") {
            const payment = new PaymentModel({
                order_id,
                payment_method,
                amount_paid,
                payment_status,
                payment_time: new Date()
            });
            await OrderModel.updateOne({ order_id }, { $set: { payment_status: "paid" } });
            await payment.save();

            await CartModel.deleteMany({ customer_id });

            for (const item of order.items) {
                const result = await ProductModel.updateOne(
                  { _id: item.product_id },  
                  { $inc: { stock_quantity: -item.quantity } }
                );
                console.log(`Updated ${item.product_id} =>`, result);
              }
              
            res.json({ message: "Payment successful, order confirmed!" });
        } else {
            await OrderModel.deleteOne({ order_id });

            res.json({ message: "Payment failed or cancelled. Order removed." });
        }

    } catch (error) {
        console.error("Error in /payment:", error);
        res.status(500).json({ error: "Payment processing failed" });
    }
});

app.get("/myorders", async (req, res) => {
    if (!req.session.customer_id) {
        return res.json({ success: false, message: "Please log in to view your order history." });
    }

    try {
        const customer_id = req.session.customer_id;
        const orders = await OrderModel.find({ customer_id }).sort({ placed_at: -1 });
        res.json({ success: true, orders });
    } catch (err) {
        console.error("Error fetching orders:", err);
        res.status(500).json({ success: false, message: "Server error fetching orders." });
    }
});


app.post("/cancel-order", async (req, res) => {
    try {
        const { order_id } = req.body;

        const order = await OrderModel.findOne({ order_id });

        if (!order) {
            return res.json({ success: false, message: "Order not found" });
        }

        for (const item of order.items) {
            await ProductModel.updateOne(
                { _id: item.product_id },
                { $inc: { stock_quantity: item.quantity } }
            );
        }
        await OrderModel.deleteOne({ order_id });

        res.json({ 
            success: true, 
            message: "Order cancelled and stock updated. Payments made via Net Banking, UPI, or Card will be refunded within 2-3 business days." 
          });
          

    } catch (err) {
        console.error("Cancel order error:", err);
        res.status(500).json({ success: false, message: "Server error while cancelling order." });
    }
});

app.post("/reset-password", async (req, res) => {
    const { email, newPassword } = req.body;

    try {
        const updated = await User.updateOne(
            { email },
            { $set: { password: newPassword } }
        );

        if (updated.modifiedCount === 0) {
            return res.status(400).json({ error: "Email not found or password is the same." });
        }

        res.json({ message: "Password updated successfully" });
    } catch (err) {
        console.error("Reset Password Error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});



app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});