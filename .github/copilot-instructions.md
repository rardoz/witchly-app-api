# GitHub Copilot Instructions

You are working on the **Witchly App API** - a sophisticated social platform backend with Node.js, TypeScript, GraphQL, OAuth2 authentication, and MongoDB. Follow these guidelines when generating code suggestions:

## Tech Stack
- **Runtime**: Node.js with TypeScript (strict mode)
- **Framework**: Express.js 5.x
- **Database**: MongoDB with Mongoose ODM v8.x
- **API**: GraphQL with Apollo Server v5 and type-graphql v2.x
- **Authentication**: OAuth2 client credentials flow with JWT tokens
- **Email Service**: AWS SES via Nodemailer v7.x
- **Testing**: Jest with ts-jest, Supertest, global setup/teardown
- **Code Quality**: Biome for linting and formatting (replaces ESLint/Prettier)
- **Environment**: dotenv for configuration with .env.test support
- **Development**: Nodemon with ts-node for hot reload

## Architecture Overview

### Authentication & Authorization System
- **OAuth2 Client Credentials Flow**: Complete standards-compliant implementation
- **Three-Tier Scope System**: `read`, `write`, `admin` permissions with subset validation
- **JWT Tokens**: Secure token generation with configurable expiration (1-24 hours)
- **Client Management**: Crypto-secure client ID/secret generation with bcrypt hashing
- **Activity Tracking**: Client usage monitoring with `lastUsed` timestamps
- **Context-Aware Auth**: GraphQL middleware with `isAuthenticated` and `hasScope()` helpers

### Email & Signup System
- **Two-Phase Signup Flow**: Email verification → user creation with unique handles
- **6-Digit Verification Codes**: Hashed codes with 3-attempt rate limiting
- **Rate Limiting**: 1-minute cooldown between verification requests
- **AWS SES Integration**: Production-ready SMTP with TLS, HTML/text templates
- **Auto-Cleanup**: MongoDB TTL indexes for expired verifications and signups
- **Handle Generation**: Automatic unique handle creation during signup completion

### User Profile System
- **24 Profile Fields**: Comprehensive social platform profiles with shared schema
- **Social Media Integration**: Instagram, TikTok, Twitter, Snapchat handle validation
- **Rich Media Support**: Profile/backdrop images, custom colors, website URLs
- **Validation Constants**: Centralized validation rules with regex patterns
- **Type-Safe Profiles**: Strong TypeScript integration with `IProfileFields` interface

## Code Style Preferences

### TypeScript
- Use strict TypeScript with proper type annotations and `noEmit` type checking
- Prefer `type` imports for types: `import { type MyType } from './types'`
- Use explicit return types for all functions, especially resolvers
- Use `interface` for object shapes, `type` for unions/primitives/utility types
- Enable all strict compiler options in tsconfig.json
- Extend `Document` for Mongoose models: `interface IUser extends Document`

### Imports & Module System
- Use ES6 import/export syntax consistently
- Group imports: external libraries first, then local modules
- Use absolute imports from src when possible with proper tsconfig paths
- Prefer named imports over default imports when available
- Import reflect-metadata at top of GraphQL files for decorators

### GraphQL with type-graphql
- Use decorators: `@Resolver`, `@Query`, `@Mutation`, `@Arg`, `@Field`, `@Ctx`, `@ObjectType`, `@InputType`
- Create separate input types with `@InputType()` for all mutations
- Use `@ObjectType()` for GraphQL response types that extend shared schemas
- Always specify explicit types in `@Arg()` decorators: `@Arg('input', () => CreateUserInput)`
- Use `@Ctx() context: GraphQLContext` for authentication context
- Return proper GraphQL types, not Mongoose documents directly

### Authentication Patterns
- Always check authentication in protected resolvers:
  ```typescript
  if (!context.isAuthenticated || !context.hasScope('write')) {
    throw new UnauthorizedError('Write access required');
  }
  ```
- Use appropriate scopes: `read` for queries, `write` for mutations, `admin` for client management
- Public endpoints (signup initiation) don't require authentication
- Use `optionalAuth` middleware for endpoints that enhance experience with auth but don't require it

### Mongoose Models & Database
- Define interfaces extending `Document` for model types with proper field definitions
- Use Schema with timestamps option: `{ timestamps: true }`
- Export both interface and model: `export { IUser, User }`
- Use proper validation, indexing, and unique constraints in schema definitions
- Use shared profile schema from `src/shared/profile.schema.ts` for user profiles
- Implement TTL indexes for auto-cleanup: `{ expireAfterSeconds: 0 }`
- Use compound indexes for performance: `emailVerificationSchema.index({ email: 1, createdAt: -1 })`

### Error Handling
- Use custom error classes from `src/utils/errors.ts`:
  - `ValidationError` - 400 status (validation failures)
  - `UnauthorizedError` - 401 status (authentication required)
  - `ForbiddenError` - 403 status (insufficient permissions)
  - `NotFoundError` - 404 status (resource not found)
  - `ConflictError` - 409 status (resource already exists)
  - `TooManyRequestsError` - 429 status (rate limiting)
- Log errors with descriptive messages using console.error
- Return appropriate HTTP status codes via GraphQL extensions
- Handle MongoDB errors with proper type guards: `isMongoError()`

### Email Service Integration
- Use AWS SES configuration with proper TLS settings and authentication
- Support both email address and display name in from field
- Use HTML templates with fallback text versions for all emails
- Handle email failures gracefully - don't fail critical operations if email fails
- Log email sending attempts and failures for debugging
- Use rate limiting for verification emails (1-minute cooldown)

### Testing Best Practices
- Write comprehensive tests for all GraphQL endpoints with proper JWT authentication
- Use supertest for HTTP endpoint testing with global test setup
- Always include authorization headers: `.set('Authorization', \`Bearer \${accessToken}\`)`
- Mock external dependencies (email service, third-party APIs)
- Test both success and error cases with descriptive test names
- Use global setup/teardown for database initialization and cleanup
- Use separate test database with auto-cleanup between test runs
- Test pagination, validation, and edge cases thoroughly

### Environment Variables & Configuration
- Use process.env with fallbacks and validation
- Define all env vars in .env.example with descriptions
- Use different databases for test/dev/prod environments
- Never commit .env files or expose secrets
- Support comprehensive AWS SES configuration (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS)
- Use environment-specific configurations with proper defaults
- Validate required environment variables on startup

## File Structure Patterns
```
src/
├── config/          # Database and email configuration
├── middleware/      # Authentication middleware with GraphQL context
├── models/          # Mongoose models with TypeScript interfaces
├── graphql/
│   ├── types/       # GraphQL type definitions with @ObjectType
│   ├── inputs/      # Input types for mutations with validation
│   ├── resolvers/   # GraphQL resolvers with authentication
│   └── server.ts    # Apollo Server v5 setup with custom plugins
├── services/        # Business logic (email, JWT, authentication)
├── shared/          # Shared schemas and validation constants
├── utils/           # Utilities (errors, scopes, validation)
├── test/           # Comprehensive test files with global setup
└── app.ts          # Express app with GraphQL integration
```

## Naming Conventions
- Use PascalCase for classes, interfaces, types, GraphQL types
- Use camelCase for variables, functions, properties, GraphQL fields
- Use kebab-case for file names and directory names
- Use UPPER_SNAKE_CASE for constants and environment variables
- Prefix interfaces with 'I': `IUser`, `IClient`, `IEmailVerification`
- Use descriptive resolver names: `UserResolver`, `AuthResolver`, `SignupResolver`

## Common Patterns

### Authenticated GraphQL Resolver
```typescript
@Resolver(() => UserType)
export class UserResolver {
  @Query(() => [UserType])
  async users(
    @Ctx() context: GraphQLContext,
    @Arg('limit', () => Number, { nullable: true, defaultValue: 10 }) limit: number,
    @Arg('offset', () => Number, { nullable: true, defaultValue: 0 }) offset: number
  ): Promise<UserType[]> {
    if (!context.isAuthenticated || !context.hasScope('read')) {
      throw new UnauthorizedError('Read access required');
    }
    
    // Validate pagination parameters
    if (limit < 1 || limit > 100) {
      throw new ValidationError('Limit must be between 1 and 100');
    }
    
    const users = await UserModel.find()
      .skip(offset)
      .limit(limit)
      .sort({ createdAt: -1 });
    
    return users as UserType[];
  }

  @Mutation(() => UserType)
  async createUser(
    @Ctx() context: GraphQLContext,
    @Arg('input', () => CreateUserInput) input: CreateUserInput
  ): Promise<UserType> {
    if (!context.isAuthenticated || !context.hasScope('write')) {
      throw new UnauthorizedError('Write access required');
    }
    
    // Implementation with proper error handling
    try {
      const user = new UserModel(input);
      await user.save();
      return user as UserType;
    } catch (error) {
      if (isMongoError(error)) {
        throw new ConflictError('User with this email already exists');
      }
      throw error;
    }
  }
}
```

### Mongoose Model with Profile Fields Integration
```typescript
import { Schema, model, type Document } from 'mongoose';
import { createProfileFieldsSchema, type IProfileFields } from '../shared/profile.schema';

export interface IUser extends Document, IProfileFields {
  email: string;
  userType: string;
  emailVerified: boolean;
  handle: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>({
  // Profile fields from shared schema (24 fields)
  ...createProfileFieldsSchema(),
  
  // User-specific fields
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  userType: {
    type: String,
    required: true,
    default: 'basic',
    lowercase: true,
    trim: true,
  },
  emailVerified: {
    type: Boolean,
    required: true,
    default: false,
  },
  handle: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
}, { 
  timestamps: true,
});

// Performance indexes
userSchema.index({ email: 1 });
userSchema.index({ handle: 1 });
userSchema.index({ createdAt: -1 });

export const User = model<IUser>('User', userSchema);
```

### OAuth2 Authentication Flow
```typescript
@Mutation(() => AuthenticateResponse)
async authenticate(
  @Arg('grant_type') grant_type: string,
  @Arg('client_id') client_id: string,
  @Arg('client_secret') client_secret: string,
  @Arg('scope') scope: string
): Promise<AuthenticateResponse> {
  // Validate grant type
  if (grant_type !== 'client_credentials') {
    throw new ValidationError('Only client_credentials grant type is supported');
  }

  // Find and validate client
  const client = await Client.findOne({ clientId: client_id, isActive: true });
  if (!client) {
    throw new UnauthorizedError('Invalid client credentials');
  }

  // Verify client secret
  const isValidSecret = await verifyClientSecret(client_secret, client.clientSecret);
  if (!isValidSecret) {
    throw new UnauthorizedError('Invalid client credentials');
  }

  // Validate and parse scopes
  const requestedScopes = parseAndValidateScopes(scope);
  if (!validateScopeSubset(requestedScopes, client.allowedScopes)) {
    throw new UnauthorizedError('Requested scopes exceed allowed scopes');
  }

  // Generate access token
  const tokenResponse = generateAccessToken(client, requestedScopes);
  
  // Update client last used timestamp
  await Client.updateOne(
    { clientId: client_id },
    { lastUsed: new Date() }
  );

  return tokenResponse;
}
```

### Email Service Implementation
```typescript
// Email service with AWS SES configuration
const emailConfig: EmailConfig = {
  host: process.env.SMTP_HOST || 'email-smtp.us-east-1.amazonaws.com',
  port: Number.parseInt(process.env.SMTP_PORT || '587', 10),
  secure: false, // Use TLS for port 587
  requireTLS: true,
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
  from: process.env.EMAIL_FROM || 'noreply@witchly.app',
  fromName: process.env.EMAIL_FROM_NAME || 'Witchly',
};

// Send verification code email
async sendVerificationCode(email: string, code: string): Promise<void> {
  const template: EmailTemplate = {
    subject: 'Verify your email address',
    html: `
      <h2>Welcome to Witchly!</h2>
      <p>Your verification code is: <strong>${code}</strong></p>
      <p>This code will expire in 10 minutes.</p>
    `,
    text: `Welcome to Witchly! Your verification code is: ${code}. This code will expire in 10 minutes.`,
  };
  
  try {
    await this.emailService.sendEmail(email, template);
  } catch (error) {
    console.error('Email sending failed:', error);
    // Don't throw - email failure shouldn't break signup flow
  }
}
```

### Two-Phase Signup Implementation
```typescript
@Mutation(() => InitiateSignupResponse)
async initiateSignup(
  @Ctx() context: GraphQLContext,
  @Arg('input') input: InitiateSignupInput
): Promise<InitiateSignupResponse> {
  if (!context.isAuthenticated || !context.hasScope('write')) {
    throw new UnauthorizedError('Write access required');
  }

  const { email } = input;
  const emailFormatted = email.toLowerCase();

  // Check for existing user
  const existingUser = await User.findOne({ email: emailFormatted });
  if (existingUser) {
    throw new ConflictError('User with this email already exists');
  }

  // Rate limiting check
  const recentVerification = await EmailVerification.findOne({
    email: emailFormatted,
    createdAt: { $gte: new Date(Date.now() - 60000) }, // 1 minute ago
  });
  
  if (recentVerification) {
    throw new TooManyRequestsError('Please wait before requesting another verification code');
  }

  // Generate and hash verification code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const hashedCode = await bcrypt.hash(code, 12);

  // Save verification record
  const verification = new EmailVerification({
    email: emailFormatted,
    code: hashedCode,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
  });
  await verification.save();

  // Send email (don't await to prevent blocking)
  emailService.sendVerificationCode(emailFormatted, code);

  return {
    success: true,
    message: 'Verification code sent to your email',
    expiresAt: verification.expiresAt,
  };
}
```

### Test with JWT Authentication
```typescript
describe('Protected GraphQL Endpoint', () => {
  let accessToken: string;
  let testClient: { clientId: string; clientSecret: string };

  beforeAll(async () => {
    // Create test client
    testClient = {
      clientId: generateClientId(),
      clientSecret: generateClientSecret(),
    };

    const client = new Client({
      clientId: testClient.clientId,
      clientSecret: await hashClientSecret(testClient.clientSecret),
      name: 'Test Client',
      allowedScopes: ['read', 'write'],
      tokenExpiresIn: 3600,
    });
    await client.save();

    // Get access token
    const authResponse = await global.testRequest
      .post('/graphql')
      .send({
        query: `
          mutation {
            authenticate(
              grant_type: "client_credentials"
              client_id: "${testClient.clientId}"
              client_secret: "${testClient.clientSecret}"
              scope: "read write"
            ) {
              access_token
            }
          }
        `,
      });

    accessToken = authResponse.body.data.authenticate.access_token;
  });

  it('should work with valid authentication', async () => {
    const response = await global.testRequest
      .post('/graphql')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        query: `
          query {
            users(limit: 5) {
              id
              email
              handle
            }
          }
        `,
      });

    expect(response.status).toBe(200);
    expect(response.body.data.users).toBeDefined();
  });

  it('should reject requests without authentication', async () => {
    const response = await global.testRequest
      .post('/graphql')
      .send({
        query: `query { users { id email } }`,
      });

    expect(response.status).toBe(200); // GraphQL always returns 200
    expect(response.body.errors).toBeDefined();
    expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
  });
});
```

## What to Avoid
- Don't use `any` type unless absolutely necessary
- Don't use `require()` - use ES6 imports exclusively
- Don't mix async/await with .then() chains
- Don't skip error handling in async functions
- Don't hardcode configuration values - use environment variables
- Don't create functions without proper TypeScript return types
- Don't use `var` - use `const` or `let` with proper scoping
- Don't forget authentication checks in protected resolvers
- Don't call `email.toLowerCase()` multiple times - cache as `emailFormatted`
- Don't expose client secrets in GraphQL responses (only return during creation)
- Don't skip input validation in GraphQL mutations
- Don't forget to implement proper pagination limits (max 100 items)

## Environment Configuration & Deployment
- **Development**: MongoDB local instance, console email logging, detailed error messages
- **Test**: Separate test database with auto-cleanup, mocked email service, force exit after tests
- **Production**: MongoDB Atlas cluster, AWS SES for emails, error logging without sensitive data

## Key Features & Capabilities
- **Complete OAuth2 Implementation**: Standards-compliant client credentials flow with JWT
- **Two-Phase Email Signup**: Verification code → user creation with auto-generated handles
- **Comprehensive User Profiles**: 24 fields including social media handles and rich metadata
- **Scope-based Authorization**: Three-tier permission system (read/write/admin)
- **Production-ready Email**: AWS SES integration with HTML/text templates
- **Enterprise Testing**: 2000+ lines of tests with global setup/teardown
- **Modern Tooling**: Biome for linting/formatting, Apollo Server v5, Express v5
- **DevOps Automation**: Client setup scripts, Postman collection, comprehensive configuration

## Security Best Practices
- **Hashed Storage**: All secrets (client secrets, verification codes) stored with bcrypt
- **Rate Limiting**: Built into email verification system (1-minute cooldown)
- **Scope Validation**: Ensures clients can only request allowed scopes
- **Input Validation**: Comprehensive validation using class-validator and custom rules
- **JWT Security**: Configurable expiration, proper secret management
- **Database Security**: Indexed constraints, TTL for auto-cleanup, proper connection management

Remember to always consider authentication, type safety, error handling, and test coverage when generating code suggestions. This is a production-grade social platform API with enterprise-level security and development practices.