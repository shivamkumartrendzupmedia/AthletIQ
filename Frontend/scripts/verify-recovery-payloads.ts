import {
  buildForgotPasswordPayload,
  buildResetPasswordPayload,
} from '../src/lib/recoveryPayloads.js';

let passed = 0;
let failed = 0;

function assert(cond: boolean, desc: string): void {
  if (cond) {
    console.log(`  ✓ PASS: ${desc}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${desc}`);
    failed++;
  }
}

console.log('\n--- VERIFYING PASSWORD RECOVERY PAYLOADS ---');

// Test Forgot Password Payload
const fp1 = buildForgotPasswordPayload('  USER@Domain.COM  ');
assert(fp1.email === 'user@domain.com', 'Forgot password payload trims and lowercases email');

const fp2 = buildForgotPasswordPayload('');
assert(fp2.email === '', 'Empty email handled gracefully');

// Test Reset Password Payload
const rp1 = buildResetPasswordPayload({
  token: '  abcdef123456  ',
  password: 'Password123!',
  confirmPassword: 'Password123!',
});
assert(rp1.token === 'abcdef123456', 'Reset password payload trims token');
assert(rp1.password === 'Password123!', 'Password preserved exactly');
assert(rp1.confirmPassword === 'Password123!', 'Confirm password preserved exactly');

const rp2 = buildResetPasswordPayload({
  token: '',
  password: '',
  confirmPassword: '',
});
assert(rp2.token === '' && rp2.password === '' && rp2.confirmPassword === '', 'Empty inputs produce safe clean payload');

console.log(`\nRecovery Payloads: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
