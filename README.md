# Witchly App API

A modern TypeScript Express.js API with GraphQL and MongoDB integration, featuring comprehensive tooling for development, testing, and code quality.

## 📚 Table of Contents

- [🚀 Tech Stack](#-tech-stack)
- [📋 Prerequisites](#-prerequisites)
- [🛠️ Setup](#️-setup)
- [🏗️ Project Structure](#️-project-structure)
- [📊 Database (MongoDB + Mongoose)](#-database-mongodb--mongoose)
- [🔗 GraphQL API (Apollo Server + type-graphql)](#-graphql-api-apollo-server--type-graphql)
- [⚠️ Error Handling with HTTP Status Codes](#️-error-handling-with-http-status-codes)
- [📧 Email Service & Two-Phase Signup System](#-email-service--two-phase-signup-system)
- [👤 User Profile System](#-user-profile-system)
- [🔐 JWT Authentication (Client Credentials)](#-jwt-authentication-client-credentials)
- [🔒 Comprehensive Scope Validation System](#-comprehensive-scope-validation-system)
- [📱 Session Management System](#-session-management-system)
- [🛡️ Advanced Session Security Features](#️-advanced-session-security-features)
- [🔮 Tarot Deck Management System](#-tarot-deck-management-system)
- [🧪 Comprehensive Testing Suite](#-comprehensive-testing-suite)
- [📋 Postman Collection](#-postman-collection)
- [🚀 DevOps & Development Tools](#-devops--development-tools)
- [🌐 Production Deployment](#-production-deployment)
- [🔧 Development Workflow](#-development-workflow)
- [📝 Environment Variables](#-environment-variables)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)

## 🚀 Tech Stack

- **Runtime**: Node.js 22.18.0 with TypeScript
- **Framework**: Express.js 5.x
- **Database**: MongoDB with Mongoose ODM
- **API**: GraphQL with Apollo Server v5 and type-graphql
- **Authentication**: JWT with OAuth2 Client Credentials flow and comprehensive scope validation
- **Session Management**: User sessions with JWT tokens and refresh token support
- **Testing**: Jest with Supertest for HTTP testing
- **Code Quality**: Biome for linting and formatting
- **Git Hooks**: Husky with lint-staged for pre-commit checks
- **CI/CD**: GitHub Actions
- **Environment**: dotenv for configuration management

## 📋 Prerequisites

- Node.js 22.18.0 (use `.nvmrc` for version management)
- MongoDB (local installation or MongoDB Atlas)
- Git

## 🛠️ Setup

### 1. Clone and Install

```bash
git clone https://github.com/rardoz/witchly-app-api.git
cd witchly-app-api
npm install
```

### 2. Environment Configuration

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your configuration
MONGODB_URI=mongodb://localhost:27017/witchly-app-dev
NODE_ENV=development
PORT=3000
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

### 3. Start Development

```bash
# Start development server with hot reload
npm run dev

# Or build and start production mode
npm run build
npm start
```

The API will be available at:
- **GraphQL endpoint**: `http://localhost:3000/graphql` (primary endpoint for all operations)
- **GraphQL Playground**: Available in development for schema exploration

### 4. Create OAuth2 Clients

Create your first OAuth2 client to start using the API:

```bash
# Create an admin client (full access)
npm run setup:client -- --preset admin --name "My Admin Client"

# Or create a standard client (read/write access)
npm run setup:client -- --preset read-write --name "My App"
```

💡 **See the [Authentication section](#-jwt-authentication-client-credentials) for detailed client setup options and usage.**

## 🏗️ Project Structure

```
src/
├── config/
│   └── database.ts          # MongoDB connection configuration
├── models/
│   ├── User.ts              # User model and interface
│   └── Client.ts            # OAuth2 client model for authentication
├── services/
│   └── jwt.service.ts       # JWT token generation and validation
├── utils/
│   ├── errors.ts            # Custom error classes
│   └── scopes.ts            # OAuth2 scope validation system
├── middleware/
│   └── auth.middleware.ts   # Enhanced unified authentication middleware (OAuth2 + sessions)
├── graphql/
│   ├── types/
│   │   ├── User.ts          # GraphQL type definitions
│   │   ├── ClientType.ts    # Client management types
│   │   ├── SessionTypes.ts  # Session management types (NEW)
│   │   └── Auth.ts          # Authentication response types
│   ├── inputs/
│   │   ├── UserInput.ts     # Input types for mutations
│   │   └── SessionInput.ts  # Session operation inputs (NEW)
│   ├── resolvers/
│   │   ├── UserResolver.ts  # User operations with enhanced scope validation
│   │   ├── ClientResolver.ts # Client management (admin only)
│   │   ├── AuthResolver.ts  # Authentication mutations
│   │   ├── LoginResolver.ts # Unified login with session support (ENHANCED)
│   │   └── SessionResolver.ts # Session management operations (NEW)
│   └── server.ts            # Apollo Server setup with enhanced auth context
├── services/
│   ├── jwt.service.ts       # JWT token generation and validation
│   └── session.service.ts   # Session management service (NEW)
├── test/
│   ├── setup.ts             # Enhanced Jest test configuration with dual auth support
│   ├── app.test.ts          # Basic app tests
│   ├── auth.test.ts         # Authentication flow tests
│   ├── session.test.ts      # Session management tests (NEW)
│   ├── scopes.test.ts       # Scope validation unit tests
│   ├── required-scope.test.ts # Required scope parameter tests
│   ├── tarot-deck-resolver.test.ts # Tarot deck operations with dual auth (NEW)
│   └── auth-scope-validation.test.ts # Scope integration tests
├── app.ts                   # Express app with GraphQL and enhanced auth
└── index.ts                 # Server entry point
```

## 📊 Database (MongoDB + Mongoose)

### Connection Management

The app uses Mongoose ODM for MongoDB operations with automatic connection management:

```typescript
// Database connection with error handling
await connectDB();

// Models with TypeScript interfaces
export interface IUser extends Document {
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true }
}, { timestamps: true });

export const User = model<IUser>('User', userSchema);
```

### Environment-Specific Databases

- **Development**: `mongodb://localhost:27017/witchly-app-dev`
- **Test**: Uses mock/in-memory database (no MongoDB required)
- **Production**: Configure with MongoDB Atlas or your production instance

## 🔗 GraphQL API (Apollo Server + type-graphql)

### Schema-First Approach

The API uses type-graphql for TypeScript-first GraphQL development:

```typescript
@ObjectType()
export class User {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field()
  email: string;
}

@Resolver(() => User)
export class UserResolver {
  @Query(() => [User])
  async users(): Promise<User[]> {
    return await UserModel.find();
  }

  @Mutation(() => User)
  async createUser(@Arg('input', () => CreateUserInput) input: CreateUserInput): Promise<User> {
    return await UserModel.create(input);
  }
}
```

### Available Operations

**Authentication:**
- `authenticate(grant_type, client_id, client_secret, scope?)` - Get JWT access token

**User Operations:**
- `users(limit?, offset?)` - Fetch all users with pagination
- `user(id: ID!)` - Fetch user by ID
- `createUser(input: CreateUserInput!)` - Create new user
- `updateUser(id: ID!, input: UpdateUserInput!)` - Update user
- `deleteUser(id: ID!)` - Delete user

## 🔮 Tarot Deck Management System (NEW)

### Overview

The Witchly App API now includes a comprehensive tarot deck management system with full CRUD operations, advanced validation, and dual authentication requirements for administrative operations.

### Tarot Deck Features

#### Complete CRUD Operations
- **Create Tarot Decks**: Full deck creation with comprehensive metadata
- **Read Operations**: Paginated listing, individual deck lookup, status-based filtering
- **Update Operations**: Partial updates with conflict detection
- **Delete Operations**: Both soft delete (status change) and hard delete (permanent removal)

#### Advanced Field Support (24 Fields)
- **Core Information**: `name`, `description` (up to 5000 characters), `author`, `status`
- **Visual Elements**: `primaryImageUrl`, `cardBackgroundUrl`, `primaryColor` (hex validation)
- **Layout Configuration**: `layoutType`, `layoutCount` (1-50 range validation)
- **Metadata**: `meta` array (up to 20 tags), timestamps (`createdAt`, `updatedAt`)
- **Status Management**: `active` or `paused` status with filtering support

#### Flexible Validation System
- **Optional Fields**: All fields except `status` are optional for maximum flexibility
- **URL Validation**: Automatic validation for image URLs when provided
- **Hex Color Validation**: Primary color field accepts standard hex format (#RRGGBB)
- **Range Validation**: Layout count enforced between 1-50 items
- **Length Limits**: Description supports up to 5000 characters, meta limited to 20 items

### API Endpoints

#### Query Operations (Read Scope Required)

**Get Paginated Tarot Decks**
```graphql
query GetTarotDecks($status: String, $limit: Int, $offset: Int) {
  tarotDecks(status: $status, limit: $limit, offset: $offset) {
    id
    name
    primaryImageUrl
    cardBackgroundUrl
    primaryColor
    description
    author
    meta
    layoutType
    layoutCount
    status
    createdAt
    updatedAt
  }
}
```

**Get Single Tarot Deck**
```graphql
query GetTarotDeck($id: ID!) {
  tarotDeck(id: $id) {
    id
    name
    description
    author
    status
    # ... all fields available
  }
}
```

**Filter Decks by Status**
```graphql
query GetTarotDecksByStatus($status: String!) {
  tarotDecksByStatus(status: $status) {
    id
    name
    status
    createdAt
  }
}
```

#### Mutation Operations (Write + Admin Session Required)

**Create Tarot Deck** (Requires OAuth2 write scope + admin user session)
```graphql
mutation CreateTarotDeck($input: CreateTarotDeckInput!) {
  createTarotDeck(input: $input) {
    # Returns all deck fields directly (no nested deck object)
    success
    message
    id
    name
    primaryImageUrl
    cardBackgroundUrl
    primaryColor
    description
    author
    meta
    layoutType
    layoutCount
    status
    createdAt
    updatedAt
  }
}
```

**Update Tarot Deck** (Requires OAuth2 write scope + admin user session)
```graphql
mutation UpdateTarotDeck($id: ID!, $input: UpdateTarotDeckInput!) {
  updateTarotDeck(id: $id, input: $input) {
    # Same response structure as create
    success
    message
    id
    name
    # ... all updated fields
  }
}
```

**Delete Tarot Deck** (Requires OAuth2 write scope)
```graphql
# Soft delete (sets status to 'paused')
mutation DeleteTarotDeck($id: ID!) {
  deleteTarotDeck(id: $id, hardDelete: false) {
    success
    message
  }
}

# Hard delete (permanent removal)
mutation DeleteTarotDeck($id: ID!) {
  deleteTarotDeck(id: $id, hardDelete: true) {
    success
    message
  }
}
```

### Dual Authentication Requirements

Tarot deck create and update operations require **enhanced dual authentication**:

#### Required Headers for Admin Operations
```http
# OAuth2 client credentials (write scope required)
Authorization: Bearer <oauth2_access_token>

# User session token (admin scope required)
X-Session-Token: <admin_user_session_token>
```

#### Permission Matrix

| Operation | OAuth2 Scope | User Session | Admin Session |
|-----------|---------------|--------------|---------------|
| Query decks | `read` | Not required | Not required |
| Get single deck | `read` | Not required | Not required |
| Create deck | `write` | Required | **Admin required** |
| Update deck | `write` | Required | **Admin required** |
| Delete deck | `write` | Not required | Not required |

### Example Input Data

#### Comprehensive Deck Creation
```graphql
{
  "input": {
    "name": "Mystic Dreams Tarot",
    "primaryImageUrl": "https://example.com/mystic-dreams.jpg",
    "cardBackgroundUrl": "https://example.com/card-back.jpg", 
    "primaryColor": "#6B46C1",
    "description": "A beautiful tarot deck inspired by mystical dreams and celestial energies. Perfect for beginners and experienced readers alike.",
    "author": "Luna Starweaver",
    "meta": ["mystical", "dreams", "celestial", "beginner-friendly"],
    "layoutType": "classic",
    "layoutCount": 3,
    "status": "active"
  }
}
```

#### Minimal Deck Creation (Only Status Required)
```graphql
{
  "input": {
    "status": "active"
  }
}
```

### Enhanced Response Structure

**Breaking Change from Standard Pattern**: Tarot deck create and update responses extend `TarotDeckType` directly instead of using a nested `deck` field:

```graphql
# NEW: Deck fields directly in response
{
  "data": {
    "createTarotDeck": {
      "success": true,
      "message": "Tarot deck created successfully",
      "id": "deck_123...",
      "name": "Mystic Dreams Tarot",
      "status": "active"
      # ... all deck fields available directly
    }
  }
}

# OLD: Nested deck structure (no longer used)
{
  "data": {
    "createTarotDeck": {
      "success": true,
      "message": "...",
      "deck": {  # ❌ No longer nested
        "id": "...",
        "name": "..."
      }
    }
  }
}
```

### Database Schema

#### TarotDeck Model
```typescript
export interface ITarotDeck extends Document {
  name?: string;                    // Optional: Deck name (max 100 chars)
  primaryImageUrl?: string;         // Optional: Main deck image
  cardBackgroundUrl?: string;       // Optional: Card back design
  primaryColor?: string;            // Optional: Hex color (#RRGGBB)
  description?: string;             // Optional: Full description (max 5000 chars)
  author?: string;                  // Optional: Deck creator (max 100 chars)
  meta?: string[];                  // Optional: Tags array (max 20 items)
  layoutType?: string;              // Optional: Layout style (default: 'default')
  layoutCount?: number;             // Optional: Layout cards count (1-50, default: 1)
  status: 'active' | 'paused';      // Required: Deck availability status
  createdAt: Date;                  // Auto: Creation timestamp
  updatedAt: Date;                  // Auto: Last update timestamp
}
```

#### Database Indexes
- `{ name: 1 }` - Unique deck name lookup
- `{ author: 1 }` - Author-based queries
- `{ status: 1 }` - Status filtering
- `{ layoutType: 1 }` - Layout-based filtering
- `{ createdAt: -1 }` - Chronological sorting
- `{ author: 1, status: 1 }` - Compound author + status queries

### Validation Features

#### URL Validation
```typescript
// Validates format when provided
const urlPattern = /^https?:\/\/.+\..+/;
```

#### Hex Color Validation
```typescript
// Validates standard hex format
const hexPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
```

#### Meta Array Validation
```typescript
// Enforces maximum tag limit
if (meta.length > 20) {
  throw new ValidationError('Meta array cannot contain more than 20 items');
}
```

### Error Handling

#### Common Error Scenarios
```graphql
# Duplicate name conflict (409)
{
  "errors": [{
    "message": "A tarot deck with this name already exists",
    "extensions": { "code": "CONFLICT" }
  }]
}

# Admin session required (401)
{
  "errors": [{
    "message": "Admin session access required to create tarot decks", 
    "extensions": { "code": "UNAUTHORIZED" }
  }]
}

# Validation error (400)
{
  "errors": [{
    "message": "Layout count must be between 1 and 50",
    "extensions": { "code": "VALIDATION_ERROR" }
  }]
}
```

### Testing Coverage

The tarot deck system includes **comprehensive test coverage**:

- **13 Test Cases**: Complete CRUD operation testing
- **Dual Authentication Testing**: Admin session requirement validation
- **Permission Matrix Testing**: Various permission combinations
- **Validation Testing**: All field validation scenarios
- **Error Handling Testing**: Complete error response coverage
- **Edge Case Testing**: Pagination, limits, conflicts

#### Test Structure Example
```typescript
describe('TarotDeckResolver GraphQL Endpoints', () => {
  it('should require admin session scope for deck creation', async () => {
    const response = await global.basicUserBasicAppTestRequest()
      .send({
        query: createTarotDeckMutation,
        variables: { input: validDeckData }
      });

    expect(response.status).toBe(401);
    expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
    expect(response.body.errors[0].message).toContain('Admin session access required');
  });
});
```

### Postman Collection Integration

The tarot deck endpoints are fully integrated into the Postman collection with:

- **7 Pre-configured Endpoints**: All CRUD operations with sample data
- **Proper Authentication**: OAuth2 + session token configuration
- **Sample Variables**: Realistic test data for all operations
- **Error Examples**: Common error scenarios documented
- **Variable Placeholders**: Easy customization with `DECK_ID_HERE` markers

The tarot deck management system provides a robust foundation for content management while maintaining the highest security standards through dual authentication requirements for administrative operations.

**Example Queries:**

```graphql
# Get all users (requires authentication)
query {
  users(limit: 10, offset: 0) {
    id
    name
    email
    createdAt
  }
}

# Create a new user
mutation {
  createUser(input: {
    name: "John Doe"
    email: "john@example.com"
    userType: "user"
  }) {
    id
    name
    email
  }
}

# Get access token (must specify required scopes)
mutation {
  authenticate(
    grant_type: "client_credentials"
    client_id: "your_client_id"
    client_secret: "your_client_secret"
    scope: "read write"
  ) {
    access_token
    expires_in
    scope
  }
}
```

### GraphQL Playground

In development mode, you can explore the API using GraphQL introspection at `http://localhost:3000/graphql`.

## ⚠️ Error Handling with HTTP Status Codes

The GraphQL API properly handles HTTP status codes for different error scenarios, providing both GraphQL errors and appropriate HTTP status codes through Apollo Server v5's custom response processing.

### Custom Error Classes

The API includes custom error classes in `src/utils/errors.ts` that extend GraphQLError:

- `ValidationError` (400) - Input validation failures, invalid parameters
- `UnauthorizedError` (401) - Authentication required or invalid credentials  
- `ForbiddenError` (403) - Insufficient permissions/scopes
- `NotFoundError` (404) - Resource not found
- `ConflictError` (409) - Resource already exists (duplicate email, handle, etc.)
- `TooManyRequestsError` (429) - Rate limiting exceeded

### Error Response Structure

All errors follow this consistent format:
```json
{
  "errors": [
    {
      "message": "User not found",
      "locations": [{"line": 2, "column": 3}],
      "path": ["user"],
      "extensions": {
        "code": "NOT_FOUND",
        "http": {
          "status": 404
        }
      }
    }
  ],
  "data": null
}
```

### Common Error Scenarios

#### Authentication Errors (401)
```graphql
# Missing or invalid JWT token
query { users { id name } }
```
Response: `"Unauthorized: Read access required"` with HTTP 401

#### Scope Permission Errors (403)  
```graphql
# User token trying to access admin endpoint
query { clients { clientId name } }
```
Response: `"Forbidden: Admin access required"` with HTTP 403

#### Validation Errors (400)
```graphql
# Invalid pagination limit
query { users(limit: 150) { id } }
```
Response: `"Limit must be between 1 and 100"` with HTTP 400

#### Rate Limiting (429)
```graphql
# Requesting verification code too frequently
mutation {
  initiateSignup(input: { email: "test@example.com" }) {
    success
  }
}
```
Response: `"Please wait before requesting another verification code"` with HTTP 429

#### Resource Conflicts (409)
```graphql
# Email already exists during signup
mutation {
  completeSignup(input: { 
    email: "existing@example.com"
    verificationCode: "123456"
  }) {
    success
  }
}
```
Response: `"User with this email already exists"` with HTTP 409

## � Email Service & Two-Phase Signup System

The API features a sophisticated two-phase signup system with email verification, powered by AWS SES integration.

### Email Service Configuration

#### AWS SES Setup
```bash
# Required environment variables for production
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-aws-ses-smtp-username
SMTP_PASS=your-aws-ses-smtp-password
EMAIL_FROM=noreply@witchly.app
EMAIL_FROM_NAME=Witchly
```

#### Development Configuration
```bash
# For development (emails logged to console)
NODE_ENV=development
# SMTP credentials optional in development
```

### Two-Phase Signup Flow

The signup process requires two steps for security and email verification:

#### Phase 1: Initiate Signup
```graphql
mutation InitiateSignup {
  initiateSignup(input: {
    email: "user@example.com"
  }) {
    success
    message
    expiresAt  # Verification code expiry time
  }
}
```

**What happens:**
1. Validates email format and checks for existing users
2. Generates a secure 6-digit verification code (hashed with bcrypt)
3. Sends verification email via AWS SES
4. Rate limiting: 1-minute cooldown between requests
5. Code expires in 10 minutes

#### Phase 2: Complete Signup
```graphql
mutation CompleteSignup {
  completeSignup(input: {
    email: "user@example.com"
    verificationCode: "123456"
  }) {
    success
    message
    user {
      id
      email
      handle        # Auto-generated unique handle
      emailVerified # true after successful verification
    }
  }
}
```

**What happens:**
1. Validates verification code (max 3 attempts)
2. Creates user account with auto-generated unique handle
3. Marks email as verified
4. Cleans up verification records

### Email Templates

#### Verification Email Template
- **Subject**: "Verify your email address"
- **HTML Version**: Branded template with verification code
- **Security**: 6-digit codes, 10-minute expiration

#### Rate Limiting & Security Features

- **1-minute cooldown** between verification code requests
- **3-attempt limit** for code verification
- **bcrypt hashing** for stored verification codes
- **Auto-cleanup** via MongoDB TTL indexes
- **Graceful email failures** (signup doesn't fail if email sending fails)

### Signup Error Handling

```graphql
# Email already exists
mutation { initiateSignup(input: { email: "existing@example.com" }) }
# Returns: ConflictError (409) "User with this email already exists"

# Rate limiting exceeded
mutation { initiateSignup(input: { email: "test@example.com" }) }
# (within 1 minute of previous request)
# Returns: TooManyRequestsError (429) "Please wait before requesting another verification code"

# Invalid verification code
mutation { completeSignup(input: { email: "test@example.com", verificationCode: "wrong" }) }
# Returns: ValidationError (400) "Invalid verification code"

# Expired verification code
mutation { completeSignup(input: { email: "test@example.com", verificationCode: "123456" }) }
# (after 10 minutes)
# Returns: NotFoundError (404) "Verification code not found or expired"
```

### Testing Email Service

#### Development Mode
```bash
NODE_ENV=development npm run dev
```
- Emails are logged to console instead of being sent
- All verification codes are displayed in console output

#### Production Testing
```bash
# Test email service connection
npm run test:email
```

## 👤 User Profile System

The API supports comprehensive user profiles with 24 fields covering personal information, social media handles, preferences, and permission management.

### Core Profile Fields

#### User Management & Permissions
- `allowedScopes` - Array of permitted scopes for the user (`read`, `write`, `admin`, `basic`)
- `handle` - Unique user identifier/username
- `email` - Email address (unique, verified through signup process)
- `emailVerified` - Boolean flag indicating email verification status
- `userType` - User classification (defaults to 'basic')

#### Personal Information
- `name` - Full name (1-100 characters)
- `bio` - Long biography (1-500 characters)  
- `shortBio` - Brief description (1-150 characters)
- `location` - Geographic location (1-100 characters)
- `pronouns` - Preferred pronouns (1-50 characters)
- `sign` - Astrological sign (1-20 characters)
- `sex` - Gender identity (`male`, `female`, `non-binary`, `prefer-not-to-say`)

#### Visual & Media
- `profileImageUrl` - Profile picture URL
- `backdropImageUrl` - Background/banner image URL
- `primaryColor` - Hex color code (#RRGGBB format)
- `secondaryColor` - Secondary hex color code
- `websiteUrl` - Personal website URL

#### Social Media Integration
- `instagramHandle` - Instagram username (1-30 chars, alphanumeric + . _)
- `tikTokHandle` - TikTok username (1-25 chars, alphanumeric + . _)
- `twitterHandle` - Twitter/X username (1-15 chars, alphanumeric + _)
- `snapchatHandle` - Snapchat username (1-15 chars, alphanumeric + . _ -)
- `facebookUrl` - Facebook profile URL

#### Additional Data
- `dateOfBirth` - Birth date
- `phoneNumber` - Contact phone number
- `address` - Physical address
- `city` - City name
- `state` - State/province
- `zipCode` - Postal code
- `country` - Country name

### Profile Validation

#### Social Media Handle Validation
```typescript
// Instagram: letters, numbers, periods, underscores
const instagramPattern = /^[a-zA-Z0-9._]+$/;

// TikTok: letters, numbers, periods, underscores  
const tikTokPattern = /^[a-zA-Z0-9._]+$/;

// Twitter: letters, numbers, underscores only
const twitterPattern = /^[a-zA-Z0-9_]+$/;

// Snapchat: letters, numbers, periods, underscores, hyphens
const snapchatPattern = /^[a-zA-Z0-9._-]+$/;

// Colors: hex format validation
const hexColorPattern = /^#[0-9A-F]{6}$/i;
```

#### Example Profile Update
```graphql
mutation UpdateUserProfile {
  updateUser(id: "user_id", input: {
    name: "Jane Smith"
    bio: "Digital artist and coffee enthusiast"
    shortBio: "Artist & Coffee Lover ☕"
    location: "San Francisco, CA"
    pronouns: "she/her"
    sign: "Gemini"
    sex: "female"
    instagramHandle: "jane.creates"
    tikTokHandle: "janecreates"
    twitterHandle: "jane_creates"
    websiteUrl: "https://janesmithart.com"
    primaryColor: "#FF6B6B"
    secondaryColor: "#4ECDC4"
  }) {
    id
    name
    handle
    bio
    instagramHandle
  }
}
```

## �🔐 JWT Authentication (Client Credentials)

This API implements **OAuth2 Client Credentials** flow using JWT tokens for application-to-application authentication. All authentication is handled through **GraphQL mutations** at the main `/graphql` endpoint.

### Authentication Flow Overview

```mermaid
sequenceDiagram
    participant App as Client Application
    participant API as Witchly API
    participant DB as Database

    App->>API: GraphQL Mutation: authenticate(grant_type, client_id, client_secret)
    API->>DB: Validate client credentials
    DB-->>API: Client found & secret verified
    API-->>App: JWT Access Token (Bearer token)
    App->>API: GraphQL Request + Authorization: Bearer <token>
    API->>API: Validate JWT token
    API-->>App: GraphQL Response
```

### 1. Environment Setup

Add to your `.env` file:

```env
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-min-256-bits
```

**🚨 Security Note**: Use a strong, random secret (256+ bits) in production. Generate one with:
```bash
openssl rand -hex 32
```

### 2. OAuth2 Client Setup

The API includes a powerful client setup tool that allows you to create OAuth2 clients with different permission levels. This is the **easiest way** to get started with authentication.

#### Quick Setup Commands

```bash
# Create admin client (full permissions)
npm run setup:client -- --preset admin --name "Admin Dashboard"

# Create standard user client (read + write)
npm run setup:client -- --preset read-write --name "Mobile App"

# Create read-only client (monitoring/analytics)
npm run setup:client -- --preset read-only --name "Analytics Service"

# Create service account (long-lived, automated)
npm run setup:client -- --preset service --name "Background Service"
```

#### Available Client Types

| Preset | Scopes | Duration | Use Case |
|--------|--------|----------|----------|
| `admin` | `read`, `write`, `admin` | 1 hour | Admin interfaces, management tools |
| `read-write` | `read`, `write` | 2 hours | Standard applications, web/mobile apps |
| `read-only` | `read` | 4 hours | Analytics, monitoring, reporting |
| `service` | `read`, `write` | 24 hours | Background jobs, integrations |

#### Custom Client Creation

```bash
# Custom scopes and expiration
npm run setup:client -- --scopes read,write --name "Custom API Client" --expires 1800

# With custom description
npm run setup:client -- --scopes read --name "Public API" --description "Read-only public access"
```

#### Management Commands

```bash
# List all existing clients
npm run setup:client -- --list

# Force create (bypass duplicate check)
npm run setup:client -- --preset admin --name "Admin Client" --force

# Show help and usage
npm run setup:client -- --help
```

#### Example Output

When you create a client, you'll receive:

```
✅ 👤 user client created successfully!

📋 Client Credentials:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name:          Mobile App
Type:          user
Client ID:     client_abc123def456...
Client Secret: 789xyz456abc123def...
Scopes:        read, write
Token Expires: 7200 seconds (2.0 hours)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔐 Save these credentials securely!
💡 Use these in your Postman collection or API client

📝 Example OAuth2 request:
{
  "grant_type": "client_credentials",
  "client_id": "client_abc123def456...",
  "client_secret": "789xyz456abc123def...",
  "scope": "read write"
}
```

**🔐 Important**: Save the `Client Secret` immediately - it cannot be retrieved later (only regenerated).

#### Permission Scopes Explained

- **`read`**: Query operations (view users, clients, data)
- **`write`**: Create and update operations (add/modify records)
- **`admin`**: Full administrative access (manage clients, delete operations)

### 3. Manual Client Registration (Alternative)

First, create a client application to get credentials:

```graphql
mutation CreateClient {
  createClient(input: {
    name: "My Mobile App"
    description: "iOS/Android mobile application"
    allowedScopes: ["read", "write"]
    tokenExpiresIn: 3600
  }) {
    clientId      # client_abc123def456...
    clientSecret  # def789ghi012... (SAVE THIS - only shown once!)
  }
}
```

**Available Scopes:**
- `read` - Read access to data
- `write` - Create/update operations
- `admin` - Full access including client management

### 4. Get Access Token

Exchange your client credentials for a JWT access token using GraphQL mutation:

**Authentication with required scope:**
```graphql
mutation {
  authenticate(
    grant_type: "client_credentials"
    client_id: "client_abc123def456..."
    client_secret: "def789ghi012..."
    scope: "read write"
  ) {
    access_token
    token_type
    expires_in
    scope
  }
}
```

**Postman/HTTP Request Body:**
```json
{
  "query": "mutation { authenticate(grant_type: \"client_credentials\", client_id: \"client_abc123def456...\", client_secret: \"def789ghi012...\", scope: \"read write\") { access_token token_type expires_in scope } }"
}
```

**Response:**
```json
{
  "data": {
    "authenticate": {
      "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "token_type": "Bearer",
      "expires_in": 3600,
      "scope": "read write"
    }
  }
}
```

**📝 Note about scopes:**
- **System-wide scope validation**: Only `read`, `write`, and `admin` scopes are valid
- **Format validation**: Scopes must contain only letters, numbers, and underscores
- **Client authorization**: You can only request scopes that your client is authorized for
- **Required parameter**: The `scope` parameter is now **required** and cannot be empty
- **Subset selection**: You must specify which scopes you want from your client's allowed scopes
- **Error handling**: Invalid scopes, unauthorized scopes, or malformed scope strings will return detailed error messages

**Scope validation examples:**
```graphql
# ✅ Valid: Requesting allowed scopes
scope: "read write"

# ✅ Valid: Requesting subset of allowed scopes  
scope: "read"

# ❌ Invalid: Missing scope parameter
# (GraphQL validation error)

# ❌ Invalid: Empty scope string
scope: ""           # Error: Scope must be a non-empty string

# ❌ Invalid: Non-existent scope
scope: "superuser"  # Error: Invalid scope

# ❌ Invalid: Unauthorized scope (client only has read/write)
scope: "admin"      # Error: Client not authorized for scopes: admin

# ❌ Invalid: Bad format
scope: "read-only"  # Error: Invalid scope format
```

## 🔒 Comprehensive Scope Validation System

The API implements a robust scope validation system that ensures secure access control and follows OAuth2 best practices. All scope validation happens at multiple levels to provide comprehensive security.

### Scope Validation Levels

#### 1. **GraphQL Schema Validation**
- The `scope` parameter is **required** in the `authenticate` mutation
- Missing scope parameter triggers GraphQL validation error before reaching business logic
- Ensures all authentication requests explicitly declare required permissions

#### 2. **Format Validation**
- Scopes must contain only letters, numbers, and underscores: `/^[a-zA-Z0-9_]+$/`
- Multiple scopes are space-separated: `"read write admin"`
- Empty strings and invalid characters are rejected immediately

#### 3. **System-Wide Scope Registry**
- **Valid scopes**: `read`, `write`, `admin` (defined in `src/utils/scopes.ts`)
- **Centralized management**: All valid scopes are maintained in the `VALID_SCOPES` constant
- **Consistent validation**: Same validation logic used across authentication and client management

#### 4. **Client Authorization Validation**
- Clients can only request scopes they are authorized for (defined in `allowedScopes`)
- Requesting unauthorized scopes returns a detailed error with the specific unauthorized scope names
- Supports subset selection: clients can request fewer scopes than they're authorized for

### Scope Validation Flow

```mermaid
flowchart TD
    A[Authentication Request] --> B{Scope Parameter Present?}
    B -->|No| C[GraphQL Validation Error]
    B -->|Yes| D{Scope Non-Empty?}
    D -->|No| E[Custom Validation Error]
    D -->|Yes| F{Valid Scope Format?}
    F -->|No| G[Format Error]
    F -->|Yes| H{Scopes Exist in System?}
    H -->|No| I[Invalid Scope Error]
    H -->|Yes| J{Client Authorized for Scopes?}
    J -->|No| K[Unauthorized Scope Error]
    J -->|Yes| L[Generate JWT Token]
    
    C --> M[Return Error Response]
    E --> M
    G --> M
    I --> M
    K --> M
    L --> N[Return Access Token]
```

### Detailed Error Responses

#### Missing Scope Parameter
```json
{
  "errors": [
    {
      "message": "Field \"authenticate\" argument \"scope\" of type \"String!\" is required, but it was not provided.",
      "extensions": {
        "code": "GRAPHQL_VALIDATION_FAILED"
      }
    }
  ]
}
```

#### Empty Scope String
```json
{
  "errors": [
    {
      "message": "Missing required fields: scope must be a non-empty string",
      "extensions": {
        "code": "BAD_USER_INPUT"
      }
    }
  ]
}
```

#### Invalid Scope Format
```json
{
  "errors": [
    {
      "message": "Invalid scope format: read-only. Scopes must contain only letters, numbers, and underscores.",
      "extensions": {
        "code": "BAD_USER_INPUT"
      }
    }
  ]
}
```

#### Non-Existent Scope
```json
{
  "errors": [
    {
      "message": "Invalid scope: superuser. Valid scopes are: read, write, admin",
      "extensions": {
        "code": "BAD_USER_INPUT"
      }
    }
  ]
}
```

#### Unauthorized Scope for Client
```json
{
  "errors": [
    {
      "message": "Client not authorized for scopes: admin. Allowed scopes: read, write",
      "extensions": {
        "code": "FORBIDDEN"
      }
    }
  ]
}
```

### Implementation Details

#### Core Validation Functions
The scope validation system is implemented in `src/utils/scopes.ts`:

```typescript
// System-wide valid scopes
export const VALID_SCOPES = ['read', 'write', 'admin'] as const;

// Parse and validate scope string format and existence
export function parseAndValidateScopes(scopeString: string): string[]

// Validate client is authorized for requested scopes  
export function validateClientScopes(requestedScopes: string[], allowedScopes: string[]): boolean

// Check if individual scope exists in system
export function isValidScope(scope: string): boolean
```

#### Usage in Authentication Flow
1. **Parameter Validation**: GraphQL schema enforces required `scope` parameter
2. **Format Parsing**: `parseAndValidateScopes()` validates format and existence
3. **Authorization Check**: `validateClientScopes()` verifies client permissions
4. **Token Generation**: Validated scopes are included in JWT payload

### Best Practices for Scope Usage

#### **Principle of Least Privilege**
```graphql
# ✅ Good: Request only needed scopes
scope: "read"              # For read-only operations

# ❌ Avoid: Requesting unnecessary scopes  
scope: "read write admin"  # When only read access is needed
```

#### **Scope-Specific Client Design**
```bash
# Create specialized clients for different use cases
npm run setup:client -- --preset read-only --name "Analytics Dashboard"
npm run setup:client -- --preset read-write --name "Mobile App"  
npm run setup:client -- --preset admin --name "Admin Console"
```

#### **Progressive Scope Elevation**
```graphql
# Start with minimal scopes
scope: "read"

# Authenticate again with elevated scopes when needed
scope: "read write"
```

### Testing Scope Validation

The scope validation system includes comprehensive test coverage:

- **Required parameter tests**: `src/test/required-scope.test.ts`
- **Validation logic tests**: `src/test/scopes.test.ts`  
- **Integration tests**: `src/test/auth-scope-validation.test.ts`

Example test scenarios:
- Missing scope parameter (GraphQL validation)
- Empty scope strings (custom validation)
- Invalid scope formats (format validation)
- Non-existent scopes (system validation)
- Unauthorized scope requests (client validation)
- Valid scope combinations (success cases)

This multi-layered approach ensures that scope validation is robust, secure, and provides clear feedback for developers integrating with the API.

### 5. Use Access Token

Include the token in the Authorization header for all subsequent GraphQL requests:

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Example authenticated query:**
```graphql
query {
  users {
    id
    name
    email
  }
}
```

### Integration Examples

#### JavaScript/Node.js

```javascript
class WitchlyAPIClient {
  constructor(clientId, clientSecret, baseURL = 'http://localhost:3000') {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.baseURL = baseURL;
    this.accessToken = null;
  }

  async authenticate() {
    const mutation = `
      mutation {
        authenticate(
          grant_type: "client_credentials"
          client_id: "${this.clientId}"
          client_secret: "${this.clientSecret}"
          scope: "read write"
        ) {
          access_token
          token_type
          expires_in
          scope
        }
      }
    `;

    const response = await fetch(`${this.baseURL}/graphql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: mutation })
    });

    const result = await response.json();
    this.accessToken = result.data.authenticate.access_token;
    return this.accessToken;
  }

  async graphqlQuery(query, variables = {}) {
    if (!this.accessToken) await this.authenticate();

    const response = await fetch(`${this.baseURL}/graphql`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query, variables })
    });

    return response.json();
  }
}

// Usage
const client = new WitchlyAPIClient('your_client_id', 'your_client_secret');
const users = await client.graphqlQuery('{ users { id name email } }');
```

### Client Management Operations

#### List All Clients (Admin Only)
```graphql
query {
  clients {
    id
    clientId
    name
    description
    isActive
    allowedScopes
    lastUsed
    createdAt
  }
}
```

#### Update Client (Admin Only)
```graphql
mutation {
  updateClient(
    clientId: "client_abc123..."
    input: {
      name: "Updated App Name"
      allowedScopes: ["read"]
      isActive: false
    }
  ) {
    id
    name
    isActive
    allowedScopes
  }
}
```

#### Regenerate Client Secret (Admin Only)
```graphql
mutation {
  regenerateClientSecret(clientId: "client_abc123...")  # Returns new secret
}
```

#### Delete Client (Admin Only)
```graphql
mutation {
  deleteClient(clientId: "client_abc123...")  # Returns true/false
}
```

### Error Handling

The API returns standard OAuth2 error responses:

```json
{
  "error": "invalid_client",
  "error_description": "Invalid client_id or client not found"
}
```

**Common Error Codes:**
- `invalid_request` - Missing required parameters
- `invalid_client` - Invalid client_id or client_secret
- `invalid_scope` - Requested scope not allowed for client
- `unsupported_grant_type` - Only client_credentials supported

### Security Best Practices

1. **Store credentials securely** - Never commit client secrets to code
2. **Use environment variables** - Store credentials in secure environment
3. **Rotate secrets regularly** - Use regenerateClientSecret mutation
4. **Scope limitation** - Request only needed scopes
5. **Token expiration** - Handle token refresh in your applications
6. **HTTPS in production** - Never send credentials over HTTP

### Testing Authentication

Test the authentication flows:

```bash
# Run authentication tests
npm run test -- --testPathPatterns=auth.test.ts

# Run session resolver tests (includes dual authentication)
npm run test -- --testPathPatterns=session-resolver.test.ts
```

**Manual testing with Postman/GraphQL client:**

#### OAuth2 Authentication
POST to `http://localhost:3000/graphql` with body:
```json
{
  "query": "mutation { authenticate(grant_type: \"client_credentials\", client_id: \"test-client-id\", client_secret: \"test-client-secret\", scope: \"read write\") { access_token token_type expires_in scope } }"
}
```

#### Session Operations (Dual Authentication)
For session operations, include both headers:
```http
Authorization: Bearer <oauth2_access_token>
X-Session-Token: <user_session_token>
```

Example session query:
```json
{
  "query": "query { mySessions { sessionId keepMeLoggedIn lastUsedAt expiresAt isActive } }"
}
```

## 🧪 Comprehensive Testing Suite

### Enhanced Test Environment Architecture (October 2025 Update)

The API features enterprise-grade testing with **2000+ lines of test code** covering authentication, GraphQL operations, scope validation, and error handling. Recent major enhancements include **dual authentication testing infrastructure** and **advanced helper functions** for complex testing scenarios.

#### Advanced Test Infrastructure Features

- **Multi-Client Test Setup**: Automatic creation of both basic and admin OAuth2 clients with different permission levels
- **Dual Authentication Support**: Complete infrastructure for testing both OAuth2 and user session authentication simultaneously
- **Pre-configured Test Users**: Automated creation of admin and basic users with appropriate scopes and active sessions
- **Helper Function Architecture**: New global helper functions that simplify complex authentication scenarios
- **Session Integration Testing**: Full support for testing session-based operations with proper token management
- **Cross-Scope Permission Testing**: Infrastructure to test operations requiring different combinations of OAuth2 and user scopes
- **Global Setup/Teardown**: Shared server initialization and cleanup across all test files
- **Automatic Database Management**: Isolated test database with auto-cleanup between test suites
- **Mock Services**: Email service mocked globally to prevent actual email sending during tests

#### Enhanced Global Test Variables

```typescript
// Available in all test files after setup
declare global {
  var testRequest: ReturnType<typeof request>;
  
  // Pre-configured request helpers (NEW)
  var adminUserAdminAppTestRequest: () => Test;  // Admin user + admin app credentials
  var basicUserBasicAppTestRequest: () => Test;  // Basic user + basic app credentials  
  var basicUserAdminAppTestRequest: () => Test;  // Basic user + admin app credentials
  
  // Authentication tokens
  var basicAccessToken: string;     // OAuth2 token for basic client
  var adminAccessToken: string;     // OAuth2 token for admin client
  var basicSessionToken: string;    // Session token for basic user
  var adminSessionToken: string;    // Session token for admin user
  
  // User and client IDs for reference
  var basicUserId: string;          // Basic test user ID
  var adminUserId: string;          // Admin test user ID
  var basicClientId: string;        // Basic OAuth2 client ID
  var adminClientId: string;        // Admin OAuth2 client ID
}
```

#### Dual Authentication Test Helpers

**New Helper Functions** for simplified dual authentication testing:

```typescript
// Example usage in tests

// Admin user with admin app permissions
const response = await global.adminUserAdminAppTestRequest()
  .send({ query: adminOnlyMutation });

// Basic user with basic app permissions  
const response = await global.basicUserBasicAppTestRequest()
  .send({ query: standardQuery });

// Basic user attempting admin operation (should fail)
const response = await global.basicUserAdminAppTestRequest()
  .send({ query: adminOnlyMutation });
```

**Each helper automatically includes:**
- ✅ Correct OAuth2 `Authorization: Bearer <token>` header
- ✅ Appropriate `X-Session-Token: <session_token>` header
- ✅ Consistent `User-Agent` string for session validation
- ✅ POST request to `/graphql` endpoint pre-configured

#### Test Configuration Enhancement

```javascript
// jest.config.js highlights (enhanced for dual auth)
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  globalSetup: '<rootDir>/src/test/globalSetup.ts',
  globalTeardown: '<rootDir>/src/test/teardown.ts',
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.test.ts'],
  testTimeout: 30000,
  forceExit: true,
  detectOpenHandles: true
};
```

#### Advanced Test Scenarios Supported

**1. OAuth2 + Session Permission Matrix Testing**
```typescript
describe('Cross-Authentication Permission Tests', () => {
  it('should allow admin user with admin app to manage clients', async () => {
    const response = await global.adminUserAdminAppTestRequest()
      .send({ query: 'query { clients { clientId name } }' });
    expect(response.status).toBe(200);
  });

  it('should deny basic user with admin app from admin operations', async () => {
    const response = await global.basicUserAdminAppTestRequest()
      .send({ query: 'query { clients { clientId } }' });
    expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
  });
});
```

**2. Session-Specific Operations Testing**
```typescript
it('should manage user sessions with proper dual auth', async () => {
  const response = await global.adminUserAdminAppTestRequest()
    .send({ 
      query: `query { 
        mySessions { 
          sessionId keepMeLoggedIn lastUsedAt isActive 
        } 
      }` 
    });
  
  expect(response.status).toBe(200);
  expect(response.body.data.mySessions).toBeDefined();
});
```

**3. Progressive Permission Testing**
```typescript
it('should test permission escalation scenarios', async () => {
  // Basic operation should work
  const basicResponse = await global.basicUserBasicAppTestRequest()
    .send({ query: 'query { users(limit: 1) { id } }' });
  expect(basicResponse.status).toBe(200);
  
  // Admin operation should fail for basic user
  const adminResponse = await global.basicUserBasicAppTestRequest()
    .send({ query: 'mutation { createClient(input: {...}) { clientId } }' });
  expect(adminResponse.body.errors).toBeDefined();
});
```

### Enhanced Test Database Management

#### Multi-Client & Multi-User Setup
```typescript
// Enhanced global setup (src/test/setup.ts)
beforeAll(async () => {
  console.log('Initializing enhanced dual-auth test environment...');
  
  // Create OAuth2 clients with different permission levels
  const basicClient = await createTestClient(['read', 'write', 'basic']);
  const adminClient = await createTestClient(['read', 'write', 'admin']);
  
  // Create test users with different scopes
  const basicUser = await createTestUser(['read', 'write', 'basic']);
  const adminUser = await createTestUser(['read', 'write', 'admin']);
  
  // Create active sessions for both users
  const basicSession = await SessionService.createSession(basicUser.id, true, 'node-superagent/3.8.3', '::ffff:127.0.0.1');
  const adminSession = await SessionService.createSession(adminUser.id, true, 'node-superagent/3.8.3', '::ffff:127.0.0.1');
  
  // Configure global helper functions
  global.adminUserAdminAppTestRequest = () => createAuthenticatedRequest(adminAccessToken, adminSessionToken);
  global.basicUserBasicAppTestRequest = () => createAuthenticatedRequest(basicAccessToken, basicSessionToken);
  global.basicUserAdminAppTestRequest = () => createAuthenticatedRequest(adminAccessToken, basicSessionToken);
}, 30000);
```

#### Automatic Cleanup Enhancement
```typescript
// Enhanced cleanup handles multiple entities
afterAll(async () => {
  // Clean up all test entities
  await Client.deleteMany({ name: /testing/i });
  await User.deleteMany({ email: /test-auth@witchlyapp.com$/i });
  await UserSession.deleteMany({ userId: { $in: [basicUserId, adminUserId] } });
  
  await disconnectDB();
  await forceCloseDB();
}, 30000);
```

### Running Enhanced Tests

```bash
# Run all tests with new dual authentication infrastructure
npm test

# Run specific test patterns
npm test -- --testPathPattern=tarot-deck  # Tests using new helper functions
npm test -- --testPathPattern=session    # Session management tests
npm test -- --testPathPattern=auth       # Authentication flow tests

# Development testing with watch mode
npm run test:watch

# Coverage reports show dual authentication coverage
npm run test:coverage
```

### Enhanced Test Suite Breakdown

#### 1. Authentication Tests (`auth.test.ts` - Enhanced with dual auth scenarios)
```typescript
describe('Enhanced JWT + Session Authentication', () => {
  it('should support OAuth2 authentication', async () => {
    const response = await global.testRequest
      .post('/graphql')
      .send({ query: authenticateMutation });
    expect(response.body.data.authenticate.access_token).toBeDefined();
  });

  it('should validate session tokens in dual auth context', async () => {
    const response = await global.adminUserAdminAppTestRequest()
      .send({ query: 'query { mySessions { sessionId } }' });
    expect(response.status).toBe(200);
  });
});
```

#### 2. Tarot Deck Tests (`tarot-deck-resolver.test.ts` - Using new helper functions)
```typescript
describe('TarotDeckResolver with Dual Authentication', () => {
  it('should allow admin operations with proper permissions', async () => {
    const response = await global.adminUserAdminAppTestRequest()
      .send({
        query: createTarotDeckMutation,
        variables: { input: validDeckData }
      });
    expect(response.status).toBe(200);
  });

  it('should deny admin operations to basic users', async () => {
    const response = await global.basicUserBasicAppTestRequest()
      .send({
        query: createTarotDeckMutation,
        variables: { input: validDeckData }
      });
    expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
  });
});
```

#### 3. Cross-Permission Testing
```typescript
describe('Cross-Authentication Permission Matrix', () => {
  // Tests all combinations of user permissions + app permissions
  // Ensures proper security boundaries are maintained
  // Validates that privilege escalation is prevented
});
```

### Coverage Reports Enhancement

Enhanced tests generate comprehensive coverage including dual authentication paths:

```bash
npm run test:coverage

================= Enhanced Coverage Summary =================
Statements   : 96.8% ( 1247/1289 )  # Improved with dual auth coverage
Branches     : 94.2% ( 334/354 )    # Enhanced permission branch testing  
Functions    : 95.7% ( 201/210 )    # New helper functions covered
Lines        : 96.5% ( 1205/1249 )  # Dual authentication paths tested
==========================================================
```

### Testing Best Practices Enhanced

1. **Dual Authentication Pattern**: All session operations tested with both OAuth2 and session tokens
2. **Permission Matrix Testing**: Comprehensive testing of all permission combinations
3. **Helper Function Usage**: Simplified test writing with pre-configured authentication helpers
4. **Security Boundary Validation**: Tests ensure users cannot escalate privileges inappropriately
5. **Session Lifecycle Testing**: Complete session creation, validation, and cleanup testing
6. **Integration Test Architecture**: Full request/response cycle testing with realistic authentication flows

This enhanced testing architecture ensures the API is production-ready with high confidence in its dual authentication system, security boundaries, and functionality across all permission levels.

### Running Tests

```bash
# Run all tests (full suite)
npm test

# Run with coverage report (text + HTML)
npm run test:coverage

# Development testing (watch mode)
npm run test:watch

# CI/CD pipeline testing
npm run test:ci

# Run specific test files
npm test -- auth.test.ts
npm test -- --testPathPattern=scope
```

### Test Suite Breakdown

#### 1. Authentication Tests (`auth.test.ts` - 333 lines)
```typescript
describe('JWT Client Credentials Authentication', () => {
  beforeAll(async () => {
    // Creates test OAuth2 client with full scopes
    const client = new Client({
      clientId: generateClientId(),
      clientSecret: await hashClientSecret(clientSecret),
      allowedScopes: ['read', 'write', 'admin'],
      tokenExpiresIn: 3600
    });
    await client.save();
  });

  it('should authenticate with valid credentials', async () => {
    const response = await global.testRequest
      .post('/graphql')
      .send({
        query: `mutation {
          authenticate(
            grant_type: "client_credentials"
            client_id: "${clientId}"
            client_secret: "${clientSecret}"
            scope: "read write admin"
          ) { access_token token_type expires_in scope }
        }`
      });
    
    expect(response.status).toBe(200);
    expect(response.body.data.authenticate.access_token).toBeDefined();
  });
});
```

#### 2. Scope Validation Tests (`scopes.test.ts` - 50 lines)
```typescript
describe('OAuth2 Scope Validation', () => {
  it('should validate basic scopes', () => {
    expect(isValidScope('read')).toBe(true);
    expect(isValidScope('write')).toBe(true);
    expect(isValidScope('admin')).toBe(true);
    expect(isValidScope('invalid')).toBe(false);
  });

  it('should parse space-separated scope strings', () => {
    const scopes = parseAndValidateScopes('read write');
    expect(scopes).toEqual(['read', 'write']);
  });

  it('should handle whitespace and duplicates', () => {
    const scopes = parseAndValidateScopes('  read   write   read  ');
    expect(scopes).toEqual(['read', 'write']); // Duplicates removed
  });
});
```

#### 3. User Resolver Tests (`user-resolver.test.ts` - 730 lines)
```typescript
describe('UserResolver GraphQL Endpoints', () => {
  let accessToken: string;
  
  beforeAll(async () => {
    // Setup OAuth2 client and get access token
    // ... authentication setup
  });

  it('should fetch users with pagination', async () => {
    const response = await global.testRequest
      .post('/graphql')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        query: `query {
          users(limit: 5, offset: 0) {
            id name email handle createdAt
          }
        }`
      });

    expect(response.status).toBe(200);
    expect(response.body.data.users).toBeDefined();
    expect(Array.isArray(response.body.data.users)).toBe(true);
  });

  it('should reject unauthorized access', async () => {
    const response = await global.testRequest
      .post('/graphql')
      .send({ query: 'query { users { id } }' });

    expect(response.body.errors).toBeDefined();
    expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
  });
});
```

#### 4. Signup Flow Tests (`signup-resolver.test.ts` - 706 lines)
```typescript
describe('SignupResolver GraphQL Endpoints', () => {
  it('should initiate signup with email verification', async () => {
    const response = await global.testRequest
      .post('/graphql')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        query: `mutation {
          initiateSignup(input: { email: "test@example.com" }) {
            success message expiresAt
          }
        }`
      });

    expect(response.status).toBe(200);
    expect(response.body.data.initiateSignup.success).toBe(true);
  });

  it('should handle rate limiting', async () => {
    // First request
    await initiateSignup('rate@test.com');
    
    // Second request within 1 minute (should fail)
    const response = await initiateSignup('rate@test.com');
    
    expect(response.body.errors).toBeDefined();
    expect(response.body.errors[0].extensions.code).toBe('TOO_MANY_REQUESTS');
  });
});
```

#### 5. Client Management Tests (`client-resolver.test.ts` - 891 lines)
```typescript
describe('ClientResolver GraphQL Endpoints', () => {
  let adminAccessToken: string;
  let userAccessToken: string;

  beforeAll(async () => {
    // Create both admin and user-level test clients
    // Get tokens with different permission levels
  });

  it('should allow admin to create clients', async () => {
    const response = await global.testRequest
      .post('/graphql')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        query: `mutation {
          createClient(input: {
            name: "Test Client"
            allowedScopes: ["read", "write"]
          }) {
            clientId clientSecret name allowedScopes
          }
        }`
      });

    expect(response.status).toBe(200);
    expect(response.body.data.createClient.clientId).toBeDefined();
  });

  it('should deny user access to admin endpoints', async () => {
    const response = await global.testRequest
      .post('/graphql')
      .set('Authorization', `Bearer ${userAccessToken}`)
      .send({ query: 'query { clients { clientId } }' });

    expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
  });
});
```

### Test Database Management

#### Automatic Cleanup System
```typescript
// Global teardown (src/test/teardown.ts)
export default async (): Promise<void> => {
  try {
    if (mongoose.connection.readyState !== 0 && mongoose.connection.db) {
      const dbName = mongoose.connection.db.databaseName;
      
      // Safety check: only drop test databases
      if (dbName.toLowerCase().includes('test') || process.env.NODE_ENV === 'test') {
        await mongoose.connection.db.dropDatabase();
        console.log(`Test database '${dbName}' dropped successfully`);
      }
    }
    
    await forceCloseDB(); // Force close all connections
  } catch (error) {
    console.error('Error during test cleanup:', error);
  }
};
```

#### Global Test Setup
```typescript
// Global setup (src/test/setup.ts)
beforeAll(async () => {
  console.log('Initializing server globally for all tests...');
  await initializeServer();
  global.testRequest = request(app);
}, 30000);

// Mock email service globally
jest.mock('../config/email', () => ({
  emailService: {
    sendVerificationCode: jest.fn().mockResolvedValue(undefined),
    sendEmail: jest.fn().mockResolvedValue(undefined),
    testConnection: jest.fn().mockResolvedValue(true),
  },
}));
```

### Coverage Reports

Tests generate comprehensive coverage reports:

```bash
# Coverage summary example
npm run test:coverage

================= Coverage summary =================
Statements   : 95.2% ( 1024/1076 )
Branches     : 92.8% ( 267/288 )
Functions    : 94.1% ( 160/170 )
Lines        : 95.5% ( 1002/1049 )
====================================================

# Detailed HTML report generated in coverage/ directory
```

### Mock Services & Test Isolation

#### Email Service Mocking
```typescript
// Prevents actual emails during testing
const mockEmailService = {
  sendVerificationCode: jest.fn().mockResolvedValue(undefined),
  sendEmail: jest.fn().mockResolvedValue(undefined),
  testConnection: jest.fn().mockResolvedValue(true),
};
```

#### Database Isolation
- Each test file runs against a clean database state
- Automatic cleanup between test suites
- Separate test database to prevent data corruption
- Force exit ensures no hanging database connections

### Testing Best Practices Used

1. **Global Setup Pattern**: Single server initialization across all tests
2. **Dynamic Authentication**: Test clients created programmatically with real credentials
3. **Comprehensive Error Testing**: Every error scenario has dedicated test cases
4. **Permission Testing**: Both authorized and unauthorized access scenarios
5. **Edge Case Coverage**: Rate limiting, validation errors, malformed inputs
6. **Integration Testing**: Full GraphQL request/response cycle testing
7. **Cleanup Automation**: Automatic test data cleanup prevents test pollution

This testing architecture ensures the API is production-ready with high confidence in its security, reliability, and functionality.

## 📱 Session Management System

### Overview

The Witchly App API includes a comprehensive user session management system that works alongside the existing OAuth2 client credentials authentication. This system supports:

- **Configurable session durations**: 4 hours (default) or 90 days ("keep me logged in")
- **Dual authentication**: OAuth2 + session tokens for secure session operations
- **Refresh tokens**: For long-term sessions
- **Session tracking**: User agent, IP address, last used timestamps
- **Session limits**: Maximum 10 concurrent sessions per user
- **Automatic cleanup**: TTL indexes and manual cleanup functions
- **Security features**: Session termination, logout from all devices

### Architecture

#### Models

**UserSession Model** (`src/models/UserSession.ts`)
- Stores session information with MongoDB TTL for automatic cleanup
- Tracks user agent, IP address, and usage patterns
- Supports both short and long-term sessions

#### Services

**SessionService** (`src/services/session.service.ts`)
- Namespace-based service with all session management functions
- JWT-based session tokens with configurable expiration
- Refresh token support for extended sessions
- Session validation and cleanup utilities

#### GraphQL Integration

**Session Types** (`src/graphql/types/SessionTypes.ts`)
- Complete GraphQL type definitions for session operations
- Input/output types for login, refresh, and logout operations

**LoginResolver** (`src/graphql/resolvers/LoginResolver.ts`)
- Unified `completeLogin` mutation supporting both session and non-session authentication
- Creates sessions after successful verification based on `keepMeLoggedIn` parameter

**SessionResolver** (`src/graphql/resolvers/SessionResolver.ts`)
- Dedicated resolver for session management operations
- Session listing, refresh, and termination endpoints

#### Middleware

**Unified Authentication** (`src/middleware/auth.middleware.ts`)
- Supports both OAuth2 and user session authentication
- Enhanced GraphQL context with session information
- Dual authentication support via `X-Session-Token` header

### Dual Authentication Requirements

Session management operations require **both** OAuth2 client credentials AND user session authentication for enhanced security:

#### Authentication Headers
```http
# OAuth2 client credentials (required)
Authorization: Bearer <oauth2_access_token>

# User session token (required for session operations)
X-Session-Token: <user_session_token>
```

#### Why Dual Authentication?
- **OAuth2**: Validates the client application is authorized to access the API
- **Session Token**: Validates the specific user and their active session
- **Enhanced Security**: Prevents unauthorized session access even with valid OAuth2 credentials
- **User Context**: Ensures session operations are performed by the correct user

### Session API Usage

#### 1. Login with Session Creation (Unified Endpoint)

```graphql
mutation CompleteLogin {
  completeLogin(input: {
    email: "user@example.com"
    verificationCode: "123456"
    keepMeLoggedIn: true  # Optional: creates 90-day session if true, 4-hour if false/omitted
  }) {
    success
    message
    sessionToken
    refreshToken      # Only provided for long-term sessions (keepMeLoggedIn: true)
    expiresIn
    expiresAt
    userId
  }
}
```

**Session Duration Logic:**
- `keepMeLoggedIn: false` (default) → 4-hour session, no refresh token
- `keepMeLoggedIn: true` → 90-day session with refresh token

**Enhanced Login Features:**
- **Unified Endpoint**: Single `completeLogin` mutation handles all login scenarios
- **Optional Sessions**: Works with or without session creation based on `keepMeLoggedIn` parameter
- **Backward Compatible**: Existing login flows continue to work seamlessly
- **Automatic Token Management**: Session tokens and refresh tokens generated as appropriate

#### 2. Refresh Session (for long-term sessions)

```graphql
mutation RefreshSession {
  refreshSession(input: {
    refreshToken: "your-refresh-token"
  }) {
    sessionToken
    refreshToken
    expiresIn
    expiresAt
  }
}
```

**Required Headers:**
```http
Authorization: Bearer <oauth2_access_token>
# Note: X-Session-Token not required for refresh operations
```

#### 3. View Active Sessions

```graphql
query MySessions {
  mySessions {
    sessionId
    keepMeLoggedIn
    lastUsedAt
    expiresAt
    userAgent
    ipAddress
    isActive
    createdAt
  }
}
```

**Required Headers:**
```http
Authorization: Bearer <oauth2_access_token>
X-Session-Token: <user_session_token>
```

#### 4. Logout (Single Session)

```graphql
mutation Logout {
  logout {
    success
    message
  }
}
```

**Required Headers:**
```http
Authorization: Bearer <oauth2_access_token>
X-Session-Token: <user_session_token>
```

#### 5. Logout All Sessions

```graphql
mutation LogoutAllSessions {
  logoutAllSessions {
    success
    message
    sessionsTerminated
  }
}
```

**Required Headers:**
```http
Authorization: Bearer <oauth2_access_token>
X-Session-Token: <user_session_token>
```

### Dual Authentication Implementation

#### Enhanced Middleware

The `optionalAuth` middleware has been enhanced to support both OAuth2 and session authentication simultaneously:

```typescript
// Enhanced middleware supports dual authentication with user scope validation
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const sessionHeader = req.headers['x-session-token'] as string;
  const token = extractTokenFromHeader(authHeader);

  // Process OAuth2 token if present
  if (token) {
    const clientPayload = verifyAccessToken(token);
    if (clientPayload) {
      req.client = clientPayload;
    }
  }

  // Process session token and load user scopes
  const sessionToken = sessionHeader || (token && !req.client ? token : null);
  
  if (sessionToken) {
    SessionService.validateSession(sessionToken, req, true)
      .then(async (sessionInfo) => {
        if (sessionInfo) {
          req.sessionInfo = sessionInfo;
          
          // Load user scopes from database
          const user = await User.findById(sessionInfo.userId);
          if (user) {
            req.userScopes = user.allowedScopes;
          }
        }
        next();
      })
      .catch(() => next());
    return;
  } else {
    next();
  }
}
```

#### Enhanced GraphQL Context

The GraphQL context now includes both authentication types and helper functions:

```typescript
export interface GraphQLContext {
  // OAuth2 client credentials
  client?: JWTPayload | undefined;
  isAuthenticated: boolean;
  hasScope: (scope: string) => boolean;

  // User session info  
  sessionInfo?: SessionInfo | undefined;
  isUserAuthenticated: boolean;
  userId?: string | undefined;
  userScopes?: string[] | undefined;
  hasUserScope: (scope: string) => boolean;

  // Request information
  request: Request;

  // Enhanced helper functions for common permission patterns (NEW)
  hasAppAdminScope: (context: GraphQLContext) => void;
  hasAppWriteScope: (context: GraphQLContext) => void;
  hasAppReadScope: (context: GraphQLContext) => void;
  hasUserReadAppReadScope: (context: GraphQLContext) => void;
  hasUserAdminWriteAppWriteScope: (context: GraphQLContext) => void;
}
```

#### New Permission Helper Functions

**Enhanced Context Helpers** simplify common authentication patterns:

```typescript
// OAuth2 app-level permission helpers
context.hasAppAdminScope(context);    // Requires admin OAuth2 scope
context.hasAppWriteScope(context);    // Requires write OAuth2 scope  
context.hasAppReadScope(context);     // Requires read OAuth2 scope

// Dual authentication helpers
context.hasUserReadAppReadScope(context);           // Requires read on both OAuth2 + user session
context.hasUserAdminWriteAppWriteScope(context);    // Requires write OAuth2 + admin user session

// Usage in resolvers
@Query(() => [TarotDeckType])
async tarotDecks(@Ctx() context: GraphQLContext): Promise<TarotDeckType[]> {
  context.hasAppReadScope(context);  // Simplified permission check
  // ... resolver logic
}

@Mutation(() => CreateTarotDeckResponse)  
async createTarotDeck(@Ctx() context: GraphQLContext): Promise<CreateTarotDeckResponse> {
  context.hasUserAdminWriteAppWriteScope(context);  // Dual auth + admin requirement
  // ... resolver logic
}
```

**Benefits of Helper Functions:**
- ✅ **Consistent Error Messages**: Standardized unauthorized responses
- ✅ **Simplified Resolver Code**: One-line permission checks instead of complex conditionals
- ✅ **Type Safety**: TypeScript ensures correct context usage
- ✅ **Maintainable**: Centralized permission logic that's easy to update
- ✅ **Testable**: Helper functions can be tested independently

#### Resolver Security Pattern

Session operations require both authentication types:

```typescript
@Query(() => [SessionInfoType])
async mySessions(@Ctx() context: GraphQLContext): Promise<SessionInfoType[]> {
  // Require OAuth2 authentication
  if (!context.isAuthenticated || !context.hasScope('read')) {
    throw new UnauthorizedError('Read access required');
  }
  
  // Require user session authentication
  if (!context.isUserAuthenticated || !context.sessionInfo) {
    throw new UnauthorizedError('User session required to view sessions');
  }

  // Proceed with session operations...
}
```

### Security Benefits

#### Multi-Layer Security
- **Client Authentication**: Validates the requesting application
- **User Authentication**: Validates the specific user's session
- **Scope Validation**: Ensures proper permissions for the operation
- **Session Validation**: Confirms active and valid user session

#### Attack Prevention
- **Token Theft Protection**: Requires both OAuth2 and session tokens
- **Application Spoofing**: OAuth2 credentials prevent unauthorized applications
- **Session Hijacking**: Session tokens are user-specific and time-limited
- **Privilege Escalation**: Dual validation prevents unauthorized access

#### Duration Constants

```typescript
SessionService.SHORT_SESSION_HOURS = 4;    // Regular sessions: 4 hours
SessionService.LONG_SESSION_DAYS = 90;     // Keep me logged in: 90 days
SessionService.MAX_SESSIONS_PER_USER = 10; // Maximum concurrent sessions
```

#### JWT Configuration

- **Issuer**: `witchly-api`
- **Audience**: `witchly-users`
- **Algorithm**: HS256
- **Secret**: Configurable via `JWT_SECRET` environment variable

### Security Features

#### Session Limits
- Maximum 10 active sessions per user
- Oldest session automatically terminated when limit exceeded

#### Automatic Cleanup
- MongoDB TTL indexes remove expired sessions
- Manual cleanup functions for application-level maintenance

#### Session Tracking
- User agent and IP address logging
- Last used timestamp for activity monitoring
- Session termination capabilities

#### Token Security
- Separate namespace for user sessions vs OAuth2 clients
- Refresh tokens only provided for long-term sessions
- Secure random token generation (32 bytes hex)

### Database Schema

#### UserSession Collection

```javascript
{
  userId: String,              // Reference to User._id
  sessionToken: String,        // Unique session identifier
  refreshToken: String,        // Optional refresh token
  keepMeLoggedIn: Boolean,     // Session type flag
  expiresAt: Date,            // Expiration timestamp
  lastUsedAt: Date,           // Last activity timestamp
  userAgent: String,          // Browser/device info
  ipAddress: String,          // Client IP address
  isActive: Boolean,          // Session status
  createdAt: Date,            // Creation timestamp
  updatedAt: Date             // Last update timestamp
}
```

#### Indexes

- `{ userId: 1, isActive: 1 }` - User session queries
- `{ sessionToken: 1 }` - Unique session lookup
- `{ refreshToken: 1 }` - Unique refresh token lookup
- `{ expiresAt: 1 }` - TTL for automatic cleanup
- `{ lastUsedAt: 1 }` - Activity tracking

### Integration with Existing System

The session management system is designed to work alongside the existing OAuth2 client credentials system:

#### Dual Authentication Support
- **OAuth2 Client Credentials**: For application-to-application access
- **User Sessions**: For end-user authentication and authorization

#### Enhanced GraphQL Context
- Maintains backward compatibility with existing OAuth2 context
- Adds session-specific context for user-authenticated operations
- Both authentication methods can coexist in the same request

#### Existing Endpoints
- All existing OAuth2 endpoints continue to work unchanged
- New session-based endpoints complement the existing API
- No breaking changes to current authentication flows

### Session Testing

Comprehensive test suite in `src/test/session.test.ts`:

- **14 test cases** covering all major functionality
- **Session creation** (short and long term)
- **Session validation** and token verification
- **Refresh token** functionality
- **Session termination** (single and all)
- **Session limits** and automatic cleanup
- **Edge cases** and error handling

All tests pass with 100% coverage of the SessionService functionality.

### Session Environment Variables

```env
# Required for session management
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-min-256-bits

# Optional session configuration (defaults shown)
SESSION_SHORT_HOURS=4
SESSION_LONG_DAYS=90
SESSION_MAX_PER_USER=10
```

### Troubleshooting Dual Authentication

#### Common Issues & Solutions

**1. "Read access required" Error**
```json
{
  "errors": [{"message": "Read access required", "extensions": {"code": "UNAUTHORIZED"}}]
}
```
**Solution**: Missing or invalid OAuth2 access token
- Verify `Authorization: Bearer <token>` header is present
- Check if token has expired and re-authenticate if needed

**2. "User session required" Error**  
```json
{
  "errors": [{"message": "User session required to view sessions", "extensions": {"code": "UNAUTHORIZED"}}]
}
```
**Solution**: Missing or invalid session token
- Verify `X-Session-Token: <token>` header is present
- Ensure you've completed login to get a session token
- Check if session has expired

**3. Authentication Flow for Session Operations**
```bash
# Step 1: Get OAuth2 access token
POST /graphql
{
  "query": "mutation { authenticate(...) { access_token } }"
}

# Step 2: Complete login to get session token
POST /graphql
Headers: Authorization: Bearer <oauth2_token>
{
  "query": "mutation { completeLogin(...) { sessionToken } }"
}

# Step 3: Use both tokens for session operations
POST /graphql
Headers: 
  Authorization: Bearer <oauth2_token>
  X-Session-Token: <session_token>
{
  "query": "query { mySessions { ... } }"
}
```

**4. Postman Collection Setup**
- Ensure collection variables are set: `accessToken`, `sessionToken`
- Run "Get OAuth2 Access Token" request first
- Run "Complete Login" request to get session token
- Session endpoints will automatically use both tokens

### Migration Notes

For existing applications:

1. **No Breaking Changes**: All existing OAuth2 functionality preserved
2. **Gradual Adoption**: Can implement session-based auth incrementally
3. **Database Migration**: UserSession collection created automatically
4. **Index Creation**: Handled by Mongoose schema definitions
5. **Environment Setup**: Only requires JWT_SECRET configuration

The session management system provides a robust foundation for user authentication while maintaining full compatibility with the existing OAuth2 infrastructure.

## 🛡️ Advanced Session Security Features

### Session Hijacking Prevention System

The session management system includes advanced security features that provide robust protection against session hijacking attacks through comprehensive IP address and User-Agent validation.

#### Security Architecture

The security system operates with multiple layers of protection:

1. **Request Context Capture**: IP addresses and User-Agent strings are captured during session creation
2. **Real-time Validation**: Every session validation automatically checks current request context against stored values
3. **Automatic Termination**: Sessions are immediately terminated when security violations are detected
4. **Centralized Security Logic**: All security validation is handled in the SessionService for consistency

#### IP Address & User-Agent Validation

##### Strict Security Enforcement
```typescript
// SessionService now enforces security checks by default
validateSession(sessionToken, request, true) // enforceSecurityChecks = true
```

**What triggers security violations:**
- **IP Address Changes**: Session automatically terminated if request comes from different IP
- **User-Agent Changes**: Session automatically terminated if browser/device fingerprint changes
- **Simultaneous Detection**: Both IP and User-Agent are validated in real-time

##### Request Context Extraction
```typescript
// Advanced request parsing with proxy support
export function extractRequestInfo(request: Request): RequestInfo {
  const userAgent = request.headers['user-agent'] || undefined;
  
  // Priority-based IP extraction for production environments
  let ipAddress: string | undefined;
  
  // Check X-Forwarded-For first (CDN/proxy environments)
  if (request.headers['x-forwarded-for']) {
    const forwardedIps = request.headers['x-forwarded-for'] as string;
    ipAddress = forwardedIps.split(',')[0]?.trim();
  } else if (request.headers['x-real-ip']) {
    ipAddress = request.headers['x-real-ip'] as string;
  } else if (request.ip) {
    ipAddress = request.ip;
  }
  
  return { userAgent, ipAddress };
}
```

**Production-Ready Features:**
- **X-Forwarded-For Support**: Properly handles requests through CDNs, load balancers, and reverse proxies
- **X-Real-IP Fallback**: Secondary header support for different proxy configurations
- **Express IP Extraction**: Final fallback to Express's built-in IP detection
- **IPv6 Compatibility**: Handles both IPv4 and IPv6 addresses correctly

#### Security Validation Flow

```mermaid
flowchart TD
    A[Session Request] --> B[Extract Current Context]
    B --> C{IP Address Match?}
    C -->|No| D[Terminate Session]
    C -->|Yes| E{User-Agent Match?}
    E -->|No| F[Terminate Session]
    E -->|Yes| G[Update Last Used]
    D --> H[Throw Security Error]
    F --> H
    G --> I[Allow Request]
    H --> J[Session Invalidated]
```

#### Enhanced Authentication Middleware

The `optionalAuth` middleware now automatically enforces security validation:

```typescript
// Automatic security enforcement in middleware
SessionService.validateSession(sessionToken, req, true)
  .then((sessionInfo) => {
    if (sessionInfo) {
      req.sessionInfo = sessionInfo;
    }
    next();
  })
  .catch(() => {
    // Security violations automatically handled
    next();
  });
```

**Benefits:**
- **Transparent Security**: Security validation happens automatically for all session-based requests
- **No Code Changes Required**: Existing session endpoints automatically benefit from enhanced security
- **Consistent Protection**: All session operations use the same security validation logic

#### Session Creation with Security Context

Enhanced session creation captures security context automatically:

```typescript
// Unified session creation with automatic context capture
const sessionResponse = await SessionService.createSession(
  userId,
  keepMeLoggedIn,
  request  // Request object automatically extracts IP/User-Agent
);

// Alternative: Direct parameter passing still supported
const sessionResponse = await SessionService.createSession(
  userId,
  keepMeLoggedIn,
  userAgent,
  ipAddress
);
```

#### Error Handling & Security Responses

**Security Violation Responses:**
```json
// IP Address Change Detection
{
  "errors": [
    {
      "message": "Session terminated due to security policy violation: IP address changed",
      "extensions": {
        "code": "UNAUTHORIZED"
      }
    }
  ]
}

// User-Agent Change Detection  
{
  "errors": [
    {
      "message": "Session terminated due to security policy violation: User-Agent changed",
      "extensions": {
        "code": "UNAUTHORIZED"
      }
    }
  ]
}
```

**Security Event Logging:**
```typescript
// Comprehensive security violation logging
console.warn(`Session security violation: IP changed from ${storedIP} to ${currentIP} for user ${userId}`);
console.warn(`Session security violation: User-Agent changed from "${storedUA}" to "${currentUA}" for user ${userId}`);
```

#### Refresh Token Security

Enhanced refresh token validation includes the same security measures:

```typescript
// Refresh tokens also validate security context
export async function refreshSession(
  refreshToken: string
): Promise<SessionTokenResponse> {
  // Session context security is validated before token refresh
  // IP/User-Agent changes prevent refresh token usage
}
```

**Security Features:**
- **Refresh Protection**: Refresh tokens cannot be used if session security has been compromised
- **Automatic Termination**: Compromised sessions are terminated during refresh attempts
- **Audit Trail**: All refresh attempts with security violations are logged

#### Production Security Configuration

**Express Proxy Trust Configuration:**
```typescript
// Enable proper IP detection behind proxies
app.set('trust proxy', true);
```

**Environment-Specific Security:**
- **Development**: Relaxed validation for local testing
- **Test**: Controlled environment with predictable request contexts
- **Production**: Full security enforcement with proxy support

#### Security Testing & Validation

Comprehensive test suite validates all security features:

```typescript
// Security validation test examples
describe('Session Security Validation', () => {
  it('should reject when IP changes with security checks enforced', async () => {
    // Creates session with original IP
    const sessionToken = await createSessionWithIP('192.168.1.100');
    
    // Attempts access from different IP
    await expect(
      SessionService.validateSession(sessionToken, differentIPRequest, true)
    ).rejects.toThrow('Session terminated due to security policy violation: IP address changed');
  });

  it('should reject when UserAgent changes with security checks enforced', async () => {
    // Creates session with original User-Agent
    const sessionToken = await createSessionWithUserAgent('Original Browser');
    
    // Attempts access with different User-Agent
    await expect(
      SessionService.validateSession(sessionToken, differentUARequest, true)
    ).rejects.toThrow('Session terminated due to security policy violation: User-Agent changed');
  });
});
```

**Test Coverage:**
- **IP Change Detection**: Validates automatic session termination on IP changes
- **User-Agent Validation**: Confirms User-Agent mismatches trigger security responses
- **Proxy Header Handling**: Tests X-Forwarded-For and X-Real-IP header processing
- **Refresh Token Security**: Validates refresh tokens respect security constraints
- **Request Context Extraction**: Comprehensive testing of IP/User-Agent extraction logic

#### Security Benefits

**Attack Prevention:**
- **Session Hijacking**: Prevents stolen session tokens from being used on different devices/networks
- **Cross-Device Attacks**: Blocks usage of session tokens on unauthorized devices
- **Network-Level Protection**: Detects session usage from different network locations
- **Browser Fingerprinting**: User-Agent validation adds device-level security

**Audit & Monitoring:**
- **Security Event Logging**: All security violations are logged for monitoring and analysis
- **Session Termination Tracking**: Comprehensive audit trail of terminated sessions
- **Attack Pattern Detection**: Logs enable identification of systematic attack attempts

**Production Readiness:**
- **CDN/Proxy Support**: Works correctly behind Cloudflare, AWS CloudFront, nginx, etc.
- **Load Balancer Compatibility**: Handles X-Forwarded-For headers from load balancers
- **IPv6 Support**: Compatible with modern IPv6 network infrastructures
- **Graceful Degradation**: Falls back to Express IP detection when proxy headers unavailable

#### Migration & Compatibility

**Backward Compatibility:**
- **Existing Sessions**: All existing session functionality preserved
- **Optional Enforcement**: Security validation can be disabled for specific use cases
- **Gradual Rollout**: Security features can be enabled incrementally

**Implementation Notes:**
- **Zero Breaking Changes**: All existing session endpoints continue to work
- **Automatic Activation**: Security features activate automatically for new sessions
- **Testing Support**: Test environment provides controlled request contexts for reliable testing

## 📋 Postman Collection & API Documentation

### Complete Postman Collection

The API includes a comprehensive **724-line Postman collection** with automated token management and all endpoints documented.

#### Collection Features

- **Automated Authentication**: Scripts automatically extract and store access tokens
- **Environment Variables**: Dynamic client credentials and token management  
- **Complete Coverage**: All GraphQL queries and mutations included
- **Error Examples**: Documented error scenarios with expected responses
- **Request Organization**: Grouped by feature (Authentication, Users, Clients, Signup)

#### Import Collection

```bash
# Collection location
./postman/49009646-56180f25-810e-486a-b932-a790b875dca6.json

# Import steps:
# 1. Open Postman
# 2. Click "Import" 
# 3. Select the collection JSON file
# 4. Configure environment variables
```

#### Environment Setup

Create a Postman environment with these variables:

```json
{
  "baseUrl": "http://localhost:3000",
  "clientId": "your-client-id",
  "clientSecret": "your-client-secret", 
  "scope": "read write",
  "accessToken": "",  // Auto-populated by auth script
  "sessionToken": ""  // Auto-populated by login script
}
```

#### Dual Authentication Headers

Session management endpoints automatically include both authentication headers:

```http
# OAuth2 authentication (handled by collection variables)
Authorization: Bearer {{accessToken}}

# Session authentication (handled by collection variables)
X-Session-Token: {{sessionToken}}
```

The collection includes automated scripts that:
1. **Extract OAuth2 tokens** from authentication responses
2. **Extract session tokens** from login responses  
3. **Set both headers** automatically on session endpoints
4. **Handle token refresh** for both authentication types

#### Automated Token Management

The collection includes scripts that automatically:

1. **Extract Tokens**: Post-request scripts save access tokens to environment
2. **Set Headers**: Pre-request scripts add Authorization headers automatically
3. **Handle Errors**: Display authentication errors clearly
4. **Token Refresh**: Easy re-authentication when tokens expire

```javascript
// Example auto-token script in collection
if (pm.response.code === 200) {
    const response = pm.response.json();
    pm.collectionVariables.set('accessToken', response.data.authenticate.access_token);
    console.log('Access token saved to collection variable');
}
```

### API Documentation Structure

The Postman collection is organized as follows:

#### 🔐 Authentication
- `Get OAuth2 Access Token` - Client credentials flow
- `Token Validation Examples` - Valid/invalid credential tests

#### 👤 User Management  
- `Get All Users` - Paginated user listing
- `Get User by ID` - Individual user lookup
- `Create User` - User creation with profile fields
- `Update User` - Profile updates and modifications
- `Delete User` - User removal

#### 📧 Signup Flow
- `Initiate Signup` - Email verification initiation
- `Complete Signup` - Account creation with verification code
- `Signup Error Cases` - Rate limiting and validation examples

#### ⚙️ Client Management (Admin)
- `Get All Clients` - OAuth2 client listing
- `Create Client` - New client registration  
- `Update Client` - Client modification
- `Regenerate Secret` - Security credential rotation
- `Delete Client` - Client removal

## 🚀 DevOps & Development Tools

### Modern Development Stack

#### Code Quality Tools
```bash
# Biome - Modern linting and formatting (replaces ESLint + Prettier)
npm run lint          # Check for issues
npm run lint:fix      # Auto-fix issues
npm run format        # Format code
npm run format:check  # Check formatting
npm run check         # Run all checks
npm run check:fix     # Fix all issues
```

#### Git Hooks & Quality Gates
```bash
# Husky + lint-staged for pre-commit hooks
npm run prepare       # Setup git hooks

# Pre-commit automatically runs:
# - TypeScript type checking
# - Biome linting and formatting
# - Test validation on changed files
```

#### Development Scripts
```bash
# Development workflow
npm run dev           # Start with hot reload (nodemon + ts-node)
npm run build         # TypeScript compilation
npm run start         # Production server
npm run type-check    # TypeScript validation without build
```

### OAuth2 Client Management Automation

#### Setup Script Features (`scripts/setup-admin-client.ts` - 327 lines)

```bash
# Client creation with presets
npm run setup:client -- --preset admin --name "Admin Dashboard"
npm run setup:client -- --preset read-write --name "Mobile App"
npm run setup:client -- --preset read-only --name "Analytics Service"
npm run setup:client -- --preset service --name "Background Jobs"

# Custom client configuration
npm run setup:client -- --scopes "read write" --name "Custom App" --description "Special purpose client" --expires 7200

# Management commands
npm run setup:client -- --list                    # List all clients
npm run setup:client -- --help                    # Show all options
npm run setup:client -- --force                   # Bypass duplicate checks
```

#### Client Preset Configurations

| Preset | Scopes | Token Expiry | Use Case |
|--------|--------|-------------|----------|
| `admin` | `read write admin` | 1 hour | Administrative interfaces |
| `read-write` | `read write` | 2 hours | Standard applications |
| `read-only` | `read` | 4 hours | Analytics, dashboards |
| `service` | `read write` | 24 hours | Background services |

### Environment Configuration

#### Multi-Environment Support
```bash
# Development
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/witchly-app-dev
# Email logging to console

# Test  
NODE_ENV=test
MONGODB_URI=mongodb://localhost:27017/witchly-app-test
# Mocked email service, isolated database

# Production
NODE_ENV=production
MONGODB_URI=mongodb+srv://cluster.mongodb.net/witchly-app-prod
# AWS SES email service, production database
```

#### AWS SES Production Configuration
```bash
# Production email service
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=AKIA...  # AWS SES SMTP username
SMTP_PASS=BPaX...  # AWS SES SMTP password
EMAIL_FROM=noreply@witchly.app
EMAIL_FROM_NAME=Witchly
```

### Database Management

#### MongoDB Configuration
```typescript
// Automatic connection management
export const connectDB = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is required');
    }
    
    await mongoose.connect(mongoUri, { 
      dbName: process.env.DB_NAME || 'test' 
    });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);  // Exit in production, continue in tests
    }
  }
};
```

#### Performance Optimizations
- **Strategic Indexing**: Optimized queries with compound indexes
- **TTL Indexes**: Automatic cleanup of expired verification codes and signups
- **Connection Pooling**: Efficient database connection management
- **Query Optimization**: Pagination limits and efficient sorting

### CI/CD Pipeline Ready

#### GitHub Actions Integration
```bash
# CI/CD optimized test command
npm run test:ci

# Features:
# - No watch mode (--watchAll=false)
# - Coverage reporting for CI tools
# - Proper exit codes for pipeline integration
# - Force exit to prevent hanging processes
```

#### Docker Readiness
The application is containerization-ready with:
- Environment variable configuration
- Health check endpoints (`/health`)
- Graceful database connection handling
- Production build optimization

This comprehensive DevOps setup ensures smooth development workflows, automated quality checks, and production deployment readiness.
      .post('/graphql')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        query: `query { clients { clientId name } }`
      });

    expect(response.status).toBe(200);
    expect(response.body.data).toBeDefined();
  });
});
```

#### GraphQL Testing
```typescript
describe('GraphQL API', () => {
  it('should handle GraphQL queries', async () => {
    const query = `
      query {
        users {
          id
          name
          email
        }
      }
    `;

    const response = await testRequest
      .post('/graphql')
      .send({ query });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
  });
});
```

### Test Configuration

#### Jest Configuration (`jest.config.js`)
- **Global Setup**: Initializes test environment variables
- **Global Teardown**: Cleans up test database after all tests
- **Setup Files**: Configures global test utilities and timeouts
- **Coverage**: Excludes test files and type definitions from coverage

#### Global Test Utilities
- **`testRequest`**: Global Supertest instance for HTTP testing
- **Server Initialization**: Single server instance shared across all tests
- **Database Cleanup**: Automatic test data isolation and cleanup

### Test Coverage

```bash
# Generate coverage report
npm run test:coverage

# View coverage in browser
open coverage/lcov-report/index.html
```

**Coverage includes**:
- All source files (`src/**/*.ts`)
- Excludes test files, type definitions, and setup files
- Reports in multiple formats: text, lcov, html

### Debugging Tests

#### Running Specific Tests
```bash
# Run specific test file
npm test -- auth.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="should handle authentication"

# Run tests with verbose output
npm test -- --verbose
```

#### Common Test Patterns
- **Authentication**: OAuth2 client credentials flow testing
- **GraphQL**: Query and mutation testing with type validation
- **Database**: Model creation, validation, and relationship testing
- **Middleware**: JWT validation and scope checking
- **Error Handling**: Invalid requests and edge cases

### CI/CD Testing

For continuous integration, tests run with:
- **MongoDB Atlas**: Cloud database for consistent testing environment
- **Coverage Reports**: Automated coverage reporting and thresholds
- **Parallel Execution**: Optimized for CI/CD pipeline performance

Tests use Supertest for HTTP endpoint testing and include comprehensive JWT authentication flows.

## 🎨 Code Quality & Tooling

### Biome (Linting & Formatting)

Biome provides fast linting and formatting with TypeScript support:

```bash
# Check code quality
npm run check

# Auto-fix issues
npm run check:fix

# Format only
npm run format

# Lint only
npm run lint
```

**Configuration**: `biome.json` with TypeScript decorator support enabled.

### TypeScript

Strict TypeScript configuration with comprehensive type checking:

```bash
# Type checking
npm run type-check

# Build TypeScript
npm run build
```

**Features enabled**:
- Strict mode with all strict options
- Experimental decorators for GraphQL
- Comprehensive type inference

### Pre-commit Hooks (Husky + lint-staged)

Automatic code quality checks before commits:

- **Biome checks** on staged TypeScript files
- **TypeScript compilation** check
- **Test execution** to ensure nothing breaks

Configuration in `.husky/pre-commit` and `package.json`.

## 🚦 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with nodemon |
| `npm start` | Start production server |
| `npm run build` | Build TypeScript to JavaScript |
| `npm test` | Run Jest tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run test:ci` | Run tests for CI environment |
| `npm run setup:client` | Create OAuth2 clients with different permission levels |
| `npm run lint` | Run Biome linting |
| `npm run lint:fix` | Fix auto-fixable lint issues |
| `npm run format` | Format code with Biome |
| `npm run check` | Run all Biome checks |
| `npm run check:fix` | Fix all auto-fixable issues |
| `npm run type-check` | TypeScript type checking |

## 🔄 CI/CD Pipeline

GitHub Actions workflow runs on every push and pull request:

1. **Setup**: Node.js 22.18.0 with npm cache
2. **Dependencies**: `npm ci` for clean installs
3. **Linting**: `npm run check` for code quality
4. **Type Checking**: `npm run type-check` for TypeScript validation
5. **Testing**: `npm run test:coverage` with coverage reports
6. **Building**: `npm run build` for production readiness

## 🚀 Deployment

The application builds to the `dist/` directory and can be deployed to any Node.js hosting platform:

```bash
# Build for production
npm run build

# Start production server
npm start
```

**Environment variables required in production**:
- `MONGODB_URI` - MongoDB connection string
- `NODE_ENV=production`
- `PORT` - Server port (optional, defaults to 3000)
- `JWT_SECRET` - Strong secret for JWT signing (256+ bits recommended)

**Security Checklist for Production**:
- ✅ Use HTTPS for all client communication
- ✅ Generate strong JWT secret: `openssl rand -hex 32`
- ✅ Configure MongoDB with authentication
- ✅ Set up proper CORS policies
- ✅ Use environment variables for all secrets
- ✅ Enable rate limiting (consider implementing per-client limits)

## 🔧 Development Workflow

1. **Create feature branch**: `git checkout -b feature/new-feature`
2. **Make changes**: Code with full TypeScript and GraphQL support
3. **Pre-commit checks**: Automatic linting, formatting, and testing
4. **Push changes**: `git push origin feature/new-feature`
5. **CI validation**: GitHub Actions runs all quality checks
6. **Create PR**: Review and merge when all checks pass

## 📝 Environment Variables

Create a `.env` file based on `.env.example`:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/witchly-app-dev

# Server
NODE_ENV=development
PORT=3000

# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

**Production Notes:**
- Use a strong JWT secret (256+ bits): `openssl rand -hex 32`
- Set `NODE_ENV=production`
- Use MongoDB Atlas or secure MongoDB instance
- Consider environment-specific JWT secrets

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes following the coding standards
4. Ensure all tests pass and code is properly formatted
5. Commit using conventional commit messages
6. Push to your fork and submit a pull request

All contributions are validated by the CI pipeline and pre-commit hooks to maintain code quality.

## 📄 License

This project is licensed under the ISC License - see the package.json file for details.