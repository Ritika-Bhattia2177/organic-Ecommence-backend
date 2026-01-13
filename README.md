# OrganicMart Backend API

Professional Node.js backend for OrganicMart E-commerce Platform.

## Tech Stack

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **dotenv** - Environment variables

## Project Structure

```
backend/
├── config/
│   └── db.js              # MongoDB connection
├── controllers/
│   ├── authController.js  # Authentication logic
│   ├── userController.js  # User management
│   ├── productController.js
│   ├── orderController.js
│   └── categoryController.js
├── models/
│   ├── User.js
│   ├── Product.js
│   ├── Order.js
│   └── Category.js
├── routes/
│   ├── authRoutes.js
│   ├── userRoutes.js
│   ├── productRoutes.js
│   ├── orderRoutes.js
│   └── categoryRoutes.js
├── middleware/
│   ├── authMiddleware.js  # JWT verification
│   └── errorHandler.js    # Error handling
├── utils/
│   └── generateToken.js
├── .env.example
├── .gitignore
├── package.json
└── server.js
```

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Environment Variables

Create a `.env` file in the backend directory:

```bash
cp .env.example .env
```

Update the `.env` file with your configuration:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/organicmart
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE=30d
FRONTEND_URL=http://localhost:5173
```

### 3. Start MongoDB

Make sure MongoDB is running on your system:

```bash
# Using mongod
mongod

# Or using Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### 4. Run the Server

```bash
# Development mode with nodemon
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:5000`

## API Endpoints

### Authentication (`/api/auth`)
- `POST /register` - Register new user
- `POST /login` - Login user
- `GET /me` - Get current user (Protected)
- `POST /logout` - Logout user (Protected)

### Users (`/api/users`)
- `GET /` - Get all users (Admin)
- `GET /:id` - Get user by ID (Admin)
- `PUT /profile` - Update profile (Protected)
- `DELETE /:id` - Delete user (Admin)

### Products (`/api/products`)
- `GET /` - Get all products (Public)
- `GET /:id` - Get single product (Public)
- `POST /` - Create product (Admin)
- `PUT /:id` - Update product (Admin)
- `DELETE /:id` - Delete product (Admin)
- `POST /:id/reviews` - Create review (Protected)

### Orders (`/api/orders`)
- `POST /` - Create order (Protected)
- `GET /` - Get all orders (Admin)
- `GET /myorders` - Get user orders (Protected)
- `GET /:id` - Get order by ID (Protected)
- `PUT /:id/pay` - Update to paid (Protected)
- `PUT /:id/deliver` - Update to delivered (Admin)

### Categories (`/api/categories`)
- `GET /` - Get all categories (Public)
- `GET /:id` - Get category by ID (Public)
- `POST /` - Create category (Admin)
- `PUT /:id` - Update category (Admin)
- `DELETE /:id` - Delete category (Admin)

## Features

✅ JWT Authentication
✅ Password hashing with bcrypt
✅ Error handling middleware
✅ MongoDB integration
✅ RESTful API design
✅ User roles (User/Admin)
✅ Product management
✅ Order management
✅ Review system
✅ Category management
✅ Protected routes
✅ Input validation
✅ CORS enabled

## Testing the API

You can test the API using:
- Postman
- Thunder Client (VS Code extension)
- cURL

### Example Login Request:

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

### Example Protected Request:

```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Security Best Practices

- ✅ Passwords are hashed using bcrypt
- ✅ JWT tokens for authentication
- ✅ Protected routes with middleware
- ✅ Input validation
- ✅ Error handling
- ✅ Environment variables for sensitive data
- ✅ CORS configuration

## License

ISC
