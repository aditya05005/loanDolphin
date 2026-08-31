import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';

import Branch from './models/Branch.js';
import Customer from './models/Customer.js';
import User from './models/User.js';
import Manager from './models/Manager.js';
import Loan from './models/Loan.js';

const app = express();
app.use(express.json());

// Allow all origins for development - explicitly handle preflight OPTIONS requests.
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Handle preflight requests explicitly.
app.options('*', cors());

mongoose.connect('mongodb://127.0.0.1:27017/loanDolphin')
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error(err));

// Health check endpoint to verify backend is running.
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Login endpoint that verifies user credentials against the database.
app.post('/api/users/login', async (req, res) => {
  const { userid, password } = req.body || {};

  if (!userid || !password) {
    return res.status(400).json({ message: 'User ID and password are required.' });
  }

  const user = await User.findOne({ userid, password });

  if (!user) {
    return res.status(401).json({ message: 'Invalid user ID or password.' });
  }

  return res.json({
    userid: user.userid,
    type: user.type,
    message: 'Login successful'
  });
});

// Registration endpoint to create a new user account with the specified type.
app.post('/api/users/register', async (req, res) => {
  const { userid, password, type } = req.body || {};

  if (!userid || !password || !type) {
    return res.status(400).json({ message: 'User ID, password, and type are required.' });
  }

  const exists = await User.findOne({ userid });
  if (exists) {
    return res.status(409).json({ message: 'User already exists.' });
  }

  const user = await User.create({ userid, password, type });

  return res.status(201).json({
    userid: user.userid,
    type: user.type,
    message: 'User created successfully'
  });
});

// Fetch all branches from the database, sorted by name.
app.get('/api/branches', async (req, res) => {
  const branches = await Branch.find().sort({ b_name: 1 });
  res.json(branches);
});

// Create a new branch with associated manager user credentials after verifying admin permission.
app.post('/api/branches', async (req, res) => {
  const { b_name, b_city, assets, managerUserid, managerPassword } = req.body || {};

  if (!b_name || !b_city || !managerUserid || !managerPassword) {
    return res.status(400).json({ message: 'Branch details and manager credentials are required.' });
  }

  const adminUser = await User.findOne({ userid: req.body.currentUserId, type: 'administrator' });
  if (!adminUser) {
    return res.status(403).json({ message: 'Only administrators can create branches.' });
  }

  const existingBranch = await Branch.findOne({ b_name });
  if (existingBranch) {
    return res.status(409).json({ message: 'Branch with this name already exists.' });
  }

  const existingUser = await User.findOne({ userid: managerUserid });
  if (existingUser) {
    return res.status(409).json({ message: 'Manager user ID already exists.' });
  }

  const newBranch = await Branch.create({
    b_name,
    b_city,
    assets: Number(assets) || 0
  });

  const newUser = await User.create({
    userid: managerUserid,
    password: managerPassword,
    type: 'branch_manager'
  });

  await Manager.create({
    userid: newUser.userid,
    b_name: newBranch.b_name
  });

  res.status(201).json({
    message: 'Branch and manager created successfully',
    branch: newBranch
  });
});

// Fetch all customers from the database, sorted by name.
app.get('/api/customers', async (req, res) => {
  const customers = await Customer.find().sort({ c_name: 1 });
  res.json(customers);
});

// Create a new customer record with name, street, and city information.
app.post('/api/customers', async (req, res) => {
  const { c_name, c_street, c_city } = req.body || {};

  if (!c_name || !c_street || !c_city) {
    return res.status(400).json({ message: 'Customer name, street, and city are required.' });
  }

  const customer = await Customer.create({ c_name, c_street, c_city });
  res.status(201).json(customer);
});

// Fetch all loans from the database, sorted by loan number.
app.get('/api/loans', async (req, res) => {
  const loans = await Loan.find().sort({ l_no: 1 });
  res.json(loans);
});

// Create a new loan record linked to a branch and borrowers.
app.post('/api/loans', async (req, res) => {
  const { l_no, amt, b_name, borrowers } = req.body || {};

  if (!l_no || !amt || !b_name) {
    return res.status(400).json({ message: 'Loan number, amount, and branch are required.' });
  }

  const loan = await Loan.create({
    l_no,
    amt: Number(amt),
    b_name,
    borrowers: borrowers || []
  });

  res.status(201).json(loan);
});

app.listen(5000, () => console.log('Backend running on port 5000'));
