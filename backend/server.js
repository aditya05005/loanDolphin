import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import crypto from 'crypto';

import Branch from './models/Branch.js';
import Customer from './models/Customer.js';
import User from './models/User.js';
import Loan from './models/Loan.js';
import Manager from './models/Manager.js';
import Account from './models/Account.js';

const app = express();
app.use(express.json());

// cors() middleware already answers OPTIONS preflight requests on its own —
// a separate `app.options('*', cors())` is not needed and throws a PathError
// on Express 5 (wildcard string routes were removed). Do not re-add it.
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id']
}));

const ROLES = ['branch_manager', 'senior_manager', 'administrator', 'customer'];
const LOAN_STATUSES = ['Pending', 'Approved', 'Rejected'];

// ---------- strict helpers (no loose coercion, no silent fallbacks) ----------

const getRequestingUser = async (req) => {
  const userid = req.body?.currentUserId || req.headers['x-user-id'];
  if (!userid || typeof userid !== 'string') return null;
  return User.findOne({ userid });
};

const isPositiveFiniteNumber = (value) =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

const isNonNegativeFiniteNumber = (value) =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

// ---------- startup ----------

const seedDefaultUsers = async () => {
  const adminExists = await User.findOne({ userid: 'admin' });
  if (!adminExists) {
    await User.create({ userid: 'admin', password: 'admin123', type: 'administrator' });
    console.log('Default admin user seeded: admin / admin123');
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

mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/loanDolphin')
  .then(async () => {
    console.log('MongoDB Connected');
    await seedDefaultUsers();
    await backfillLoanDefaults();
  })
  .catch((err) => console.error(err));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ============================== AUTH ==============================

app.post('/api/users/login', async (req, res) => {
  const { userid, password } = req.body || {};
  if (!isNonEmptyString(userid) || !isNonEmptyString(password)) {
    return res.status(400).json({ message: 'User ID and password are required.' });
  }

  const user = await User.findOne({ userid });
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ message: 'Invalid user ID or password.' });
  }

  return res.json({ userid: user.userid, type: user.type, message: 'Login successful' });
});

app.post('/api/users/register', async (req, res) => {
  const { userid, password, type, c_name, c_street, c_city } = req.body || {};

  if (!isNonEmptyString(userid) || !isNonEmptyString(password)) {
    return res.status(400).json({ message: 'User ID and password are required.' });
  }

  if (isNonEmptyString(type) && type.toLowerCase() === 'administrator') {
    console.warn(`Self-registration attempt as administrator by ${userid}`);
    return res.status(403).json({
      message: 'An attempt to self register as administrator is detected. This incident will be reported.'
    });
  }

  const requestedType = ROLES.includes(type) ? type : 'customer';
  if (requestedType !== 'customer') {
    // branch_manager / senior_manager accounts are provisioned by an admin
    // (see POST /api/branches), never self-registered.
    return res.status(403).json({ message: 'Only customer accounts may self-register.' });
  }

  const exists = await User.findOne({ userid });
  if (exists) {
    return res.status(409).json({ message: 'User already exists.' });
  }

  if (!isNonEmptyString(c_name) || !isNonEmptyString(c_street) || !isNonEmptyString(c_city)) {
    return res.status(400).json({ message: 'Customer name, street, and city are required.' });
  }

  try {
    const user = await User.create({ userid, password, type: 'customer' });
    const c_id = crypto.randomUUID();
    const customer = await Customer.create({
      c_id,
      userid: user.userid,
      c_name: c_name.trim(),
      c_street: c_street.trim(),
      c_city: c_city.trim()
    });

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
});

// ============================== BRANCHES ==============================

app.get('/api/branches', async (req, res) => {
  try {
    const branches = await Branch.find().sort({ b_name: 1 });
    res.json(branches);
  } catch (error) {
    console.error('Error fetching branches:', error);
    res.status(500).json({ message: 'Failed to fetch branches.' });
  }
});

app.post('/api/branches', async (req, res) => {
  const { b_name, b_city, assets, managerUserid, managerPassword } = req.body || {};

  if (!isNonEmptyString(b_name) || !isNonEmptyString(b_city) ||
      !isNonEmptyString(managerUserid) || !isNonEmptyString(managerPassword)) {
    return res.status(400).json({ message: 'Branch details and manager credentials are required.' });
  }

  if (assets !== undefined && !isNonNegativeFiniteNumber(assets)) {
    return res.status(400).json({ message: 'Assets, if provided, must be a non-negative number.' });
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
      assets: isNonNegativeFiniteNumber(assets) ? assets : 0
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
});

// ============================== MANAGERS ==============================

app.get('/api/managers', async (req, res) => {
  try {
    const managers = await Manager.find().sort({ b_name: 1 });
    res.json(managers);
  } catch (error) {
    console.error('Error fetching managers:', error);
    res.status(500).json({ message: 'Failed to fetch managers.' });
  }
});

// ============================== CUSTOMERS ==============================

app.get('/api/customers', async (req, res) => {
  try {
    const customers = await Customer.find().sort({ c_name: 1 });
    res.json(customers);
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ message: 'Failed to fetch customers.' });
  }
});

// Admin-side creation of a Customer record for an EXISTING user of type
// 'customer'. Customer.userid is required+unique, so unlike the old code
// this enforces the FK instead of silently failing validation.
app.post('/api/customers', async (req, res) => {
  const { userid, c_name, c_street, c_city } = req.body || {};

  if (!isNonEmptyString(userid) || !isNonEmptyString(c_name) ||
      !isNonEmptyString(c_street) || !isNonEmptyString(c_city)) {
    return res.status(400).json({ message: 'userid, name, street, and city are required.' });
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
      c_city: c_city.trim()
    });
    res.status(201).json(customer);
  } catch (error) {
    console.error('Error creating customer:', error);
    res.status(500).json({ message: 'Failed to create customer.' });
  }
});

// ============================== LOANS ==============================

app.get('/api/loans', async (req, res) => {
  try {
    const loans = await Loan.find().sort({ l_no: 1 });
    res.json(loans);
  } catch (error) {
    console.error('Error fetching loans:', error);
    res.status(500).json({ message: 'Failed to fetch loans.' });
  }
});

// Staff-side loan creation (admin / senior_manager / branch_manager).
app.post('/api/loans', async (req, res) => {
  const { amt, b_name, borrowers, c_id } = req.body || {};

  if (!isPositiveFiniteNumber(amt) || !isNonEmptyString(b_name)) {
    return res.status(400).json({ message: 'A positive amount and a branch are required.' });
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
      return res.status(403).json({ message: 'Access denied: Branch manager can only create loans for their own branch.' });
    }
  }

  try {
    const loan = await Loan.create({
      l_no: crypto.randomUUID(),
      amt,
      b_name: branch.b_name,
      c_id: isNonEmptyString(c_id) ? c_id : undefined,
      borrowers: Array.isArray(borrowers) ? borrowers.map(String) : [],
      loan_date: new Date(),
      status: 'Pending'
    });
    res.status(201).json(loan);
  } catch (error) {
    console.error('Error creating loan:', error);
    res.status(500).json({ message: 'Failed to create loan.' });
  }
});

// Self-service loan application by a logged-in customer.
app.post('/api/customer/loans', async (req, res) => {
  const { amt, b_name, aadharNumber } = req.body || {};

  if (!isPositiveFiniteNumber(amt) || !isNonEmptyString(b_name) || !isNonEmptyString(aadharNumber)) {
    return res.status(400).json({ message: 'Amount, branch, and Aadhar number are required.' });
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

  try {
    const loan = await Loan.create({
      l_no: crypto.randomUUID(),
      amt,
      b_name: branch.b_name,
      aadharNumber: aadharNumber.trim(),
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
});

app.put('/api/loans/:id/status', async (req, res) => {
  const { status } = req.body || {};
  if (!LOAN_STATUSES.includes(status)) {
    return res.status(400).json({ message: `Invalid status. Must be one of: ${LOAN_STATUSES.join(', ')}.` });
  }

  const requestingUser = await getRequestingUser(req);
  if (!requestingUser || !['senior_manager', 'administrator', 'branch_manager'].includes(requestingUser.type)) {
    return res.status(403).json({ message: 'Access denied: Insufficient permissions.' });
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

  try {
    loan.status = status;
    await loan.save();
    res.json(loan);
  } catch (error) {
    console.error('Error updating loan status:', error);
    res.status(500).json({ message: 'Failed to update loan status.' });
  }
});

// ============================== ACCOUNTS ==============================

// Staff-side account opening for an existing customer at an existing branch.
app.post('/api/accounts', async (req, res) => {
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
});

app.get('/api/accounts', async (req, res) => {
  try {
    const accounts = await Account.find().sort({ ac_no: 1 });
    res.json(accounts);
  } catch (error) {
    console.error('Error fetching accounts:', error);
    res.status(500).json({ message: 'Failed to fetch accounts.' });
  }
});

// Accounts belonging to one user — the account holder themselves, or staff.
app.get('/api/accounts/user/:userid', async (req, res) => {
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
    const accounts = await Account.find({ userid: req.params.userid }).sort({ ac_no: 1 });
    res.json(accounts);
  } catch (error) {
    console.error('Error fetching accounts for user:', error);
    res.status(500).json({ message: 'Failed to fetch accounts.' });
  }
});

app.get('/api/accounts/:ac_no/balance', async (req, res) => {
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

  res.json({ ac_no: account.ac_no, balance: account.balance });
});

app.post('/api/accounts/:ac_no/deposit', async (req, res) => {
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
});

app.post('/api/accounts/:ac_no/withdraw', async (req, res) => {
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
});

app.listen(5000, () => console.log('Backend running on port 5000'));
