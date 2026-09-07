import 'dotenv/config';
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
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id']
}));

// Handle preflight requests explicitly.
app.options('*', cors());

const seedDefaultUsers = async () => {
  try {
    const adminExists = await User.findOne({ userid: 'admin' });
    if (!adminExists) {
      await User.create({
        userid: 'admin',
        password: 'admin123',
        type: 'administrator'
      });
      console.log('Default admin user seeded: admin / admin123');
    }
  } catch (err) {
    console.error('Error seeding default users:', err);
  }
};

const updateExistingLoans = async () => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    await Loan.updateMany(
      { $or: [{ loan_date: { $exists: false } }, { loan_date: null }, { loan_date: '' }] },
      { $set: { loan_date: today } }
    );
    await Loan.updateMany(
      { $or: [{ status: { $exists: false } }, { status: null }, { status: '' }] },
      { $set: { status: 'Pending' } }
    );
  } catch (err) {
    console.error('Error updating existing loans with loan_date and status:', err);
  }
};

mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/loanDolphin')
  .then(async () => {
    console.log('MongoDB Connected');
    await seedDefaultUsers();
    await updateExistingLoans();
  })
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
  try {
    const branches = await Branch.find().sort({ b_name: 1 });
    res.json(branches);
  } catch (error) {
    console.error('Error fetching branches:', error);
    res.status(500).json({ message: 'Failed to fetch branches.' });
  }
});

// Fetch all managers from the database.
app.get('/api/managers', async (req, res) => {
  try {
    const managers = await Manager.find().sort({ b_name: 1 });
    res.json(managers);
  } catch (error) {
    console.error('Error fetching managers:', error);
    res.status(500).json({ message: 'Failed to fetch managers.' });
  }
});

// Create a new branch with associated manager user credentials after verifying admin permission.
app.post('/api/branches', async (req, res) => {
  const { b_name, b_city, assets, managerUserid, managerPassword } = req.body || {};

  const cleanName = b_name?.trim();
  const cleanCity = b_city?.trim();
  const cleanUserId = managerUserid?.trim();
  const cleanPassword = managerPassword?.trim();

  if (!cleanName || !cleanCity || !cleanUserId || !cleanPassword) {
    return res.status(400).json({ message: 'Branch details and manager credentials are required.' });
  }

  const currentUserId = req.body.currentUserId || req.headers['x-user-id'];
  const adminUser = await User.findOne({ userid: currentUserId, type: 'administrator' });
  if (!adminUser) {
    return res.status(403).json({ message: 'Access denied: Only administrators can create branches and manager accounts.' });
  }

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
      assets: Number(assets) || 0
    });

    const newUser = await User.create({
      userid: cleanUserId,
      password: cleanPassword,
      type: 'branch_manager'
    });

    const newManager = await Manager.create({
      userid: newUser.userid,
      b_name: newBranch.b_name
    });

    return res.status(201).json({
      message: 'Branch and manager created successfully',
      branch: newBranch,
      manager: newManager,
      user: {
        userid: newUser.userid,
        type: newUser.type
      }
    });
  } catch (error) {
    console.error('Error creating branch and manager:', error);
    return res.status(500).json({ message: error.message || 'Failed to create branch and manager.' });
  }
});

// Fetch all customers from the database, sorted by name.
app.get('/api/customers', async (req, res) => {
  try {
    const customers = await Customer.find().sort({ c_name: 1 });
    res.json(customers);
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ message: 'Failed to fetch customers.' });
  }
});

// Create a new customer record with name, street, and city information.
app.post('/api/customers', async (req, res) => {
  const { c_name, c_street, c_city } = req.body || {};

  if (!c_name || !c_street || !c_city) {
    return res.status(400).json({ message: 'Customer name, street, and city are required.' });
  }

  try {
    const customer = await Customer.create({ c_name, c_street, c_city });
    res.status(201).json(customer);
  } catch (error) {
    console.error('Error creating customer:', error);
    res.status(500).json({ message: error.message || 'Failed to create customer.' });
  }
});

// Fetch all loans from the database, sorted by loan number.
app.get('/api/loans', async (req, res) => {
  try {
    const loans = await Loan.find().sort({ l_no: 1 });
    res.json(loans);
  } catch (error) {
    console.error('Error fetching loans:', error);
    res.status(500).json({ message: 'Failed to fetch loans.' });
  }
});

// Create a new loan record linked to a branch and borrowers.
app.post('/api/loans', async (req, res) => {
  const { l_no, amt, b_name, borrowers, loan_date, c_id, status } = req.body || {};

  if (!l_no || !amt || !b_name) {
    return res.status(400).json({ message: 'Loan number, amount, and branch are required.' });
  }

  try {
    const validStatus = status && ['Pending', 'Approved', 'Rejected'].includes(status) ? status : 'Pending';
    const loan = await Loan.create({
      l_no,
      amt: Number(amt),
      b_name,
      borrowers: borrowers || (c_id ? [String(c_id)] : []),
      loan_date: loan_date || new Date().toISOString().slice(0, 10),
      status: validStatus
    });

    res.status(201).json(loan);
  } catch (error) {
    console.error('Error creating loan:', error);
    res.status(500).json({ message: error.message || 'Failed to create loan.' });
  }
});

// Update a loan's status - now also allowed for branch_manager on own branch
app.put('/api/loans/:id/status', async (req, res) => {
  const { status, currentUserId: bodyUserId } = req.body || {};
  const currentUserId = bodyUserId || req.headers['x-user-id'];

  if (!currentUserId) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  const user = await User.findOne({ userid: currentUserId });
  if (!user) {
    return res.status(403).json({ message: 'Access denied: User not found.' });
  }

  const allowedRoles = ['senior_manager', 'administrator', 'branch_manager'];
  if (!allowedRoles.includes(user.type)) {
    return res.status(403).json({ message: 'Access denied: Insufficient permissions.' });
  }

  if (!status || !['Pending', 'Approved', 'Rejected'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status. Must be one of: Pending, Approved, Rejected.' });
  }

  try {
    const idParam = req.params.id;
    const query = mongoose.Types.ObjectId.isValid(idParam)
      ? { $or: [{ _id: idParam }, { l_no: idParam }] }
      : { l_no: idParam };

    // Fetch the loan first to perform branch check for branch_manager
    const loan = await Loan.findOne(query);
    if (!loan) {
      return res.status(404).json({ message: 'Loan not found.' });
    }

    // If the user is a branch_manager, ensure they manage the loan's branch
    if (user.type === 'branch_manager') {
      const manager = await Manager.findOne({ userid: user.userid });
      if (!manager || manager.b_name !== loan.b_name) {
        return res.status(403).json({ message: 'Access denied: Branch manager can only modify loans of their own branch.' });
      }
    }

    const updatedLoan = await Loan.findOneAndUpdate(query, { status }, { new: true });
    res.json(updatedLoan);
  } catch (error) {
    console.error('Error updating loan status:', error);
    res.status(500).json({ message: error.message || 'Failed to update loan status.' });
  }
});

app.listen(5000, () => console.log('Backend running on port 5000'));
