import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

// Pre-computed hash of a dummy password to ensure consistent CPU execution time on non-existent users
const DUMMY_HASH = bcrypt.hashSync('dummy_timing_protection_value_for_athletiq_auth', SALT_ROUNDS);

/**
 * Hash a plain text password using bcrypt with 10 salt rounds.
 */
export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

/**
 * Compare a plain text password against a bcrypt hash.
 */
export const comparePassword = async (
  password: string,
  hash: string
): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

/**
 * Run a dummy bcrypt comparison against a precomputed hash to prevent
 * response-timing attacks when an email does not exist in the database.
 */
export const dummyPasswordCompare = async (password: string): Promise<boolean> => {
  return bcrypt.compare(password, DUMMY_HASH);
};
