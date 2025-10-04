# Witchly App API

A modern TypeScript Express.js API with GraphQL and MongoDB integration, featuring comprehensive tooling for development, testing, and code quality.

## 🚀 Tech Stack

- **Runtime**: Node.js 22.18.0 with TypeScript
- **Framework**: Express.js 5.x
- **Database**: MongoDB with Mongoose ODM
- **API**: GraphQL with Apollo Server v5 and type-graphql
- **Authentication**: JWT with OAuth2 Client Credentials flow
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
- **REST endpoints**: `http://localhost:3000`
- **GraphQL endpoint**: `http://localhost:3000/graphql`

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
├── middleware/
│   └── auth.middleware.ts   # JWT authentication middleware
├── controllers/
│   └── auth.controller.ts   # OAuth2 token endpoint
├── graphql/
│   ├── types/
│   │   ├── User.ts          # GraphQL type definitions
│   │   └── ClientType.ts    # Client management types
│   ├── inputs/
│   │   └── UserInput.ts     # Input types for mutations
│   ├── resolvers/
│   │   ├── UserResolver.ts  # User operations
│   │   └── ClientResolver.ts # Client management (admin only)
│   └── server.ts            # Apollo Server setup with auth context
├── test/
│   ├── setup.ts             # Jest test configuration
│   ├── app.test.ts          # Basic app tests
│   └── auth.test.ts         # Authentication flow tests
├── app.ts                   # Express app with GraphQL and auth
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

**Queries:**
- `users` - Fetch all users
- `user(id: ID!)` - Fetch user by ID

**Mutations:**
- `createUser(input: CreateUserInput!)` - Create new user
- `updateUser(id: ID!, input: UpdateUserInput!)` - Update user
- `deleteUser(id: ID!)` - Delete user

### GraphQL Playground

In development mode, you can explore the API using GraphQL introspection at `http://localhost:3000/graphql`.

## 🔐 JWT Authentication (Client Credentials)

This API implements **OAuth2 Client Credentials** flow using JWT tokens for application-to-application authentication. This ensures only authorized applications can access your API.

### Authentication Flow Overview

```mermaid
sequenceDiagram
    participant App as Client Application
    participant API as Witchly API
    participant DB as Database

    App->>API: POST /oauth/token (client_id, client_secret)
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

### 2. Client Registration (Admin Required)

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

### 3. Get Access Token

Exchange your client credentials for a JWT access token:

```bash
curl -X POST http://localhost:3000/oauth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "client_credentials",
    "client_id": "client_abc123def456...",
    "client_secret": "def789ghi012...",
    "scope": "read write"
  }'
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "read write"
}
```

### 4. Use Access Token

Include the token in the Authorization header for all API requests:

```bash
# GraphQL Request
curl -X POST http://localhost:3000/graphql \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{"query": "{ users { id name email } }"}'
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
    const response = await fetch(`${this.baseURL}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        scope: 'read write'
      })
    });

    const data = await response.json();
    this.accessToken = data.access_token;
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

Test the authentication flow:

```bash
# Test token generation
npm run test -- --testPathPatterns=auth.test.ts

# Manual testing with curl
curl -X POST http://localhost:3000/oauth/token \
  -H "Content-Type: application/json" \
  -d '{"grant_type":"client_credentials","client_id":"test","client_secret":"test"}'
```

## 🧪 Testing

### Test Environment Setup

The testing suite uses Jest with Supertest for HTTP endpoint testing and includes comprehensive authentication testing. Tests run against a separate test database to ensure isolation.

#### Prerequisites for Testing

1. **MongoDB Test Database**: Tests require a MongoDB instance for integration testing
   ```bash
   # Option 1: Local MongoDB (recommended for development)
   # Make sure MongoDB is running locally on default port 27017
   
   # Option 2: MongoDB Atlas (for CI/CD)
   # Set TEST_MONGODB_URI in your environment
   ```

2. **Environment Variables**: Create a `.env.test` file or set test environment variables:
   ```bash
   NODE_ENV=test
   MONGODB_URI=mongodb://localhost:27017/witchly-app-test
   JWT_SECRET=test-jwt-secret-key
   ```

#### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage report
npm run test:coverage

# Run tests in watch mode (for development)
npm run test:watch

# Run tests for CI/CD pipelines
npm run test:ci
```

#### Test Database Management

The test suite automatically:
- **Initializes** the server once globally across all test files
- **Creates** a test database with isolated test data
- **Cleans up** all test data after test completion
- **Drops** the test database when all tests finish

**Global Test Setup**: Tests use a shared server instance and global `testRequest` helper to avoid redundant initialization.

### Test Structure & Patterns

#### Basic API Testing
```typescript
describe('Express App', () => {
  it('should return health status', async () => {
    const response = await testRequest.get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'OK');
  });
});
```

#### Authentication Testing
```typescript
describe('JWT Authentication', () => {
  let accessToken: string;

  beforeAll(async () => {
    // Get access token for protected routes
    const response = await testRequest
      .post('/oauth/token')
      .send({
        grant_type: 'client_credentials',
        client_id: 'test-client',
        client_secret: 'test-secret'
      });
    
    accessToken = response.body.access_token;
  });

  it('should access protected GraphQL endpoint', async () => {
    const response = await testRequest
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