# 🛒 QuickMart – Full-Stack eCommerce Web Application

**QuickMart** is a dynamic and user-friendly full-stack grocery shopping platform, built to simulate the complete online supermarket experience. From browsing products and managing carts to secure checkout and  the application provides a seamless user journey across both customer and admin portals.

> ✅ This project was collaboratively developed as part of our Web Programming course.  

---

## 📌 Project Description

QuickMart replicates the real-world functionality of an online grocery store, offering a clean and responsive interface for both end users and administrators. Customers can shop by category, manage their cart, choose from multiple payment modes, and view their order history. The admin panel handles product and order management,and stock updates.


---

## ⚙️ Technologies Used

| Layer      | Tools & Frameworks                     |
|------------|----------------------------------------|
| Frontend   | HTML, CSS, JavaScript, jQuery          |
| Backend    | Node.js, Express.js                    |
| Database   | MongoDB                                |
| Tools      | Visual Studio Code, Chrome Developer Tools |
| Package Manager | npm                              |

---

## 🖥️ System Requirements

Before running the project locally:

1. Install **Node.js** and **npm**.
2. Install **MongoDB** (version 3.4+ recommended).
3. Recommended editor: **Visual Studio Code**.

---

## 📦 NPM Dependencies

Install the required packages using:

Essential dependencies include:

- express

- mongoose

- body-parser

- cookie-parser

- express-session

- path

## Getting Started

Clone the Repository:
```bash
git clone https://github.com/mugeshwaran954/QuickMart-ecommerce
cd QuickMart-ecommerce
```
Install Dependencies:
``` bash
npm install
```
Start the Servers:
``` bash 
node adminserver.js (starts the Admin portal)
node server1.js (starts the User pages)
```
Access Locally:
User side: http://localhost:5000/homepg.html

Admin side: http://localhost:7000/login

Admin Credentials:

Username: Admin#0x

Password: Admin@0x
(where x = 1 to 9)

## Key Features

User Authentication:

- Signup and login with validation

- Password reset via mock 4-digit OTP

Home Page:

- Products displayed by category

- Filter by category and sort by price

- Search functionality

Cart Page:

- Add or remove products

- Modify quantity

- Automatic price updates

Checkout and Payment:

- Delivery info validation (pincode, mobile number)

Payment modes:

- Card

- UPI

- Net Banking

- Cash on Delivery

My Orders Page:

- View all orders

- Cancel orders if status is "placed" or "processing"

Admin Portal:

- Add and update product details

- Manage order delivery statuses

Team Credits

This project was developed by a team of five:

- Mugeshwaran E 

- Sujaa Shri S

- Ramya M

- Elakiya R

- Thanusha E

## GitHub Repository

The source code for this project is hosted on GitHub:

https://github.com/mugeshwaran954/QuickMart-ecommerce
