import jwt from 'jsonwebtoken';
import { hash, compare } from 'bcrypt';
import crypto from 'crypto';
import User from '../models/User.js';
import OrganizationDetails from '../models/OrganizationDetails.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';

export const register = async (req, res) => {
  console.log('\n========== REGISTRATION START ==========');
  console.log(`[${new Date().toISOString()}] Registration request received`);
  console.log('Request body:', { email: req.body.email, name: req.body.name, password: '***' });

  try {
    const { email, password, name } = req.body;

    // Validate input
    if (!email || !password || !name) {
      console.log('❌ VALIDATION FAILED: Missing required fields');
      console.log('Missing fields:', { email: !email, password: !password, name: !name });
      console.log('========== REGISTRATION END ==========\n');
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    console.log('✓ Input validation passed');

    // Check if user already exists
    console.log('Checking if user already exists...');
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      console.log('❌ USER ALREADY EXISTS');
      console.log('Existing user ID:', existingUser.id);
      console.log('========== REGISTRATION END ==========\n');
      return res.status(409).json({ error: 'User already exists' });
    }

    console.log('✓ User does not exist, proceeding with registration');

    // Hash password
    console.log('Hashing password...');
    const passwordHash = await hash(password, 10);
    console.log('✓ Password hashed successfully');

    // Create user
    console.log('Creating user in database...');
    const userId = await User.create(email, passwordHash, name);
    console.log('✓ User created successfully');
    console.log('New user ID:', userId);

    // Generate JWT token
    const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';
    const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';
    console.log('Generating JWT token...');
    console.log('JWT Secret:', JWT_SECRET === 'your_jwt_secret_key' ? '(default)' : '(from env)');
    console.log('JWT Expiry:', JWT_EXPIRY);

    const token = jwt.sign({ id: userId, email, metaBusinessAccountId: null }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
    console.log('✓ JWT token generated successfully');
    console.log('Token (first 20 chars):', token.substring(0, 20) + '...');

    console.log('✓ REGISTRATION SUCCESSFUL');
    console.log('Response:', { userId, email, name });
    console.log('========== REGISTRATION END ==========\n');

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: { id: userId, email, name },
    });
  } catch (error) {
    console.error('❌ REGISTRATION ERROR');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Stack:', error.stack);
    console.log('========== REGISTRATION END ==========\n');
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const login = async (req, res) => {
  console.log('\n========== LOGIN START ==========');
  console.log(`[${new Date().toISOString()}] Login request received`);
  console.log('Request body:', { email: req.body.email, password: '***' });

  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      console.log('❌ VALIDATION FAILED: Missing email or password');
      console.log('========== LOGIN END ==========\n');
      return res.status(400).json({ error: 'Email and password are required' });
    }

    console.log('✓ Input validation passed');

    // Find user
    console.log('Looking up user by email...');
    const user = await User.findByEmail(email);
    if (!user) {
      console.log('❌ LOGIN FAILED: User not found');
      console.log('========== LOGIN END ==========\n');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log('✓ User found');
    console.log('User ID:', user.id);
    console.log('User email:', user.email);
    console.log('User name:', user.name);

    // Verify password
    console.log('Verifying password...');
    const isPasswordValid = await compare(password, user.password);
    if (!isPasswordValid) {
      console.log('❌ LOGIN FAILED: Password verification failed');
      console.log('========== LOGIN END ==========\n');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log('✓ Password verification successful');

    // Generate JWT token
    const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';
    const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';
    console.log('Generating JWT token...');
    console.log('JWT Secret:', JWT_SECRET === 'your_jwt_secret_key' ? '(default)' : '(from env)');
    console.log('JWT Expiry:', JWT_EXPIRY);

    const token = jwt.sign({ id: user.id, email: user.email, metaBusinessAccountId: user.meta_business_account_id }, JWT_SECRET, {
      expiresIn: JWT_EXPIRY,
    });

    console.log('✓ JWT token generated successfully');
    console.log('Token (first 20 chars):', token.substring(0, 20) + '...');
    console.log('✓ LOGIN SUCCESSFUL');
    console.log('Response:', { id: user.id, email: user.email, name: user.name, role: user.role });
    console.log("user : ", user);
    console.log('========== LOGIN END ==========\n');

    res.status(200).json({
      message: 'Login successful',
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (error) {
    console.error('❌ LOGIN ERROR');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Stack:', error.stack);
    console.log('========== LOGIN END ==========\n');
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getProfile = async (req, res) => {
  console.log('\n========== GET PROFILE START ==========');
  console.log(`[${new Date().toISOString()}] Get profile request`);
  console.log('Authenticated user:', { id: req.user.id, email: req.user.email });

  try {
    console.log('Fetching user profile from database...');
    const user = await User.findById(req.user.id);

    if (!user) {
      console.log('❌ PROFILE FETCH FAILED: User not found');
      console.log('========== GET PROFILE END ==========\n');
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('✓ User profile fetched successfully');

    // Fetch organization details
    console.log('Fetching organization details...');
    const organizationDetails = await OrganizationDetails.findByUserId(req.user.id);
    console.log('Organization details:', organizationDetails ? 'Found' : 'Not found');

    console.log('User data:', { id: user.id, email: user.email, name: user.name });
    console.log('========== GET PROFILE END ==========\n');

    res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        metaBusinessAccountId: user.meta_business_account_id || null
      },
      wallet: {
        balance: parseFloat(user.user_balance || 0),
        pricing: {
          marketingMessage: parseFloat(user.marketing_message_price || 0),
          utilityMessage: parseFloat(user.utility_message_price || 0),
          authMessage: parseFloat(user.auth_message_price || 0)
        }
      },
      organization: organizationDetails ? {
        id: organizationDetails.id,
        organizationName: organizationDetails.organization_name,
        physicalAddress: organizationDetails.physical_address,
        city: organizationDetails.city,
        state: organizationDetails.state,
        zipCode: organizationDetails.zip_code,
        country: organizationDetails.country,
        createdAt: organizationDetails.created_at,
        updatedAt: organizationDetails.updated_at
      } : null
    });
  } catch (error) {
    console.error('❌ GET PROFILE ERROR');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.log('========== GET PROFILE END ==========\n');
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const changePassword = async (req, res) => {
  console.log('\n========== CHANGE PASSWORD START ==========');
  console.log(`[${new Date().toISOString()}] Change password request`);
  console.log('Authenticated user:', { id: req.user.id, email: req.user.email });
  console.log('Request body:', { currentPassword: '***', newPassword: '***' });

  try {
    const { currentPassword, newPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword) {
      console.log('❌ VALIDATION FAILED: Missing required fields');
      console.log('========== CHANGE PASSWORD END ==========\n');
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    console.log('✓ Input validation passed');

    // Get user with password hash
    console.log('Fetching user with password hash...');
    const user = await User.findByEmail(req.user.email);
    if (!user) {
      console.log('❌ CHANGE PASSWORD FAILED: User not found');
      console.log('========== CHANGE PASSWORD END ==========\n');
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('✓ User found');

    // Verify current password
    console.log('Verifying current password...');
    const isPasswordValid = await compare(currentPassword, user.password);
    if (!isPasswordValid) {
      console.log('❌ CHANGE PASSWORD FAILED: Current password is incorrect');
      console.log('========== CHANGE PASSWORD END ==========\n');
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    console.log('✓ Current password verification successful');

    // Hash new password
    console.log('Hashing new password...');
    const newPasswordHash = await hash(newPassword, 10);
    console.log('✓ New password hashed');

    // Update password
    console.log('Updating password in database...');
    const updated = await User.updatePassword(req.user.id, newPasswordHash);
    if (!updated) {
      console.log('❌ CHANGE PASSWORD FAILED: Database update failed');
      console.log('========== CHANGE PASSWORD END ==========\n');
      return res.status(500).json({ error: 'Failed to update password' });
    }

    console.log('✓ PASSWORD CHANGED SUCCESSFULLY');
    console.log('========== CHANGE PASSWORD END ==========\n');

    res.status(200).json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('❌ CHANGE PASSWORD ERROR');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.log('========== CHANGE PASSWORD END ==========\n');
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const forgotPassword = async (req, res) => {
  console.log('\n========== FORGOT PASSWORD START ==========');
  console.log(`[${new Date().toISOString()}] Forgot password request`);
  console.log('Request body:', { email: req.body.email });

  try {
    const { email } = req.body;
    const MAX_RESET_ATTEMPTS = process.env.MAX_RESET_ATTEMPTS || 3;
    const RESET_ATTEMPT_WINDOW = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

    // Validate input
    if (!email) {
      console.log('❌ VALIDATION FAILED: Email is required');
      console.log('========== FORGOT PASSWORD END ==========\n');
      return res.status(400).json({ error: 'Email is required' });
    }

    console.log('✓ Input validation passed');
    console.log('Rate limit config:', { MAX_RESET_ATTEMPTS, RESET_ATTEMPT_WINDOW_HOURS: 24 });

    // Find user
    console.log('Looking up user by email...');
    const user = await User.findByEmail(email);
    if (!user) {
      // Don't reveal if user exists or not (security best practice)
      console.log('ℹ User not found (security: hiding this fact)');
      console.log('========== FORGOT PASSWORD END ==========\n');
      return res.status(200).json({ message: 'If email exists, reset link will be sent' });
    }

    console.log('✓ User found');
    console.log('User ID:', user.id);

    // Check reset attempts
    console.log('Checking reset attempts...');
    const attempts = await User.getResetAttempts(email);

    if (attempts) {
      const lastAttemptTime = new Date(attempts.reset_attempts_reset_at);
      const now = new Date();
      const timeSinceLastReset = now - lastAttemptTime;

      console.log('Previous reset attempts:', {
        count: attempts.reset_attempts,
        lastAttemptTime: lastAttemptTime.toISOString(),
        timeSinceLastReset_minutes: Math.round(timeSinceLastReset / 60000),
      });

      // If 24 hours have passed, reset the counter
      if (timeSinceLastReset > RESET_ATTEMPT_WINDOW) {
        console.log('✓ 24 hours have passed, resetting attempt counter');
        await User.resetAttemptCounter(email);
      } else if (attempts.reset_attempts >= MAX_RESET_ATTEMPTS) {
        // If still within 24 hours and max attempts reached, reject
        const hoursRemaining = Math.ceil((RESET_ATTEMPT_WINDOW - timeSinceLastReset) / (60 * 60 * 1000));
        console.log(`❌ RATE LIMIT EXCEEDED: Max attempts (${MAX_RESET_ATTEMPTS}) reached`);
        console.log('Hours remaining:', hoursRemaining);
        console.log('========== FORGOT PASSWORD END ==========\n');
        return res.status(429).json({
          error: `Too many password reset attempts. Please try again in ${hoursRemaining} hour(s)`,
          retryAfter: hoursRemaining,
        });
      }
    }

    // Increment reset attempts
    console.log('Incrementing reset attempts...');
    await User.incrementResetAttempts(email);
    console.log('✓ Reset attempts incremented');

    // Generate reset token
    console.log('Generating password reset token...');
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    console.log('Reset token generated (first 10 chars):', resetToken.substring(0, 10) + '...');
    console.log('Token expires at:', expiresAt.toISOString());

    // Store reset token
    console.log('Storing reset token in database...');
    await User.createPasswordResetToken(email, resetToken, expiresAt);
    console.log('✓ Reset token stored');

    // In a real app, send email here with reset link
    // const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    // await sendEmail(email, resetLink);

    console.log('✓ FORGOT PASSWORD REQUEST PROCESSED SUCCESSFULLY');
    console.log('Note: Email sending not implemented (remove resetToken from response in production)');
    console.log('========== FORGOT PASSWORD END ==========\n');

    res.status(200).json({
      message: 'Password reset token generated',
      // For testing only - remove in production
      resetToken,
      expiresAt,
    });
  } catch (error) {
    console.error('❌ FORGOT PASSWORD ERROR');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.log('========== FORGOT PASSWORD END ==========\n');
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const resetPassword = async (req, res) => {
  console.log('\n========== RESET PASSWORD START ==========');
  console.log(`[${new Date().toISOString()}] Reset password request`);
  console.log('Request body:', { token: req.body.token ? req.body.token.substring(0, 10) + '...' : 'missing', newPassword: '***' });

  try {
    const { token, newPassword } = req.body;

    // Validate input
    if (!token || !newPassword) {
      console.log('❌ VALIDATION FAILED: Missing token or newPassword');
      console.log('========== RESET PASSWORD END ==========\n');
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    console.log('✓ Input validation passed');

    // Find user by reset token
    console.log('Looking up user by reset token...');
    const user = await User.findByResetToken(token);
    if (!user) {
      console.log('❌ RESET PASSWORD FAILED: Invalid or expired reset token');
      console.log('========== RESET PASSWORD END ==========\n');
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    console.log('✓ Valid reset token found');
    console.log('User ID:', user.id);
    console.log('User email:', user.email);

    // Hash new password
    console.log('Hashing new password...');
    const newPasswordHash = await hash(newPassword, 10);
    console.log('✓ New password hashed');

    // Update password and clear reset token
    console.log('Updating password in database...');
    await User.updatePassword(user.id, newPasswordHash);
    console.log('✓ Password updated');

    console.log('Clearing reset token...');
    await User.clearResetToken(user.id);
    console.log('✓ Reset token cleared');

    console.log('✓ PASSWORD RESET SUCCESSFULLY');
    console.log('========== RESET PASSWORD END ==========\n');

    res.status(200).json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('❌ RESET PASSWORD ERROR');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.log('========== RESET PASSWORD END ==========\n');
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateProfile = async (req, res) => {
  console.log('\n========== UPDATE PROFILE START ==========');
  console.log(`[${new Date().toISOString()}] Update profile request`);
  console.log('Authenticated user:', { id: req.user.id, email: req.user.email });
  console.log('Request body:', { name: req.body.name, email: req.body.email });

  try {
    const { name, email } = req.body;

    // Validate input
    if (!name || !email) {
      console.log('❌ VALIDATION FAILED: Missing name or email');
      console.log('========== UPDATE PROFILE END ==========\n');
      return res.status(400).json({ error: 'Name and email are required' });
    }

    console.log('✓ Input validation passed');

    // Check if email is already taken by another user
    console.log('Checking if new email is unique...');
    if (email !== req.user.email) {
      console.log('Email change detected:', { old: req.user.email, new: email });
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        console.log('❌ UPDATE PROFILE FAILED: Email already in use');
        console.log('========== UPDATE PROFILE END ==========\n');
        return res.status(409).json({ error: 'Email already in use' });
      }
      console.log('✓ New email is available');
    } else {
      console.log('ℹ Email unchanged');
    }

    // Update profile
    console.log('Updating profile in database...');
    const updated = await User.updateProfile(req.user.id, name, email);
    if (!updated) {
      console.log('❌ UPDATE PROFILE FAILED: Database update failed');
      console.log('========== UPDATE PROFILE END ==========\n');
      return res.status(500).json({ error: 'Failed to update profile' });
    }

    console.log('✓ Profile updated in database');

    // Generate new token with updated email
    const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';
    const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';
    console.log('Generating new JWT token with updated email...');

    const newToken = jwt.sign({ id: req.user.id, email, metaBusinessAccountId: req.user.metaBusinessAccountId }, JWT_SECRET, {
      expiresIn: JWT_EXPIRY,
    });

    console.log('✓ New JWT token generated');
    console.log('New token (first 20 chars):', newToken.substring(0, 20) + '...');
    console.log('✓ PROFILE UPDATED SUCCESSFULLY');
    console.log('Response:', { id: req.user.id, name, email });
    console.log('========== UPDATE PROFILE END ==========\n');

    res.status(200).json({
      message: 'Profile updated successfully',
      token: newToken,
      user: { id: req.user.id, name, email },
    });
  } catch (error) {
    console.error('❌ UPDATE PROFILE ERROR');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.log('========== UPDATE PROFILE END ==========\n');
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteAccount = async (req, res) => {
  console.log('\n========== DELETE ACCOUNT START ==========');
  console.log(`[${new Date().toISOString()}] Delete account request`);
  console.log('Authenticated user:', { id: req.user.id, email: req.user.email });
  console.log('Request body:', { password: '***' });

  try {
    const { password } = req.body;

    // Validate input
    if (!password) {
      console.log('❌ VALIDATION FAILED: Password is required');
      console.log('========== DELETE ACCOUNT END ==========\n');
      return res.status(400).json({ error: 'Password is required to delete account' });
    }

    console.log('✓ Input validation passed');

    // Get user with password hash
    console.log('Fetching user with password hash...');
    const user = await User.findByEmail(req.user.email);
    if (!user) {
      console.log('❌ DELETE ACCOUNT FAILED: User not found');
      console.log('========== DELETE ACCOUNT END ==========\n');
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('✓ User found');
    console.log('User ID:', user.id);

    // Verify password
    console.log('Verifying password for account deletion...');
    const isPasswordValid = await compare(password, user.password);
    if (!isPasswordValid) {
      console.log('❌ DELETE ACCOUNT FAILED: Password verification failed');
      console.log('========== DELETE ACCOUNT END ==========\n');
      return res.status(401).json({ error: 'Password is incorrect' });
    }

    console.log('✓ Password verification successful');

    // Delete user
    console.log('Deleting account from database...');
    const deleted = await User.delete(req.user.id);
    if (!deleted) {
      console.log('❌ DELETE ACCOUNT FAILED: Database deletion failed');
      console.log('========== DELETE ACCOUNT END ==========\n');
      return res.status(500).json({ error: 'Failed to delete account' });
    }

    console.log('✓ Account deleted from database');
    console.log('✓ ACCOUNT DELETED SUCCESSFULLY');
    console.log('========== DELETE ACCOUNT END ==========\n');

    res.status(200).json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('❌ DELETE ACCOUNT ERROR');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.log('========== DELETE ACCOUNT END ==========\n');
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateMetaBusinessAccountId = async (req, res) => {
  console.log('\n========== UPDATE META BUSINESS ACCOUNT ID START ==========');
  console.log(`[${new Date().toISOString()}] Update Meta Business Account ID request`);
  console.log('Authenticated user:', { id: req.user.id, email: req.user.email });

  try {
    const { metaBusinessAccountId } = req.body;

    // Validate input
    if (!metaBusinessAccountId) {
      console.log('❌ VALIDATION FAILED: Meta Business Account ID is required');
      console.log('========== UPDATE META BUSINESS ACCOUNT ID END ==========\n');
      return res.status(400).json({ error: 'Meta Business Account ID is required' });
    }

    console.log('✓ Input validation passed');
    console.log('Meta Business Account ID:', metaBusinessAccountId);

    // Update Meta Business Account ID
    console.log('Updating Meta Business Account ID in database...');
    const updated = await User.updateMetaBusinessAccountId(req.user.id, metaBusinessAccountId);
    if (!updated) {
      console.log('❌ UPDATE FAILED: Database update failed');
      console.log('========== UPDATE META BUSINESS ACCOUNT ID END ==========\n');
      return res.status(500).json({ error: 'Failed to update Meta Business Account ID' });
    }

    console.log('✓ Meta Business Account ID updated in database');

    // Get updated user data
    console.log('Fetching updated user data...');
    const user = await User.findById(req.user.id);
    if (!user) {
      console.log('❌ FETCH FAILED: User not found');
      console.log('========== UPDATE META BUSINESS ACCOUNT ID END ==========\n');
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate new token with updated metaBusinessAccountId
    console.log('Generating new JWT token with updated Meta Business Account ID...');
    const newToken = jwt.sign(
      {
        id: req.user.id,
        email: req.user.email,
        metaBusinessAccountId: user.meta_business_account_id
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    console.log('✓ New JWT token generated');
    console.log('New token (first 20 chars):', newToken.substring(0, 20) + '...');
    console.log('✓ META BUSINESS ACCOUNT ID UPDATED SUCCESSFULLY');
    console.log('========== UPDATE META BUSINESS ACCOUNT ID END ==========\n');

    res.status(200).json({
      message: 'Meta Business Account ID updated successfully',
      token: newToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        metaBusinessAccountId: user.meta_business_account_id
      }
    });
  } catch (error) {
    console.error('❌ UPDATE META BUSINESS ACCOUNT ID ERROR');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Stack:', error.stack);
    console.log('========== UPDATE META BUSINESS ACCOUNT ID END ==========\n');
    res.status(500).json({ error: 'Internal server error' });
  }
};
