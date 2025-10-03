# GitHub Copilot Instructions

You are working on a Node.js Express API with TypeScript, GraphQL, and MongoDB. Follow these guidelines when generating code suggestions:

## Tech Stack
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js 5.x
- **Database**: MongoDB with Mongoose ODM
- **API**: GraphQL with Apollo Server and type-graphql
- **Testing**: Jest with Supertest
- **Code Quality**: Biome for linting and formatting
- **Environment**: dotenv for configuration

## Code Style Preferences

### TypeScript
- Use strict TypeScript with proper type annotations
- Prefer `type` imports for types: `import { type MyType } from './types'`
- Use proper return types for all functions
- Use interface for object shapes, type for unions/primitives
- Enable all strict compiler options

### Imports
- Use ES6 import/export syntax
- Group imports: libraries first, then local modules
- Use absolute imports from src when possible
- Prefer named imports over default imports when available

### GraphQL with type-graphql
- Use decorators: `@Resolver`, `@Query`, `@Mutation`, `@Arg`, `@Field`
- Create separate input types with `@InputType()` for mutations
- Use `@ObjectType()` for GraphQL response types
- Always specify explicit types in `@Arg()` decorators: `@Arg('input', () => CreateUserInput)`

### Mongoose Models
- Define interfaces extending `Document` for model types
- Use Schema with timestamps option: `{ timestamps: true }`
- Export both interface and model: `export { IUser, User }`
- Use proper validation in schema definitions

### Error Handling
- Use try-catch blocks for async operations
- Log errors with descriptive messages
- Return appropriate HTTP status codes
- Handle MongoDB connection errors gracefully

### Testing
- Write tests for all API endpoints
- Use supertest for HTTP endpoint testing
- Mock external dependencies
- Test both success and error cases
- Use descriptive test names

### Environment Variables
- Use process.env with fallbacks
- Define all env vars in .env.example
- Use different databases for test/dev/prod
- Never commit .env files

## File Structure Patterns
```
src/
├── config/          # Database and app configuration
├── models/          # Mongoose models and interfaces
├── graphql/
│   ├── types/       # GraphQL type definitions
│   ├── inputs/      # Input types for mutations
│   ├── resolvers/   # GraphQL resolvers
│   └── server.ts    # Apollo Server setup
├── test/           # Test utilities and setup
└── app.ts          # Express app configuration
```

## Naming Conventions
- Use PascalCase for classes, interfaces, types
- Use camelCase for variables, functions, properties
- Use kebab-case for file names
- Use UPPER_SNAKE_CASE for constants and env vars
- Prefix interfaces with 'I': `IUser`, `IUserInput`

## Common Patterns

### Mongoose Model Pattern
```typescript
import { Schema, model, type Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
}

const userSchema = new Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true }
}, { timestamps: true });

export const User = model<IUser>('User', userSchema);
```

### GraphQL Resolver Pattern
```typescript
@Resolver(() => UserType)
export class UserResolver {
  @Query(() => [UserType])
  async users(): Promise<UserType[]> {
    // Implementation
  }

  @Mutation(() => UserType)
  async createUser(@Arg('input', () => CreateUserInput) input: CreateUserInput): Promise<UserType> {
    // Implementation
  }
}
```

### Test Pattern
```typescript
describe('API Endpoint', () => {
  it('should handle success case', async () => {
    const response = await request(app).get('/endpoint');
    expect(response.status).toBe(200);
  });
});
```

## What to Avoid
- Don't use `any` type unless absolutely necessary
- Don't use `require()` - use ES6 imports
- Don't mix async/await with .then()
- Don't skip error handling in async functions
- Don't hardcode configuration values
- Don't create functions without proper TypeScript types
- Don't use `var` - use `const` or `let`

## Environment Configuration
- Development: MongoDB local instance
- Test: Separate test database or mocks
- Production: MongoDB Atlas or cloud instance

Remember to always consider error handling, type safety, and test coverage when generating code suggestions.