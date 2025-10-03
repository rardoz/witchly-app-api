# Witchly App API

A modern TypeScript Express.js API with GraphQL and MongoDB integration, featuring comprehensive tooling for development, testing, and code quality.

## 🚀 Tech Stack

- **Runtime**: Node.js 22.18.0 with TypeScript
- **Framework**: Express.js 5.x
- **Database**: MongoDB with Mongoose ODM
- **API**: GraphQL with Apollo Server v5 and type-graphql
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
│   └── User.ts              # Mongoose models and interfaces
├── graphql/
│   ├── types/
│   │   └── User.ts          # GraphQL type definitions
│   ├── inputs/
│   │   └── UserInput.ts     # Input types for mutations
│   ├── resolvers/
│   │   └── UserResolver.ts  # GraphQL resolvers
│   └── server.ts            # Apollo Server setup
├── test/
│   ├── setup.ts             # Jest test configuration
│   └── app.ts               # Test-specific app configuration
├── app.ts                   # Express app with GraphQL integration
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

## 🧪 Testing

### Test Environment

Tests run in isolation without requiring MongoDB:

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run tests for CI
npm run test:ci
```

### Test Structure

```typescript
describe('API Endpoint', () => {
  it('should handle success case', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'OK');
  });
});
```

Tests use Supertest for HTTP endpoint testing and automatically skip database connections in test mode.

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
```

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