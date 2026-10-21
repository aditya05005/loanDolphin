import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import cookie from 'cookie';
import { Server as SocketServer } from 'socket.io';

import Branch from './models/Branch.js';
import Customer from './models/Customer.js';
import User from './models/User.js';
import Loan from './models/Loan.js';
import Manager from './models/Manager.js';
import Account from './models/Account.js';

const app = express();
app.use(express.json());
app.use(cookieParser());

// ---------- auth (JWT via httpOnly cookie) ----------

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not set. Add it to backend/.env before starting the server.');
}
const JWT_EXPIRES_IN = '1h';
const TOKEN_COOKIE = 'token';
const TOKEN_MAX_AGE_MS = 60 * 60 * 1000; // 1 hour, matches JWT_EXPIRES_IN

const isProduction = process.env.NODE_ENV === 'production';

const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  // 'none' is required for cross-site cookies (frontend and backend on
  // different hosts, i.e. CORS_ORIGIN is set in production) and requires
  // secure: true. 'lax' is right whenever the app is served same-origin
  // (the Render single-service deploy) and for local dev on localhost.
  sameSite: isProduction && process.env.CORS_ORIGIN ? 'none' : 'lax',
  maxAge: TOKEN_MAX_AGE_MS
};

// Behind Render's load balancer the real client IP arrives in X-Forwarded-For.
// Without this every user shares the proxy's IP (breaking the rate limiters).
if (isProduction) app.set('trust proxy', 1);

// cors() middleware already answers OPTIONS preflight requests on its own —
// a separate `app.options('*', cors())` is not needed and throws a PathError
// on Express 5 (wildcard string routes were removed). Do not re-add it.
// CORS_ORIGIN: comma-separated list of allowed origins. When unset, dev
// reflects any origin (needed for credentialed requests — '*' is not allowed
// with credentials: true) and production allows none, because the production
// build is served by this same server (same origin, no CORS needed).
const corsOrigin = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean)
  : !isProduction;

app.use(cors({
  origin: corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

const signToken = (user) =>
  jwt.sign({ userid: user.userid, type: user.type }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

const ROLES = ['branch_manager', 'senior_manager', 'administrator', 'customer'];
const LOAN_STATUSES = ['Pending', 'Approved', 'Rejected', 'Disbursed'];

// ---------- rate limiting ----------

// Baseline limiter for all API traffic.
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests. Please try again later.' }
});
app.use('/api', generalLimiter);

// Tighter limiter for endpoints worth throttling harder than general
// traffic: credential guessing and application spam.
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts. Please try again later.' }
});

// ---------- async wrapper ----------

// Express 4 does not catch rejected promises from async route handlers —
// an error thrown after this point would otherwise hang the request or
// crash the process instead of reaching the error-handling middleware.
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// ---------- strict helpers (no loose coercion, no silent fallbacks) ----------

const getRequestingUser = async (req) => {
  const token = req.cookies?.[TOKEN_COOKIE];
  if (!token) return null;

  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch {
    // Expired or tampered token — treat exactly like no token.
    return null;
  }

  // Re-fetch rather than trusting the payload's `type` verbatim, so a role
  // change (or account deletion) takes effect before the token's 1h expiry.
  return User.findOne({ userid: payload.userid });
};

const isPositiveFiniteNumber = (value) =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

const isNonNegativeFiniteNumber = (value) =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

// ---------- real-time (socket.io) ----------

// Each authenticated socket joins a private room named after its user id, so
// an event emitted to `user:<userid>` reaches only that user's open tabs.
const userRoom = (userid) => `user:${userid}`;

const server = http.createServer(app);
const io = new SocketServer(server, {
  cors: { origin: corsOrigin, credentials: true }
});

// Same auth as the REST API: the httpOnly JWT cookie sent with the handshake.
io.use(async (socket, next) => {
  try {
    const token = cookie.parse(socket.handshake.headers.cookie || '')[TOKEN_COOKIE];
    if (!token) return next(new Error('Authentication required.'));

    let payload;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch {
      return next(new Error('Authentication required.'));
    }

    const user = await User.findOne({ userid: payload.userid });
    if (!user) return next(new Error('Authentication required.'));

    socket.data.userid = user.userid;
    socket.data.tokenExp = payload.exp;
    next();
  } catch (err) {
    next(new Error('Authentication failed.'));
  }
});

io.on('connection', (socket) => {
  socket.join(userRoom(socket.data.userid));

  // The cookie expires after 1h; end the socket with it so a stale session
  // cannot keep receiving events.
  const msLeft = socket.data.tokenExp * 1000 - Date.now();
  const expiryTimer = setTimeout(() => socket.disconnect(true), Math.max(msLeft, 0));
  socket.on('disconnect', () => clearTimeout(expiryTimer));
});

// ---------- startup ----------

const seedDefaultUsers = async () => {
  const adminExists = await User.findOne({ userid: 'admin' });
  if (!adminExists) {
    // ADMIN_PASSWORD should always be set in production; the fallback is for local dev only.
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    await User.create({ userid: 'admin', password: adminPassword, type: 'administrator' });
    console.log(isProduction
      ? 'Default admin user seeded: admin (password from ADMIN_PASSWORD)'
      : 'Default admin user seeded: admin / admin123');
  }
};

const backfillLoanDefaults = async () => {
  // loan_date/status are Date/enum fields with schema defaults; this only
  // touches documents written before those defaults existed.
  await Loan.updateMany(
    { loan_date: { $exists: false } },
    { $set: { loan_date: new Date() } }
  );
  await Loan.updateMany(
    { status: { $exists: false } },
    { $set: { status: 'Pending' } }
  );
};

const backfillBranchLendingBudgets = async () => {
  await Branch.updateMany(
    { lendingBudget: { $exists: false }, assets: { $exists: true } },
    { $rename: { assets: 'lendingBudget' } }
  );
  await Branch.updateMany(
    { lendingBudget: { $exists: false } },
    { $set: { lendingBudget: 0 } }
  );
};

mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/loanDolphin')
  .then(async () => {
    console.log('MongoDB Connected');
    await seedDefaultUsers();
    await backfillLoanDefaults();
    await backfillBranchLendingBudgets();
  })
  .catch((err) => console.error(err));

app.get('/api/health', (req, res) => {
  const databaseConnected = mongoose.connection.readyState === 1;
  res.status(databaseConnected ? 200 : 503).json({
    status: databaseConnected ? 'ok' : 'starting',
    database: databaseConnected ? 'connected' : 'disconnected'
  });
});

// ============================== AUTH ==============================

app.post('/api/users/login', strictLimiter, asyncHandler(async (req, res) => {
  const { userid, password } = req.body || {};
  if (!isNonEmptyString(userid) || !isNonEmptyString(password)) {
    return res.status(400).json({ message: 'User ID and password are required.' });
  }

  const user = await User.findOne({ userid });
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ message: 'Invalid user ID or password.' });
  }

  const token = signToken(user);
  res.cookie(TOKEN_COOKIE, token, cookieOptions);
  return res.json({ userid: user.userid, type: user.type, message: 'Login successful' });
}));

app.post('/api/users/logout', (req, res) => {
  res.clearCookie(TOKEN_COOKIE, cookieOptions);
  res.json({ message: 'Logged out' });
});

app.post('/api/users/register', strictLimiter, asyncHandler(async (req, res) => {
  const { userid, password, type, c_name, c_street, c_city, aadharNumber, panCard } = req.body || {};

  if (!isNonEmptyString(userid) || !isNonEmptyString(password)) {
    return res.status(400).json({ message: 'User ID and password are required.' });
  }

  if (isNonEmptyString(type) && type.toLowerCase() === 'administrator') {
    console.warn(`Self-registration attempt as administrator by ${userid}`);
    return res.status(403).json({
      message: 'An attempt to self register as administrator is detected. This incident will be reported.'
    });
  }

  if (type !== undefined && !ROLES.includes(type)) {
    return res.status(400).json({ message: 'Invalid user type.' });
  }
  const requestedType = type || 'customer';
  if (requestedType !== 'customer') {
    // branch_manager / senior_manager accounts are provisioned by an admin
    // (see POST /api/branches), never self-registered.
    return res.status(403).json({ message: 'Only customer accounts may self-register.' });
  }

  const exists = await User.findOne({ userid });
  if (exists) {
    return res.status(409).json({ message: 'User already exists.' });
  }

  if (!isNonEmptyString(c_name) || !isNonEmptyString(c_street) || !isNonEmptyString(c_city) || !isNonEmptyString(aadharNumber) || !isNonEmptyString(panCard)) {
    return res.status(400).json({ message: 'Customer name, street, city, Aadhar number, and PAN card are required.' });
  }

  try {
    const user = await User.create({ userid, password, type: 'customer' });
    const c_id = crypto.randomUUID();
    const customer = await Customer.create({
      c_id,
      userid: user.userid,
      c_name: c_name.trim(),
      c_street: c_street.trim(),
      c_city: c_city.trim(),
      aadharNumber: aadharNumber.trim(),
      panCard: panCard.trim()
    });

    const token = signToken(user);
    res.cookie(TOKEN_COOKIE, token, cookieOptions);
    return res.status(201).json({
      userid: user.userid,
      type: user.type,
      c_id: customer.c_id,
      message: 'User created successfully'
    });
  } catch (error) {
    console.error('Error registering customer:', error);
    return res.status(500).json({ message: 'Failed to register customer.' });
  }
}));

// ============================== BRANCHES ==============================

app.get('/api/branches', asyncHandler(async (req, res) => {
  try {
    const branches = await Branch.find().sort({ b_name: 1 });
    res.json(branches);
  } catch (error) {
    console.error('Error fetching branches:', error);
    res.status(500).json({ message: 'Failed to fetch branches.' });
  }
}));

app.put('/api/branches/:b_name', asyncHandler(async (req, res) => {
  const requestingUser = await getRequestingUser(req);
  if (!requestingUser || requestingUser.type !== 'administrator') {
    return res.status(requestingUser ? 403 : 401).json({ message: 'Only administrators can update branch details.' });
  }

  const { b_city, lendingBudget } = req.body || {};
  if (!isNonEmptyString(b_city) || !isNonNegativeFiniteNumber(lendingBudget)) {
    return res.status(400).json({ message: 'A branch city and non-negative lending budget are required.' });
  }

  const branch = await Branch.findOneAndUpdate(
    { b_name: req.params.b_name },
    { $set: { b_city: b_city.trim(), lendingBudget } },
    { new: true, runValidators: true }
  );
  if (!branch) return res.status(404).json({ message: 'Branch not found.' });
  res.json(branch);
}));

app.post('/api/branches', asyncHandler(async (req, res) => {
  const { b_name, b_city, lendingBudget, managerUserid, managerPassword } = req.body || {};

  if (!isNonEmptyString(b_name) || !isNonEmptyString(b_city) ||
      !isNonEmptyString(managerUserid) || !isNonEmptyString(managerPassword)) {
    return res.status(400).json({ message: 'Branch details and manager credentials are required.' });
  }

  if (lendingBudget !== undefined && !isNonNegativeFiniteNumber(lendingBudget)) {
    return res.status(400).json({ message: 'Lending budget, if provided, must be a non-negative number.' });
  }

  const requestingUser = await getRequestingUser(req);
  if (!requestingUser || requestingUser.type !== 'administrator') {
    return res.status(403).json({ message: 'Access denied: Only administrators can create branches and manager accounts.' });
  }

  const cleanName = b_name.trim();
  const cleanCity = b_city.trim();
  const cleanUserId = managerUserid.trim();
  const cleanPassword = managerPassword.trim();

  const existingBranch = await Branch.findOne({ b_name: cleanName });
  if (existingBranch) {
    return res.status(409).json({ message: 'Branch with this name already exists.' });
  }

  const existingUser = await User.findOne({ userid: cleanUserId });
  if (existingUser) {
    return res.status(409).json({ message: 'Manager user ID already exists.' });
  }

  try {
    const newBranch = await Branch.create({
      b_name: cleanName,
      b_city: cleanCity,
      lendingBudget: isNonNegativeFiniteNumber(lendingBudget) ? lendingBudget : 0
    });
    const newUser = await User.create({ userid: cleanUserId, password: cleanPassword, type: 'branch_manager' });
    const newManager = await Manager.create({ userid: newUser.userid, b_name: newBranch.b_name });

    return res.status(201).json({
      message: 'Branch and manager created successfully',
      branch: newBranch,
      manager: newManager,
      user: { userid: newUser.userid, type: newUser.type }
    });
  } catch (error) {
    console.error('Error creating branch and manager:', error);
    return res.status(500).json({ message: 'Failed to create branch and manager.' });
  }
}));

// ============================== MANAGERS ==============================

app.get('/api/managers', asyncHandler(async (req, res) => {
  const requestingUser = await getRequestingUser(req);
  if (!requestingUser || !['administrator', 'senior_manager', 'branch_manager'].includes(requestingUser.type)) {
    return res.status(requestingUser ? 403 : 401).json({ message: 'Access denied.' });
  }
  try {
    const managers = await Manager.find().sort({ b_name: 1 });
    res.json(managers);
  } catch (error) {
    console.error('Error fetching managers:', error);
    res.status(500).json({ message: 'Failed to fetch managers.' });
  }
}));

// ============================== CUSTOMERS ==============================

app.get('/api/customers', asyncHandler(async (req, res) => {
  const requestingUser = await getRequestingUser(req);
  if (!requestingUser || !['administrator', 'senior_manager', 'branch_manager'].includes(requestingUser.type)) {
    return res.status(requestingUser ? 403 : 401).json({ message: 'Access denied.' });
  }
  try {
    const customers = await Customer.find().sort({ c_name: 1 });
    res.json(customers);
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ message: 'Failed to fetch customers.' });
  }
}));

// Admin-side creation of a Customer record for an EXISTING user of type
// 'customer'. Customer.userid is required+unique, so unlike the old code
// this enforces the FK instead of silently failing validation.
app.post('/api/customers', asyncHandler(async (req, res) => {
  const { userid, c_name, c_street, c_city, aadharNumber, panCard } = req.body || {};

  if (!isNonEmptyString(userid) || !isNonEmptyString(c_name) ||
      !isNonEmptyString(c_street) || !isNonEmptyString(c_city) || !isNonEmptyString(aadharNumber) || !isNonEmptyString(panCard)) {
    return res.status(400).json({ message: 'userid, name, street, city, Aadhar number, and PAN card are required.' });
  }

  const requestingUser = await getRequestingUser(req);
  if (!requestingUser || !['administrator', 'senior_manager', 'branch_manager'].includes(requestingUser.type)) {
    return res.status(requestingUser ? 403 : 401).json({ message: 'Access denied.' });
  }

  const linkedUser = await User.findOne({ userid: userid.trim() });
  if (!linkedUser || linkedUser.type !== 'customer') {
    return res.status(400).json({ message: 'userid must belong to an existing customer-type user.' });
  }

  const existingCustomer = await Customer.findOne({ userid: linkedUser.userid });
  if (existingCustomer) {
    return res.status(409).json({ message: 'A customer record already exists for this user.' });
  }

  try {
    const c_id = crypto.randomUUID();
    const customer = await Customer.create({
      c_id,
      userid: linkedUser.userid,
      c_name: c_name.trim(),
      c_street: c_street.trim(),
      c_city: c_city.trim(),
      aadharNumber: aadharNumber.trim(),
      panCard: panCard.trim()
    });
    res.status(201).json(customer);
  } catch (error) {
    console.error('Error creating customer:', error);
    res.status(500).json({ message: 'Failed to create customer.' });
  }
}));

// ============================== LOANS ==============================

app.get('/api/loans', asyncHandler(async (req, res) => {
  const requestingUser = await getRequestingUser(req);
  if (!requestingUser || !['administrator', 'senior_manager', 'branch_manager'].includes(requestingUser.type)) {
    return res.status(requestingUser ? 403 : 401).json({ message: 'Access denied.' });
  }
  try {
    const filter = {};
    if (requestingUser.type === 'branch_manager') {
      const manager = await Manager.findOne({ userid: requestingUser.userid });
      if (!manager) return res.status(403).json({ message: 'Access denied.' });
      filter.b_name = manager.b_name;
    }
    const loans = await Loan.find(filter).sort({ l_no: 1 });
    res.json(loans);
  } catch (error) {
    console.error('Error fetching loans:', error);
    res.status(500).json({ message: 'Failed to fetch loans.' });
  }
}));

// Staff-side loan creation (admin / senior_manager / branch_manager).
app.post('/api/loans', asyncHandler(async (req, res) => {
  const { amt, b_name, borrowers, c_id } = req.body || {};

  if (!isPositiveFiniteNumber(amt) || !isNonEmptyString(b_name)) {
    return res.status(400).json({ message: 'A positive amount and a branch are required.' });
  }
  if (!isNonEmptyString(c_id)) {
    return res.status(400).json({ message: 'A customer c_id is required.' });
  }

  const requestingUser = await getRequestingUser(req);
  if (!requestingUser || !['administrator', 'senior_manager', 'branch_manager'].includes(requestingUser.type)) {
    return res.status(403).json({ message: 'Access denied: Insufficient permissions.' });
  }

  const branch = await Branch.findOne({ b_name });
  if (!branch) {
    return res.status(400).json({ message: 'b_name does not match an existing branch.' });
  }

  const customer = isNonEmptyString(c_id) ? await Customer.findOne({ c_id }) : null;
  if (c_id && !customer) {
    return res.status(400).json({ message: 'c_id does not match an existing customer.' });
  }

  if (requestingUser.type === 'branch_manager') {
    const manager = await Manager.findOne({ userid: requestingUser.userid });
    if (!manager || manager.b_name !== branch.b_name) {
      return res.status(403).json({ message: 'Access denied: Branch manager can only create loans for their own branch.' });
    }
  }

  try {
    const loan = await Loan.create({
      l_no: crypto.randomUUID(),
      amt,
      b_name: branch.b_name,
      c_id: customer?.c_id,
      customerUserId: customer?.userid,
      borrowers: customer ? [customer.c_id] : (Array.isArray(borrowers) ? borrowers.map(String) : []),
      loan_date: new Date(),
      status: 'Pending'
    });
    res.status(201).json(loan);
  } catch (error) {
    console.error('Error creating loan:', error);
    res.status(500).json({ message: 'Failed to create loan.' });
  }
}));

// Self-service loan application by a logged-in customer.
app.post('/api/customer/loans', strictLimiter, asyncHandler(async (req, res) => {
  const { amt, b_name } = req.body || {};

  if (!isPositiveFiniteNumber(amt) || !isNonEmptyString(b_name)) {
    return res.status(400).json({ message: 'A positive amount and branch are required.' });
  }

  const requestingUser = await getRequestingUser(req);
  if (!requestingUser || requestingUser.type !== 'customer') {
    return res.status(403).json({ message: 'Access denied: Customer login required.' });
  }

  const branch = await Branch.findOne({ b_name });
  if (!branch) {
    return res.status(400).json({ message: 'b_name does not match an existing branch.' });
  }

  const customer = await Customer.findOne({ userid: requestingUser.userid });
  if (!customer) {
    return res.status(400).json({ message: 'No customer record is linked to this user.' });
  }

  const pendingLoan = await Loan.exists({ customerUserId: requestingUser.userid, status: 'Pending' });
  if (pendingLoan) {
    return res.status(409).json({ message: 'You already have a loan application awaiting a decision.' });
  }

  try {
    // Ensure every applicant has an account tied to the branch they selected.
    // Older customer records may not have had an account created at registration.
    await Account.findOneAndUpdate(
      { userid: requestingUser.userid, b_name: branch.b_name },
      { $setOnInsert: { ac_no: crypto.randomUUID(), balance: 0 } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const loan = await Loan.create({
      l_no: crypto.randomUUID(),
      amt,
      b_name: branch.b_name,
      customerUserId: requestingUser.userid,
      c_id: customer.c_id,
      borrowers: [customer.c_id],
      loan_date: new Date(),
      status: 'Pending'
    });
    res.status(201).json(loan);
  } catch (error) {
    console.error('Error creating customer loan:', error);
    res.status(500).json({ message: 'Failed to create loan.' });
  }
}));

app.get('/api/customer/loans', asyncHandler(async (req, res) => {
  const requestingUser = await getRequestingUser(req);
  if (!requestingUser) return res.status(401).json({ message: 'Authentication required.' });
  if (requestingUser.type !== 'customer') return res.status(403).json({ message: 'Customer login required.' });
  const customer = await Customer.findOne({ userid: requestingUser.userid });
  const ownership = [{ customerUserId: requestingUser.userid }];
  if (customer) ownership.push({ c_id: customer.c_id });
  const loans = await Loan.find({ $or: ownership }).sort({ loan_date: -1 });
  res.json(loans);
}));

app.put('/api/loans/:id/status', asyncHandler(async (req, res) => {
  const { status } = req.body || {};
  if (!LOAN_STATUSES.includes(status)) {
    return res.status(400).json({ message: `Invalid status. Must be one of: ${LOAN_STATUSES.join(', ')}.` });
  }

  const requestingUser = await getRequestingUser(req);
  if (!requestingUser || !['senior_manager', 'administrator', 'branch_manager'].includes(requestingUser.type)) {
    return res.status(403).json({ message: 'Access denied: Insufficient permissions.' });
  }

  if (status === 'Disbursed' && requestingUser.type === 'administrator') {
    return res.status(403).json({ message: 'Access denied: Administrators cannot disburse loans.' });
  }

  // l_no is always a UUID string now, never a Mongo ObjectId, so look it up
  // by l_no only — no more guessing between _id and l_no.
  const loan = await Loan.findOne({ l_no: req.params.id });
  if (!loan) {
    return res.status(404).json({ message: 'Loan not found.' });
  }

  if (requestingUser.type === 'branch_manager') {
    const manager = await Manager.findOne({ userid: requestingUser.userid });
    if (!manager || manager.b_name !== loan.b_name) {
      return res.status(403).json({ message: 'Access denied: Branch manager can only modify loans of their own branch.' });
    }
  }

  const allowedTransitions = {
    Pending: ['Approved', 'Rejected'],
    Approved: ['Rejected', 'Disbursed'],
    Rejected: [],
    Disbursed: []
  };
  if (loan.status !== status && !allowedTransitions[loan.status]?.includes(status)) {
    return res.status(409).json({ message: `Cannot change loan status from ${loan.status} to ${status}.` });
  }

  const previousStatus = loan.status;
  try {
    if (status === 'Disbursed' && loan.status !== 'Disbursed') {
      // Claim this transition atomically so two staff requests cannot credit
      // the same loan twice.
      const claimedLoan = await Loan.findOneAndUpdate(
        { _id: loan._id, status: 'Approved' },
        { $set: { status: 'Disbursed' } },
        { new: true }
      );
      if (!claimedLoan) {
        return res.status(409).json({ message: 'Loan status changed before disbursement. Refresh and try again.' });
      }

      const budgetBranch = await Branch.findOneAndUpdate(
        { b_name: loan.b_name, lendingBudget: { $gte: loan.amt } },
        { $inc: { lendingBudget: -loan.amt } },
        { new: true }
      );
      if (!budgetBranch) {
        await Loan.updateOne({ _id: loan._id, status: 'Disbursed' }, { $set: { status: 'Approved' } });
        return res.status(409).json({ message: 'The branch has insufficient available lending budget for this loan.' });
      }

      // Older loans may predate automatic account setup, so ensure the
      // customer has a branch account before crediting the disbursement.
      const customerUserId = loan.customerUserId;
      if (!customerUserId) {
        await Branch.updateOne({ b_name: loan.b_name }, { $inc: { lendingBudget: loan.amt } });
        await Loan.updateOne({ _id: loan._id, status: 'Disbursed' }, { $set: { status: 'Approved' } });
        return res.status(400).json({ message: 'Cannot disburse: Loan is not linked to a customer login.' });
      }
      try {
        await Account.findOneAndUpdate(
          { userid: customerUserId, b_name: loan.b_name },
          { $setOnInsert: { ac_no: crypto.randomUUID() }, $inc: { balance: loan.amt } },
          { upsert: true, new: true }
        );
      } catch (accountError) {
        await Branch.updateOne({ b_name: loan.b_name }, { $inc: { lendingBudget: loan.amt } });
        await Loan.updateOne({ _id: loan._id, status: 'Disbursed' }, { $set: { status: 'Approved' } });
        throw accountError;
      }
      loan.status = 'Disbursed';
    } else {
      loan.status = status;
      await loan.save();
    }
    
    // Tell the borrower right away. A failed push must never fail the request.
    if (loan.customerUserId && previousStatus !== status) {
      try {
        io.to(userRoom(loan.customerUserId)).emit('loan_status_updated', {
          l_no: loan.l_no,
          amt: loan.amt,
          b_name: loan.b_name,
          previousStatus,
          status: loan.status,
          loan: loan.toObject()
        });
      } catch (emitError) {
        console.error('Failed to emit loan_status_updated:', emitError);
      }
    }

    res.json(loan);
  } catch (error) {
    console.error('Error updating loan status:', error);
    res.status(500).json({ message: 'Failed to update loan status.' });
  }
}));

// ============================== ACCOUNTS ==============================

// Staff-side account opening for an existing customer at an existing branch.
app.post('/api/accounts', asyncHandler(async (req, res) => {
  const { userid, b_name, initialBalance } = req.body || {};

  if (!isNonEmptyString(userid) || !isNonEmptyString(b_name)) {
    return res.status(400).json({ message: 'userid and b_name are required.' });
  }
  if (initialBalance !== undefined && !isNonNegativeFiniteNumber(initialBalance)) {
    return res.status(400).json({ message: 'initialBalance, if provided, must be a non-negative number.' });
  }

  const requestingUser = await getRequestingUser(req);
  if (!requestingUser || !['administrator', 'senior_manager', 'branch_manager'].includes(requestingUser.type)) {
    return res.status(403).json({ message: 'Access denied: Insufficient permissions.' });
  }

  const branch = await Branch.findOne({ b_name });
  if (!branch) {
    return res.status(400).json({ message: 'b_name does not match an existing branch.' });
  }

  if (requestingUser.type === 'branch_manager') {
    const manager = await Manager.findOne({ userid: requestingUser.userid });
    if (!manager || manager.b_name !== branch.b_name) {
      return res.status(403).json({ message: 'Access denied: Branch manager can only open accounts at their own branch.' });
    }
  }

  const accountHolder = await User.findOne({ userid });
  if (!accountHolder || accountHolder.type !== 'customer') {
    return res.status(400).json({ message: 'userid must belong to an existing customer-type user.' });
  }

  try {
    const account = await Account.create({
      ac_no: crypto.randomUUID(),
      balance: isNonNegativeFiniteNumber(initialBalance) ? initialBalance : 0,
      userid: accountHolder.userid,
      b_name: branch.b_name
    });
    res.status(201).json(account);
  } catch (error) {
    console.error('Error creating account:', error);
    res.status(500).json({ message: 'Failed to create account.' });
  }
}));

app.get('/api/accounts', asyncHandler(async (req, res) => {
  const requestingUser = await getRequestingUser(req);
  if (!requestingUser || !['administrator', 'senior_manager', 'branch_manager'].includes(requestingUser.type)) {
    return res.status(requestingUser ? 403 : 401).json({ message: 'Access denied.' });
  }
  try {
    const filter = {};
    if (requestingUser.type === 'branch_manager') {
      const manager = await Manager.findOne({ userid: requestingUser.userid });
      if (!manager) return res.status(403).json({ message: 'Access denied.' });
      filter.b_name = manager.b_name;
    }
    const accounts = await Account.find(filter).sort({ ac_no: 1 });
    res.json(accounts);
  } catch (error) {
    console.error('Error fetching accounts:', error);
    res.status(500).json({ message: 'Failed to fetch accounts.' });
  }
}));

// Accounts belonging to one user — the account holder themselves, or staff.
app.get('/api/accounts/user/:userid', asyncHandler(async (req, res) => {
  const requestingUser = await getRequestingUser(req);
  if (!requestingUser) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  const isSelf = requestingUser.userid === req.params.userid;
  const isStaff = ['administrator', 'senior_manager', 'branch_manager'].includes(requestingUser.type);
  if (!isSelf && !isStaff) {
    return res.status(403).json({ message: 'Access denied.' });
  }

  try {
    const filter = { userid: req.params.userid };
    if (requestingUser.type === 'branch_manager') {
      const manager = await Manager.findOne({ userid: requestingUser.userid });
      if (!manager) return res.status(403).json({ message: 'Access denied.' });
      filter.b_name = manager.b_name;
    }
    const accounts = await Account.find(filter).sort({ ac_no: 1 });
    res.json(accounts);
  } catch (error) {
    console.error('Error fetching accounts for user:', error);
    res.status(500).json({ message: 'Failed to fetch accounts.' });
  }
}));

app.get('/api/accounts/:ac_no/balance', asyncHandler(async (req, res) => {
  const requestingUser = await getRequestingUser(req);
  if (!requestingUser) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  const account = await Account.findOne({ ac_no: req.params.ac_no });
  if (!account) {
    return res.status(404).json({ message: 'Account not found.' });
  }

  const isSelf = requestingUser.userid === account.userid;
  const isStaff = ['administrator', 'senior_manager', 'branch_manager'].includes(requestingUser.type);
  if (!isSelf && !isStaff) {
    return res.status(403).json({ message: 'Access denied.' });
  }
  if (requestingUser.type === 'branch_manager') {
    const manager = await Manager.findOne({ userid: requestingUser.userid });
    if (!manager || manager.b_name !== account.b_name) {
      return res.status(403).json({ message: 'Access denied.' });
    }
  }

  res.json({ ac_no: account.ac_no, balance: account.balance });
}));

app.post('/api/accounts/:ac_no/deposit', asyncHandler(async (req, res) => {
  const { amount } = req.body || {};
  if (!isPositiveFiniteNumber(amount)) {
    return res.status(400).json({ message: 'amount must be a positive number.' });
  }

  const requestingUser = await getRequestingUser(req);
  if (!requestingUser || !['administrator', 'senior_manager', 'branch_manager'].includes(requestingUser.type)) {
    return res.status(403).json({ message: 'Access denied: Deposits are recorded by branch staff.' });
  }

  const account = await Account.findOne({ ac_no: req.params.ac_no });
  if (!account) {
    return res.status(404).json({ message: 'Account not found.' });
  }

  if (requestingUser.type === 'branch_manager') {
    const manager = await Manager.findOne({ userid: requestingUser.userid });
    if (!manager || manager.b_name !== account.b_name) {
      return res.status(403).json({ message: 'Access denied: Branch manager can only operate on accounts at their own branch.' });
    }
  }

  // Atomic increment — avoids a read-modify-write race under concurrent requests.
  const updated = await Account.findOneAndUpdate(
    { ac_no: req.params.ac_no },
    { $inc: { balance: amount } },
    { new: true }
  );
  res.json(updated);
}));

app.post('/api/accounts/:ac_no/withdraw', asyncHandler(async (req, res) => {
  const { amount } = req.body || {};
  if (!isPositiveFiniteNumber(amount)) {
    return res.status(400).json({ message: 'amount must be a positive number.' });
  }

  const requestingUser = await getRequestingUser(req);
  if (!requestingUser || !['administrator', 'senior_manager', 'branch_manager'].includes(requestingUser.type)) {
    return res.status(403).json({ message: 'Access denied: Withdrawals are recorded by branch staff.' });
  }

  const account = await Account.findOne({ ac_no: req.params.ac_no });
  if (!account) {
    return res.status(404).json({ message: 'Account not found.' });
  }

  if (requestingUser.type === 'branch_manager') {
    const manager = await Manager.findOne({ userid: requestingUser.userid });
    if (!manager || manager.b_name !== account.b_name) {
      return res.status(403).json({ message: 'Access denied: Branch manager can only operate on accounts at their own branch.' });
    }
  }

  // Atomic conditional decrement: the balance>=amount check happens in the
  // same query as the update, so two concurrent withdrawals can't both pass
  // a balance check taken separately and overdraw the account.
  const updated = await Account.findOneAndUpdate(
    { ac_no: req.params.ac_no, balance: { $gte: amount } },
    { $inc: { balance: -amount } },
    { new: true }
  );

  if (!updated) {
    return res.status(400).json({ message: 'Insufficient balance.' });
  }
  res.json(updated);
}));

// ============================== ERROR HANDLING ==============================

// Serve the built React app (frontend/dist) from this same server when it
// exists — this is how the single Render web service ships both halves.
const frontendDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../frontend/dist');
if (fs.existsSync(path.join(frontendDist, 'index.html'))) {
  app.use(express.static(frontendDist));
  // SPA fallback for client-side routes (never for API or socket.io paths).
  app.get(/^\/(?!api(\/|$)|socket\.io(\/|$)).*/, (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// No route matched — must come after all routes, before the error handler.
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found.' });
});

// Centralized error handler. Every asyncHandler-wrapped route (and any
// synchronous throw) lands here instead of hanging the request or leaking
// a raw stack trace to the client.
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);

  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: err.message });
  }
  if (err.code === 11000) {
    return res.status(409).json({ message: 'A record with these details already exists.' });
  }

  res.status(500).json({ message: 'Something went wrong. Please try again later.' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
