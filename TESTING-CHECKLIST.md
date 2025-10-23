# Testing Checklist - 247 Trades Platform

**Version:** 1.0
**Last Updated:** October 23, 2025
**Phases Covered:** Phase 1 (Foundation) & Phase 2 (User Management)

## Prerequisites

### Environment Setup
- [ ] PostgreSQL database created (`trades_platform_dev`)
- [ ] Node.js 18+ installed
- [ ] Backend dependencies installed (`cd backend && npm install`)
- [ ] Environment variables configured (copy `.env.example` to `.env`)
- [ ] JWT secrets generated and set
- [ ] AWS S3 bucket created (optional for file upload testing)
- [ ] AWS credentials configured (optional for file upload testing)

### Start the Server
```bash
cd backend
npm run dev
```

Server should start on `http://localhost:3000`

---

## Phase 1: Foundation & Authentication Testing

### ✅ Health Check & API Info

- [ ] **Health Check**
  ```bash
  curl http://localhost:3000/health
  ```
  **Expected:** `{"success":true,"message":"247 Trades API is running"}`

- [ ] **API Welcome**
  ```bash
  curl http://localhost:3000/
  ```
  **Expected:** Welcome message with version and docs link

- [ ] **API Documentation**
  - Open in browser: `http://localhost:3000/api/v1/docs`
  - **Expected:** Swagger UI interface loads

---

### ✅ User Registration & Authentication

#### Test 1: Register Customer
- [ ] **Register a customer account**
  ```bash
  curl -X POST http://localhost:3000/api/v1/auth/register \
    -H "Content-Type: application/json" \
    -d '{
      "email": "customer1@test.com",
      "password": "TestPass123!",
      "firstName": "John",
      "lastName": "Doe",
      "phone": "+15551234567",
      "role": "customer"
    }'
  ```
  **Expected:**
  - Status: 201
  - Response includes user object, token, and refreshToken
  - Customer profile automatically created

- [ ] **Save the token** for subsequent tests
  ```bash
  export CUSTOMER_TOKEN="<token_from_response>"
  ```

#### Test 2: Register Tradesperson
- [ ] **Register a tradesperson account**
  ```bash
  curl -X POST http://localhost:3000/api/v1/auth/register \
    -H "Content-Type: application/json" \
    -d '{
      "email": "tradesperson1@test.com",
      "password": "TestPass123!",
      "firstName": "Mike",
      "lastName": "Smith",
      "phone": "+15559876543",
      "role": "tradesperson"
    }'
  ```
  **Expected:**
  - Status: 201
  - Tradesperson profile automatically created

- [ ] **Save the token**
  ```bash
  export TRADESPERSON_TOKEN="<token_from_response>"
  ```

#### Test 3: Register Admin
- [ ] **Register an admin account**
  ```bash
  curl -X POST http://localhost:3000/api/v1/auth/register \
    -H "Content-Type: application/json" \
    -d '{
      "email": "admin@test.com",
      "password": "AdminPass123!",
      "firstName": "Admin",
      "lastName": "User",
      "phone": "+15555555555",
      "role": "admin"
    }'
  ```

- [ ] **Save the admin token**
  ```bash
  export ADMIN_TOKEN="<token_from_response>"
  ```

#### Test 4: Login
- [ ] **Login with customer account**
  ```bash
  curl -X POST http://localhost:3000/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{
      "email": "customer1@test.com",
      "password": "TestPass123!"
    }'
  ```
  **Expected:** Token returned, last_login updated

#### Test 5: Get Current User
- [ ] **Get authenticated user info**
  ```bash
  curl http://localhost:3000/api/v1/auth/me \
    -H "Authorization: Bearer $CUSTOMER_TOKEN"
  ```
  **Expected:** User object with profile included

#### Test 6: Refresh Token
- [ ] **Refresh access token**
  ```bash
  curl -X POST http://localhost:3000/api/v1/auth/refresh \
    -H "Content-Type: application/json" \
    -d '{
      "refreshToken": "<refresh_token_from_registration>"
    }'
  ```
  **Expected:** New access token returned

#### Test 7: Invalid Credentials
- [ ] **Login with wrong password**
  ```bash
  curl -X POST http://localhost:3000/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{
      "email": "customer1@test.com",
      "password": "WrongPassword"
    }'
  ```
  **Expected:** Status 401, error message

#### Test 8: Validation Errors
- [ ] **Register with invalid email**
  ```bash
  curl -X POST http://localhost:3000/api/v1/auth/register \
    -H "Content-Type: application/json" \
    -d '{
      "email": "invalid-email",
      "password": "TestPass123!",
      "firstName": "Test",
      "lastName": "User"
    }'
  ```
  **Expected:** Status 400, validation errors

- [ ] **Register with short password**
  ```bash
  curl -X POST http://localhost:3000/api/v1/auth/register \
    -H "Content-Type: application/json" \
    -d '{
      "email": "test@test.com",
      "password": "short",
      "firstName": "Test",
      "lastName": "User"
    }'
  ```
  **Expected:** Status 400, "Password must be at least 8 characters"

---

## Phase 2: Customer Profile Testing

### ✅ Customer Profile Management

#### Test 1: Get Customer Profile
- [ ] **Get own profile**
  ```bash
  curl http://localhost:3000/api/v1/profiles/customer \
    -H "Authorization: Bearer $CUSTOMER_TOKEN"
  ```
  **Expected:** Customer profile with empty addresses array

#### Test 2: Update Notification Preferences
- [ ] **Update preferences**
  ```bash
  curl -X PUT http://localhost:3000/api/v1/profiles/customer \
    -H "Authorization: Bearer $CUSTOMER_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "notificationPreferences": {
        "email": true,
        "push": true,
        "sms": false,
        "promotions": false
      }
    }'
  ```
  **Expected:** Updated profile with new preferences

---

### ✅ Address Management

#### Test 3: Add Address
- [ ] **Add home address**
  ```bash
  curl -X POST http://localhost:3000/api/v1/profiles/customer/addresses \
    -H "Authorization: Bearer $CUSTOMER_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "label": "Home",
      "street": "123 Main Street",
      "city": "Boston",
      "state": "MA",
      "zipCode": "02101",
      "lat": 42.3601,
      "lng": -71.0589
    }'
  ```
  **Expected:** Address added, addressIndex returned

- [ ] **Add work address**
  ```bash
  curl -X POST http://localhost:3000/api/v1/profiles/customer/addresses \
    -H "Authorization: Bearer $CUSTOMER_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "label": "Work",
      "street": "456 Business Ave",
      "city": "Cambridge",
      "state": "MA",
      "zipCode": "02139",
      "lat": 42.3736,
      "lng": -71.1097
    }'
  ```

#### Test 4: Update Address
- [ ] **Update first address**
  ```bash
  curl -X PUT http://localhost:3000/api/v1/profiles/customer/addresses/0 \
    -H "Authorization: Bearer $CUSTOMER_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "label": "Home (Updated)",
      "street": "123 Main Street, Apt 5B",
      "city": "Boston",
      "state": "MA",
      "zipCode": "02101",
      "lat": 42.3601,
      "lng": -71.0589
    }'
  ```
  **Expected:** Address updated successfully

#### Test 5: Set Default Address
- [ ] **Set second address as default**
  ```bash
  curl -X PUT http://localhost:3000/api/v1/profiles/customer/addresses/1/default \
    -H "Authorization: Bearer $CUSTOMER_TOKEN"
  ```
  **Expected:** default_address_index set to 1

#### Test 6: Delete Address
- [ ] **Delete first address**
  ```bash
  curl -X DELETE http://localhost:3000/api/v1/profiles/customer/addresses/0 \
    -H "Authorization: Bearer $CUSTOMER_TOKEN"
  ```
  **Expected:** Address removed, array updated

---

### ✅ Profile Image Upload

#### Test 7: Upload Profile Image (if AWS configured)
- [ ] **Upload profile image**
  ```bash
  curl -X POST http://localhost:3000/api/v1/profiles/customer/image \
    -H "Authorization: Bearer $CUSTOMER_TOKEN" \
    -F "image=@/path/to/profile.jpg"
  ```
  **Expected:** Image uploaded to S3, URL returned

#### Test 8: Upload Invalid File Type
- [ ] **Try uploading a text file**
  ```bash
  curl -X POST http://localhost:3000/api/v1/profiles/customer/image \
    -H "Authorization: Bearer $CUSTOMER_TOKEN" \
    -F "image=@/path/to/document.txt"
  ```
  **Expected:** Status 400, error message about invalid file type

---

### ✅ Role-Based Access Control

#### Test 9: Tradesperson Cannot Access Customer Routes
- [ ] **Try to get customer profile with tradesperson token**
  ```bash
  curl http://localhost:3000/api/v1/profiles/customer \
    -H "Authorization: Bearer $TRADESPERSON_TOKEN"
  ```
  **Expected:** Status 403, "not authorized" message

---

## Phase 2: Tradesperson Profile Testing

### ✅ Tradesperson Profile Management

#### Test 1: Get Own Profile
- [ ] **Get tradesperson profile**
  ```bash
  curl http://localhost:3000/api/v1/profiles/tradesperson \
    -H "Authorization: Bearer $TRADESPERSON_TOKEN"
  ```
  **Expected:** Tradesperson profile with business_name

#### Test 2: Update Profile
- [ ] **Update business information**
  ```bash
  curl -X PUT http://localhost:3000/api/v1/profiles/tradesperson \
    -H "Authorization: Bearer $TRADESPERSON_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "businessName": "Mike Smith Electrical Services",
      "bio": "Licensed electrician with 10+ years of experience",
      "hourlyRate": 85.00,
      "tradeSpecializations": ["Electrician", "HVAC"],
      "serviceAreas": ["Boston", "Cambridge", "Somerville"]
    }'
  ```
  **Expected:** Profile updated successfully

#### Test 3: Toggle Availability
- [ ] **Set available**
  ```bash
  curl -X PUT http://localhost:3000/api/v1/profiles/tradesperson/availability \
    -H "Authorization: Bearer $TRADESPERSON_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"isAvailable": true}'
  ```
  **Expected:** is_available set to true

- [ ] **Set unavailable**
  ```bash
  curl -X PUT http://localhost:3000/api/v1/profiles/tradesperson/availability \
    -H "Authorization: Bearer $TRADESPERSON_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"isAvailable": false}'
  ```

---

### ✅ Document Uploads (if AWS configured)

#### Test 4: Add Certification
- [ ] **Upload certification**
  ```bash
  curl -X POST http://localhost:3000/api/v1/profiles/tradesperson/certifications \
    -H "Authorization: Bearer $TRADESPERSON_TOKEN" \
    -F "document=@/path/to/certification.pdf" \
    -F "name=Master Electrician" \
    -F "issuer=State Licensing Board" \
    -F "issueDate=2020-01-15" \
    -F "expiryDate=2025-01-15" \
    -F "certificateNumber=ME-12345"
  ```
  **Expected:** Certification added, document uploaded to S3

#### Test 5: Add License
- [ ] **Upload license**
  ```bash
  curl -X POST http://localhost:3000/api/v1/profiles/tradesperson/licenses \
    -H "Authorization: Bearer $TRADESPERSON_TOKEN" \
    -F "document=@/path/to/license.pdf" \
    -F "licenseNumber=EL-98765" \
    -F "state=MA" \
    -F "licenseType=Master Electrician" \
    -F "issueDate=2019-06-01" \
    -F "expiryDate=2024-06-01"
  ```
  **Expected:** License added with document URL

#### Test 6: Add Insurance
- [ ] **Upload insurance document**
  ```bash
  curl -X POST http://localhost:3000/api/v1/profiles/tradesperson/insurance \
    -H "Authorization: Bearer $TRADESPERSON_TOKEN" \
    -F "document=@/path/to/insurance.pdf" \
    -F "provider=State Farm" \
    -F "policyNumber=INS-456789" \
    -F "coverageAmount=1000000" \
    -F "insuranceType=General Liability" \
    -F "expiryDate=2024-12-31"
  ```
  **Expected:** Insurance document added

---

### ✅ Portfolio Management

#### Test 7: Add Portfolio Images
- [ ] **Add first portfolio image**
  ```bash
  curl -X POST http://localhost:3000/api/v1/profiles/tradesperson/portfolio \
    -H "Authorization: Bearer $TRADESPERSON_TOKEN" \
    -F "image=@/path/to/work1.jpg"
  ```

- [ ] **Add second portfolio image**
  ```bash
  curl -X POST http://localhost:3000/api/v1/profiles/tradesperson/portfolio \
    -H "Authorization: Bearer $TRADESPERSON_TOKEN" \
    -F "image=@/path/to/work2.jpg"
  ```
  **Expected:** Images added to portfolio_images array

#### Test 8: Delete Portfolio Image
- [ ] **Delete first portfolio image**
  ```bash
  curl -X DELETE http://localhost:3000/api/v1/profiles/tradesperson/portfolio/0 \
    -H "Authorization: Bearer $TRADESPERSON_TOKEN"
  ```
  **Expected:** Image removed from S3 and array

#### Test 9: Portfolio Limit
- [ ] **Try adding 21st image** (should fail)
  - First, add 20 images
  - Then try to add one more
  **Expected:** Status 400, "Maximum 20 portfolio images allowed"

---

### ✅ Statistics

#### Test 10: Get Tradesperson Stats
- [ ] **Get statistics**
  ```bash
  curl http://localhost:3000/api/v1/profiles/tradesperson/stats \
    -H "Authorization: Bearer $TRADESPERSON_TOKEN"
  ```
  **Expected:** Statistics with jobs, earnings, ratings

---

### ✅ Public Profile

#### Test 11: Get Public Profile (requires verification first)
- [ ] **Get tradesperson ID from profile**
- [ ] **Get public profile**
  ```bash
  curl http://localhost:3000/api/v1/profiles/tradesperson/<TRADESPERSON_USER_ID>/public
  ```
  **Expected:** Status 404 (tradesperson not verified yet)

---

## Phase 2: Admin Testing

### ✅ Platform Statistics

#### Test 1: Get Platform Stats
- [ ] **Get platform statistics**
  ```bash
  curl http://localhost:3000/api/v1/admin/stats \
    -H "Authorization: Bearer $ADMIN_TOKEN"
  ```
  **Expected:** User counts, verification counts, job stats

---

### ✅ User Management

#### Test 2: Get All Users
- [ ] **Get all users with default pagination**
  ```bash
  curl http://localhost:3000/api/v1/admin/users \
    -H "Authorization: Bearer $ADMIN_TOKEN"
  ```
  **Expected:** Paginated list of users

- [ ] **Filter by role**
  ```bash
  curl "http://localhost:3000/api/v1/admin/users?role=tradesperson" \
    -H "Authorization: Bearer $ADMIN_TOKEN"
  ```

- [ ] **Filter by verified status**
  ```bash
  curl "http://localhost:3000/api/v1/admin/users?isVerified=false" \
    -H "Authorization: Bearer $ADMIN_TOKEN"
  ```

#### Test 3: Deactivate User
- [ ] **Deactivate a user account**
  ```bash
  curl -X PUT http://localhost:3000/api/v1/admin/users/<USER_ID>/deactivate \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "reason": "Violation of terms of service"
    }'
  ```
  **Expected:** User deactivated

- [ ] **Try to login with deactivated account**
  **Expected:** Login should fail

#### Test 4: Reactivate User
- [ ] **Reactivate the user**
  ```bash
  curl -X PUT http://localhost:3000/api/v1/admin/users/<USER_ID>/reactivate \
    -H "Authorization: Bearer $ADMIN_TOKEN"
  ```
  **Expected:** User reactivated, can login again

---

### ✅ Verification Management

#### Test 5: Get Pending Verifications
- [ ] **Get pending verification queue**
  ```bash
  curl http://localhost:3000/api/v1/admin/verifications/pending \
    -H "Authorization: Bearer $ADMIN_TOKEN"
  ```
  **Expected:** List of tradespeople awaiting verification

#### Test 6: Get Verification Details
- [ ] **Get tradesperson verification details**
  ```bash
  curl http://localhost:3000/api/v1/admin/verifications/<TRADESPERSON_USER_ID> \
    -H "Authorization: Bearer $ADMIN_TOKEN"
  ```
  **Expected:** Full profile with certifications, licenses, insurance

#### Test 7: Approve Verification
- [ ] **Approve a tradesperson**
  ```bash
  curl -X POST http://localhost:3000/api/v1/admin/verifications/<TRADESPERSON_USER_ID>/approve \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "notes": "All documents verified and approved"
    }'
  ```
  **Expected:**
  - verification_status set to "verified"
  - user.is_verified set to true

- [ ] **Now check public profile**
  ```bash
  curl http://localhost:3000/api/v1/profiles/tradesperson/<TRADESPERSON_USER_ID>/public
  ```
  **Expected:** Public profile now accessible

#### Test 8: Reject Verification
- [ ] **Register another tradesperson for rejection test**
- [ ] **Reject the tradesperson**
  ```bash
  curl -X POST http://localhost:3000/api/v1/admin/verifications/<USER_ID>/reject \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "reason": "Expired certifications, please resubmit current documents"
    }'
  ```
  **Expected:** verification_status set to "rejected"

#### Test 9: Request Additional Documents
- [ ] **Request more documents**
  ```bash
  curl -X POST http://localhost:3000/api/v1/admin/verifications/<USER_ID>/request-documents \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "message": "Please upload proof of insurance coverage"
    }'
  ```
  **Expected:** verification_notes updated

---

### ✅ Role-Based Access Control

#### Test 10: Customer Cannot Access Admin Routes
- [ ] **Try to access admin stats with customer token**
  ```bash
  curl http://localhost:3000/api/v1/admin/stats \
    -H "Authorization: Bearer $CUSTOMER_TOKEN"
  ```
  **Expected:** Status 403, "not authorized"

#### Test 11: Tradesperson Cannot Access Admin Routes
- [ ] **Try to access admin routes with tradesperson token**
  ```bash
  curl http://localhost:3000/api/v1/admin/users \
    -H "Authorization: Bearer $TRADESPERSON_TOKEN"
  ```
  **Expected:** Status 403, "not authorized"

---

## Database Verification

### ✅ Check Database Records

Using PostgreSQL client (`psql`):

- [ ] **Connect to database**
  ```bash
  psql -d trades_platform_dev
  ```

- [ ] **Check users**
  ```sql
  SELECT id, email, role, is_verified, is_active FROM users;
  ```
  **Expected:** 3+ users (customer, tradesperson, admin)

- [ ] **Check customer profiles**
  ```sql
  SELECT user_id, addresses, default_address_index FROM customer_profiles;
  ```
  **Expected:** Customer profile with addresses

- [ ] **Check tradesperson profiles**
  ```sql
  SELECT user_id, business_name, verification_status, is_available
  FROM tradesperson_profiles;
  ```
  **Expected:** Tradesperson profile with updated info

---

## Error Handling Testing

### ✅ Authentication Errors

- [ ] **No token provided**
  ```bash
  curl http://localhost:3000/api/v1/profiles/customer
  ```
  **Expected:** Status 401, "Not authorized, no token"

- [ ] **Invalid token**
  ```bash
  curl http://localhost:3000/api/v1/profiles/customer \
    -H "Authorization: Bearer invalid_token_here"
  ```
  **Expected:** Status 401, "Not authorized, token failed"

- [ ] **Expired token** (if you have an old token)
  **Expected:** Status 401, "Token expired"

---

### ✅ Validation Errors

- [ ] **Missing required fields**
  ```bash
  curl -X POST http://localhost:3000/api/v1/profiles/customer/addresses \
    -H "Authorization: Bearer $CUSTOMER_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"label": "Home"}'
  ```
  **Expected:** Status 400, validation errors for missing fields

- [ ] **Invalid data types**
  ```bash
  curl -X PUT http://localhost:3000/api/v1/profiles/tradesperson/availability \
    -H "Authorization: Bearer $TRADESPERSON_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"isAvailable": "yes"}'
  ```
  **Expected:** Status 400, "isAvailable must be a boolean"

---

### ✅ Not Found Errors

- [ ] **Invalid user ID**
  ```bash
  curl http://localhost:3000/api/v1/admin/verifications/00000000-0000-0000-0000-000000000000 \
    -H "Authorization: Bearer $ADMIN_TOKEN"
  ```
  **Expected:** Status 404, "Tradesperson profile not found"

- [ ] **Invalid route**
  ```bash
  curl http://localhost:3000/api/v1/nonexistent
  ```
  **Expected:** Status 404, "Route not found"

---

## Performance Testing (Optional)

### ✅ Load Testing

- [ ] **Multiple concurrent requests** (using Apache Bench or similar)
  ```bash
  ab -n 100 -c 10 http://localhost:3000/health
  ```
  **Expected:** All requests successful

- [ ] **Rate limiting test**
  ```bash
  for i in {1..150}; do curl http://localhost:3000/api/v1/auth/login; done
  ```
  **Expected:** After 100 requests, should get rate limit error

---

## Logging Verification

### ✅ Check Logs

- [ ] **Check console logs** - Server should be logging requests
- [ ] **Check log files**
  ```bash
  cat backend/logs/all.log | tail -50
  cat backend/logs/error.log
  ```
  **Expected:** Proper logging of requests and errors

---

## Testing Summary

### Total Tests: ~70+

| Category | Tests | Status |
|----------|-------|--------|
| **Phase 1: Foundation** | 8 | ⬜ |
| **Authentication** | 8 | ⬜ |
| **Customer Profiles** | 9 | ⬜ |
| **Tradesperson Profiles** | 11 | ⬜ |
| **Admin Functions** | 11 | ⬜ |
| **Database Verification** | 3 | ⬜ |
| **Error Handling** | 6 | ⬜ |
| **Security (RBAC)** | 4 | ⬜ |
| **Performance** | 2 | ⬜ |
| **Logging** | 2 | ⬜ |

---

## Known Limitations

1. **AWS S3 Required** - File upload tests require AWS S3 configuration
2. **PostgreSQL Required** - Database must be running and configured
3. **Email Notifications** - Not implemented yet (Phase 5)
4. **Payment Processing** - Not implemented yet (Phase 4)
5. **Real-time Features** - Not implemented yet (Phase 5)

---

## Next Phase Testing

After Phase 3 (Job Management) is complete, add:
- Job creation tests
- Job matching tests
- Job status workflow tests
- Job search and filtering tests

---

## Notes

- Save all tokens in environment variables for easier testing
- Test files should be prepared (profile.jpg, certification.pdf, etc.)
- Each test should be independent
- Clean database state between full test runs if needed
- Check server logs for any errors during testing

---

**Testing Completion:** ⬜ Not Started | ⏳ In Progress | ✅ Complete
