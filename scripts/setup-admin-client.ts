#!/usr/bin/env node

/**
 * Flexible OAuth2 client setup script
 * Run with: npm run setup:client [options]
 */

import 'reflect-metadata';
import 'dotenv/config';
import { connectDB, disconnectDB } from '../src/config/database';
import { Client } from '../src/models/Client';
import {
  generateClientId,
  generateClientSecret,
  hashClientSecret,
} from '../src/services/jwt.service';

interface ClientOptions {
  name: string;
  description: string;
  scopes: string[];
  tokenExpiresIn: number;
  type: 'admin' | 'user' | 'service' | 'custom';
}

const CLIENT_PRESETS: Record<
  string,
  Omit<ClientOptions, 'name' | 'description'>
> = {
  admin: {
    scopes: ['read', 'write', 'admin'],
    tokenExpiresIn: 3600, // 1 hour
    type: 'admin',
  },
  'read-write': {
    scopes: ['read', 'write'],
    tokenExpiresIn: 7200, // 2 hours
    type: 'user',
  },
  'read-only': {
    scopes: ['read'],
    tokenExpiresIn: 14400, // 4 hours (longer for read-only)
    type: 'user',
  },
  service: {
    scopes: ['read', 'write'],
    tokenExpiresIn: 86400, // 24 hours (for automated services)
    type: 'service',
  },
};

function showUsage() {
  console.log('🔧 OAuth2 Client Setup Tool');
  console.log('');
  console.log('Usage:');
  console.log(
    '  npm run setup:client -- --preset <preset> --name "Client Name"'
  );
  console.log(
    '  npm run setup:client -- --scopes read,write --name "Custom Client"'
  );
  console.log('');
  console.log('Available presets:');
  console.log('  admin      - Full admin access (read, write, admin)');
  console.log('  read-write - Standard user access (read, write)');
  console.log('  read-only  - Read-only access (read)');
  console.log(
    '  service    - Service account access (read, write, long-lived)'
  );
  console.log('');
  console.log('Custom options:');
  console.log('  --preset <preset>           Use a predefined preset');
  console.log('  --name <name>               Client name (required)');
  console.log('  --description <desc>        Client description');
  console.log('  --scopes <scope1,scope2>    Custom scopes (read,write,admin)');
  console.log('  --expires <seconds>         Token expiration time in seconds');
  console.log('  --list                      List existing clients');
  console.log(
    '  --force                     Create even if similar client exists'
  );
  console.log('');
  console.log('Examples:');
  console.log(
    '  npm run setup:client -- --preset admin --name "Admin Dashboard"'
  );
  console.log(
    '  npm run setup:client -- --preset read-only --name "Mobile App"'
  );
  console.log(
    '  npm run setup:client -- --scopes read,write --name "Custom API Client" --expires 1800'
  );
}

async function parseArguments(): Promise<ClientOptions | null> {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    showUsage();
    return null;
  }

  if (args.includes('--list')) {
    await listExistingClients();
    return null;
  }

  const getArgValue = (flag: string): string | undefined => {
    const index = args.indexOf(flag);
    return index !== -1 && index + 1 < args.length
      ? args[index + 1]
      : undefined;
  };

  const preset = getArgValue('--preset');
  const name = getArgValue('--name');
  const description = getArgValue('--description');
  const scopesStr = getArgValue('--scopes');
  const expiresStr = getArgValue('--expires');

  if (!name) {
    console.error('❌ Error: --name is required');
    console.log('');
    showUsage();
    process.exit(1);
  }

  let options: ClientOptions;

  if (preset && CLIENT_PRESETS[preset]) {
    options = {
      name,
      description: description || `${preset} client for ${name}`,
      ...CLIENT_PRESETS[preset],
    };
  } else if (scopesStr) {
    const scopes = scopesStr.split(',').map((s) => s.trim());
    const validScopes = ['read', 'write', 'admin'];
    const invalidScopes = scopes.filter((s) => !validScopes.includes(s));

    if (invalidScopes.length > 0) {
      console.error(`❌ Error: Invalid scopes: ${invalidScopes.join(', ')}`);
      console.log(`Valid scopes: ${validScopes.join(', ')}`);
      process.exit(1);
    }

    options = {
      name,
      description: description || `Custom client for ${name}`,
      scopes,
      tokenExpiresIn: expiresStr ? parseInt(expiresStr, 10) : 3600,
      type: 'custom',
    };
  } else {
    console.error('❌ Error: Either --preset or --scopes must be specified');
    console.log('');
    showUsage();
    process.exit(1);
  }

  return options;
}

async function listExistingClients() {
  try {
    await connectDB();
    const clients = await Client.find(
      {},
      {
        clientId: 1,
        name: 1,
        description: 1,
        allowedScopes: 1,
        isActive: 1,
        createdAt: 1,
      }
    ).sort({ createdAt: -1 });

    console.log('📋 Existing OAuth2 Clients:');
    console.log(
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
    );

    if (clients.length === 0) {
      console.log('No clients found.');
      return;
    }

    clients.forEach((client, index) => {
      const status = client.isActive ? '🟢 Active' : '🔴 Inactive';
      const scopes = client.allowedScopes.join(', ');
      console.log(`${index + 1}. ${client.name} ${status}`);
      console.log(`   Client ID: ${client.clientId}`);
      console.log(`   Scopes: ${scopes}`);
      console.log(`   Created: ${client.createdAt.toLocaleDateString()}`);
      if (client.description) {
        console.log(`   Description: ${client.description}`);
      }
      console.log('');
    });
  } finally {
    await disconnectDB();
  }
}

async function checkExistingClient(
  name: string,
  scopes: string[]
): Promise<boolean> {
  const existingClient = await Client.findOne({
    name: name,
    allowedScopes: { $all: scopes, $size: scopes.length },
  });

  if (existingClient) {
    console.log('⚠️  Similar client already exists!');
    console.log('');
    console.log('📋 Existing Client:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Name: ${existingClient.name}`);
    console.log(`Client ID: ${existingClient.clientId}`);
    console.log(`Scopes: ${existingClient.allowedScopes.join(', ')}`);
    console.log(`Active: ${existingClient.isActive}`);
    console.log(`Created: ${existingClient.createdAt}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('� To create anyway, add --force flag');
    return true;
  }

  return false;
}

async function createClient(options: ClientOptions) {
  try {
    console.log(`🚀 Creating ${options.type} OAuth2 client...`);

    await connectDB();

    // Check for existing client unless forced
    const force = process.argv.includes('--force');
    if (!force) {
      const exists = await checkExistingClient(options.name, options.scopes);
      if (exists) {
        return;
      }
    }

    // Generate client credentials
    const clientId = generateClientId();
    const clientSecret = generateClientSecret();
    const hashedSecret = await hashClientSecret(clientSecret);

    // Create client
    const client = new Client({
      clientId,
      clientSecret: hashedSecret,
      name: options.name,
      description: options.description,
      isActive: true,
      allowedScopes: options.scopes,
      tokenExpiresIn: options.tokenExpiresIn,
    });

    await client.save();

    // Display results
    const typeEmoji =
      {
        admin: '👑',
        user: '👤',
        service: '🤖',
        custom: '⚙️',
      }[options.type] || '📄';

    console.log(`✅ ${typeEmoji} ${options.type} client created successfully!`);
    console.log('');
    console.log('📋 Client Credentials:');
    console.log(
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
    );
    console.log(`Name:          ${options.name}`);
    console.log(`Type:          ${options.type}`);
    console.log(`Client ID:     ${clientId}`);
    console.log(`Client Secret: ${clientSecret}`);
    console.log(`Scopes:        ${options.scopes.join(', ')}`);
    console.log(
      `Token Expires: ${options.tokenExpiresIn} seconds (${
        Math.round((options.tokenExpiresIn / 3600) * 10) / 10
      } hours)`
    );
    console.log(
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
    );
    console.log('');
    console.log('� Save these credentials securely!');
    console.log('💡 Use these in your Postman collection or API client');
    console.log('');
    console.log('📝 Example OAuth2 request:');
    console.log(
      JSON.stringify(
        {
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret,
          scope: options.scopes.join(' '),
        },
        null,
        2
      )
    );
  } catch (error) {
    console.error('❌ Error creating client:', error);
    process.exit(1);
  } finally {
    await disconnectDB();
  }
}

async function main() {
  const options = await parseArguments();
  if (options) {
    await createClient(options);
  }
}

main().catch(console.error);
