import { updateProfileSchema } from '../../Backend/src/validators/profile.validator.js';
import { changePasswordSchema } from '../../Backend/src/validators/auth.validator.js';
import {
  buildProfilePayload,
  buildChangePasswordPayload,
} from '../src/lib/profilePayloads.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, description: string): void {
  if (condition) {
    console.log(`  ✓ PASS: ${description}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${description}`);
    failed++;
  }
}

console.log('--- VERIFYING PROFILE & PASSWORD PAYLOAD BUILDERS AGAINST REAL BACKEND ZOD SCHEMAS ---');

// 1. Profile Builder - minimal valid name
const payload1 = buildProfilePayload({ name: 'Alex Morgan' });
const res1 = updateProfileSchema.safeParse(payload1);
assert(res1.success, 'Valid name-only payload passes real Backend profile Zod schema');

// 2. Profile Builder - trimming behavior
const payload2 = buildProfilePayload({ name: '   Cristiano Ronaldo   ' });
assert(payload2.name === 'Cristiano Ronaldo', 'Name is trimmed correctly by payload builder');
const res2 = updateProfileSchema.safeParse(payload2);
assert(res2.success, 'Trimmed name passes real Backend profile schema');

// 3. Profile Builder - valid date of birth (age ~ 20)
const validDob = '2004-05-15';
const payload3 = buildProfilePayload({ name: 'Lionel Messi', dateOfBirth: validDob });
const res3 = updateProfileSchema.safeParse(payload3);
assert(res3.success, 'Full payload with valid DOB passes real Backend profile schema');

// 4. Profile Builder - date only
const payload4 = buildProfilePayload({ dateOfBirth: '2008-01-10' });
const res4 = updateProfileSchema.safeParse(payload4);
assert(res4.success, 'Date-only payload passes real Backend profile schema');

// 5. Schema rejection - empty body
const payload5 = buildProfilePayload({});
const res5 = updateProfileSchema.safeParse(payload5);
assert(!res5.success, 'Empty profile payload is rejected by real Backend profile schema');

// 6. Schema rejection - name too short
const res6 = updateProfileSchema.safeParse({ name: 'A' });
assert(!res6.success, 'Name with 1 character is rejected by real Backend profile schema');

// 7. Schema rejection - future date
const res7 = updateProfileSchema.safeParse({ dateOfBirth: '2099-01-01' });
assert(!res7.success, 'Future dateOfBirth is rejected by real Backend profile schema');

// 8. Schema rejection - age < 5
const currentYear = new Date().getFullYear();
const res8 = updateProfileSchema.safeParse({ dateOfBirth: `${currentYear - 3}-01-01` });
assert(!res8.success, 'Age under 5 is rejected by real Backend profile schema');

// 9. Schema rejection - unknown keys (strict check)
const res9 = updateProfileSchema.safeParse({ name: 'Valid Name', email: 'hack@test.com' });
assert(!res9.success, 'Extraneous key (email) is strictly rejected by real Backend profile schema');

// 10. Change Password Builder - valid matching password
const pwdPayload1 = buildChangePasswordPayload({
  currentPassword: 'OldPassword123!',
  newPassword: 'NewSecurePassword123!',
});
const pwdRes1 = changePasswordSchema.safeParse(pwdPayload1);
assert(pwdRes1.success, 'Valid change-password payload passes real Backend auth schema');

// 11. Change Password Schema - identical password rejected
const pwdRes2 = changePasswordSchema.safeParse({
  currentPassword: 'SamePassword123!',
  newPassword: 'SamePassword123!',
});
assert(!pwdRes2.success, 'Identical current and new password is rejected by real Backend schema');

// 12. Change Password Schema - weak password rejected
const pwdRes3 = changePasswordSchema.safeParse({
  currentPassword: 'OldPassword123!',
  newPassword: 'weak',
});
assert(!pwdRes3.success, 'Weak new password lacking uppercase/digit is rejected by real Backend schema');

// 13. Change Password Schema - missing current password rejected
const pwdRes4 = changePasswordSchema.safeParse({
  currentPassword: '',
  newPassword: 'ValidNewPassword123!',
});
assert(!pwdRes4.success, 'Empty current password is rejected by real Backend schema');

console.log('\n========================================');
console.log(`Summary: ${passed} passed, ${failed} failed`);
console.log('========================================\n');

if (failed > 0) {
  process.exit(1);
}
