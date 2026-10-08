import readline from 'readline';
import mongoose from 'mongoose';
import { connectDB } from '../src/config/db.js';
import { User } from '../src/models/User.js';
import { ROLES, type Role } from '../src/models/constants.js';
import { hashPassword } from '../src/utils/password.js';

const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

/**
 * Prompt standard text from user with visible echo.
 */
function askQuestion(rl: readline.Interface, query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      resolve(answer.trim());
    });
  });
}

/**
 * Prompt secret from user with echo completely muted (no characters printed).
 * Supports backspace and clean Ctrl+C interruption.
 */
function askHidden(query: string): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(query);
    const stdin = process.stdin;
    const isTTY = Boolean(stdin.isTTY);
    const wasRaw = stdin.isRaw ?? false;

    if (isTTY) {
      stdin.setRawMode(true);
    }
    stdin.resume();
    stdin.setEncoding('utf8');

    let input = '';
    const onData = (char: string) => {
      // Ctrl+C check
      if (char === '\u0003') {
        if (isTTY) stdin.setRawMode(wasRaw);
        stdin.removeListener('data', onData);
        process.stdout.write('\nOperation cancelled by user.\n');
        process.exit(0);
      }
      // Enter key
      if (char === '\r' || char === '\n') {
        if (isTTY) stdin.setRawMode(wasRaw);
        stdin.removeListener('data', onData);
        process.stdout.write('\n');
        resolve(input);
        return;
      }
      // Backspace
      if (char === '\u0008' || char === '\u007f') {
        if (input.length > 0) {
          input = input.slice(0, -1);
        }
        return;
      }
      input += char;
    };

    stdin.on('data', onData);
  });
}

async function main(): Promise<void> {
  console.log('\n========================================');
  console.log('   ATHLETIQ User Provisioning Utility   ');
  console.log('========================================\n');

  await connectDB();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  // Handle Ctrl+C from readline interface
  rl.on('SIGINT', async () => {
    console.log('\n\nOperation cancelled.');
    rl.close();
    await mongoose.disconnect();
    process.exit(0);
  });

  try {
    // 1. Full Name
    let name = '';
    while (!name) {
      name = await askQuestion(rl, 'Full Name: ');
      if (!name || name.length < 2) {
        console.log('❌ Name must be at least 2 characters long.');
        name = '';
      }
    }

    // 2. Email Address
    let email = '';
    while (!email) {
      const emailInput = await askQuestion(rl, 'Email Address: ');
      const normalizedEmail = emailInput.toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        console.log('❌ Please enter a valid email address.');
        continue;
      }

      const existing = await User.findOne({ email: normalizedEmail });
      if (existing) {
        console.log(`❌ User with email "${normalizedEmail}" already exists.`);
        continue;
      }
      email = normalizedEmail;
    }

    // 3. Role
    console.log(`\nAvailable Roles: ${ROLES.join(', ')}`);
    let role: Role | null = null;
    while (!role) {
      const roleInput = await askQuestion(rl, 'Assign Role: ');
      const matched = ROLES.find(
        (r) => r.toLowerCase() === roleInput.toLowerCase()
      );
      if (matched) {
        role = matched;
      } else {
        console.log(`❌ Invalid role. Choose one of: ${ROLES.join(', ')}`);
      }
    }

    // Close standard readline interface before reading password without echo
    rl.close();

    // 4. Password (with echo disabled, asked twice)
    let password = '';
    while (!password) {
      const p1 = await askHidden('\nPassword: ');
      if (!passwordPattern.test(p1)) {
        console.log(
          '❌ Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number.'
        );
        continue;
      }

      const p2 = await askHidden('Confirm Password: ');
      if (p1 !== p2) {
        console.log('❌ Passwords do not match. Please try again.');
        continue;
      }

      password = p1;
    }

    // 5. Hash and Create User
    console.log('\nHashing password and creating account...');
    const passwordHash = await hashPassword(password);

    const newUser = await User.create({
      name,
      email,
      passwordHash,
      role,
      isActive: true,
    });

    console.log('\n✅ User successfully created!');
    console.log(`   - ID: ${newUser.id}`);
    console.log(`   - Name: ${newUser.name}`);
    console.log(`   - Email: ${newUser.email}`);
    console.log(`   - Role: ${newUser.role}`);
    console.log('========================================\n');
  } catch (err: unknown) {
    const error = err as Error;
    console.error('\n❌ Failed to create user:', error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

main().catch(async (err) => {
  console.error('Fatal CLI Error:', err);
  await mongoose.disconnect();
  process.exit(1);
});
