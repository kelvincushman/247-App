# 247 Trades Platform - Backend API

RESTful API backend for the 247 Trades Services Platform, built with Node.js, Express, and PostgreSQL.

## Features

✅ **Authentication & Authorization**
- JWT-based authentication
- Role-based access control (Customer, Tradesperson, Admin)
- Refresh token support
- Password hashing with bcrypt

✅ **Database Models**
- Users with role differentiation
- Customer profiles with addresses and payment methods
- Tradesperson profiles with certifications and portfolios
- Jobs with status tracking
- Reviews and ratings system

✅ **Security**
- Helmet.js for HTTP headers security
- Rate limiting
- CORS configuration
- Input validation with express-validator
- SQL injection prevention (Sequelize ORM)

✅ **Developer Experience**
- Structured error handling
- Winston logging
- API versioning
- Environment-based configuration

## Tech Stack

- **Framework:** Express.js
- **Database:** PostgreSQL with Sequelize ORM
- **Authentication:** JWT + bcrypt
- **Validation:** express-validator
- **Security:** Helmet, CORS, Rate Limiting
- **Logging:** Winston
- **Payment:** Stripe (configured)
- **File Storage:** AWS S3 (configured)

## Prerequisites

- Node.js >= 18.0.0
- PostgreSQL >= 14
- npm or yarn

## Installation

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```

4. **Configure your `.env` file:**
   - Update database credentials
   - Set JWT secrets (generate secure random strings)
   - Add Stripe API keys (from Stripe dashboard)
   - Configure AWS S3 (if using file uploads)
   - Set Firebase credentials (for auth)

5. **Create PostgreSQL database:**
   ```bash
   createdb trades_platform_dev
   ```

6. **Create logs directory:**
   ```bash
   mkdir -p logs
   ```

## Running the Server

### Development Mode (with auto-reload):
```bash
npm run dev
# or
yarn dev
```

### Production Mode:
```bash
npm start
# or
yarn start
```

The server will start on `http://localhost:3000` (or the PORT specified in `.env`)

## API Endpoints

### Authentication

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/v1/auth/register` | Register new user | No |
| POST | `/api/v1/auth/login` | Login user | No |
| GET | `/api/v1/auth/me` | Get current user | Yes |
| POST | `/api/v1/auth/refresh` | Refresh access token | No |

### Health Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Check API status |
| GET | `/` | API welcome message |

## API Request Examples

### Register User

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123!",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+1234567890",
    "role": "customer"
  }'
```

### Login

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123!"
  }'
```

### Get Current User (Protected Route)

```bash
curl -X GET http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Database Schema

### Users Table
- id (UUID, PK)
- email (unique)
- phone (unique)
- password_hash
- first_name, last_name
- role (customer, tradesperson, admin)
- profile_image_url
- is_verified, is_active
- last_login
- firebase_uid

### Customer Profiles
- user_id (FK to users)
- addresses (JSONB array)
- payment_methods (JSONB)
- stripe_customer_id

### Tradesperson Profiles
- user_id (FK to users)
- business_name
- trade_specializations (array)
- hourly_rate
- service_areas (array)
- certifications, licenses, insurance_documents (JSONB)
- portfolio_images (array)
- verification_status
- is_available
- average_rating, total_reviews
- stripe_account_id

### Jobs
- customer_id, tradesperson_id (FK to users)
- trade_category, title, description
- images (array)
- location (JSONB)
- scheduled_time
- status (requested, assigned, accepted, in_progress, completed, cancelled)
- payment_status, payment_intent_id

### Reviews
- job_id (FK to jobs)
- reviewer_id, reviewee_id (FK to users)
- rating (0-5)
- comment, images
- response, response_date
- moderation_status

## Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration files
│   │   ├── database.js  # Database connection
│   │   └── logger.js    # Winston logger setup
│   ├── controllers/     # Request handlers
│   │   └── authController.js
│   ├── middleware/      # Express middleware
│   │   ├── auth.js      # JWT authentication
│   │   ├── errorHandler.js
│   │   └── validator.js
│   ├── models/          # Sequelize models
│   │   ├── User.js
│   │   ├── CustomerProfile.js
│   │   ├── TradespersonProfile.js
│   │   ├── Job.js
│   │   ├── Review.js
│   │   └── index.js
│   ├── routes/          # API routes
│   │   └── authRoutes.js
│   ├── services/        # Business logic
│   ├── utils/           # Utility functions
│   │   └── generateToken.js
│   └── server.js        # Express app setup
├── tests/               # Test files
├── logs/                # Log files
├── .env.example         # Environment variables template
├── .gitignore
├── package.json
└── README.md
```

## Environment Variables

See `.env.example` for all required environment variables.

**Critical Variables:**
- `JWT_SECRET` - Must be a strong random string
- `DB_PASSWORD` - PostgreSQL password
- `STRIPE_SECRET_KEY` - Stripe API key
- `AWS_ACCESS_KEY_ID` - AWS credentials (for S3)

## Security Best Practices

1. **Never commit `.env` file** - It's in `.gitignore`
2. **Use strong JWT secrets** - Generate with `openssl rand -base64 32`
3. **Enable HTTPS in production** - Use reverse proxy (nginx)
4. **Keep dependencies updated** - Run `npm audit` regularly
5. **Implement rate limiting** - Already configured
6. **Validate all inputs** - Use express-validator
7. **Use prepared statements** - Sequelize handles this

## Next Steps for Development

### Phase 1 Remaining:
- [ ] Add Swagger/OpenAPI documentation
- [ ] Implement Firebase authentication integration
- [ ] Add more comprehensive tests
- [ ] Set up CI/CD pipeline

### Phase 2: Additional Features
- [ ] Job management endpoints
- [ ] Profile management endpoints
- [ ] Payment processing with Stripe
- [ ] Real-time messaging (Socket.io)
- [ ] Review and rating endpoints
- [ ] File upload handling
- [ ] Search and filtering

## Testing

```bash
npm test
# or
yarn test
```

## Logging

Logs are stored in the `logs/` directory:
- `all.log` - All logs
- `error.log` - Error logs only

Log level can be adjusted in `src/config/logger.js`

## Troubleshooting

### Database Connection Issues
1. Ensure PostgreSQL is running
2. Check database credentials in `.env`
3. Verify database exists: `psql -l`

### Port Already in Use
```bash
# Find process using port 3000
lsof -i :3000
# Kill the process
kill -9 <PID>
```

### JWT Token Issues
- Ensure JWT_SECRET is set in `.env`
- Check token expiration settings
- Verify Authorization header format: `Bearer <token>`

## License

MIT

## Support

For issues and questions, please create an issue in the repository.
