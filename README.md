# loanDolphin

This is a loan management software.

## Project Structure

loanDolphin/
├── frontend/                      <-- React App (Exp 1, 2, 3, 8, 9, 10)
│   ├── public/
│   ├── src/
│   │   ├── components/            <-- UI Components built in Exp 1
│   │   │   ├── Navbar.jsx
│   │   │   ├── MetricsOverview.jsx
│   │   │   ├── ActiveLoansTable.jsx
│   │   │   ├── BranchCards.jsx
│   │   │   └── LoanForm.jsx
│   │   ├── context/               <-- React Context (Exp 2 & 3)
│   │   ├── hooks/                 <-- Custom Hooks (Exp 2)
│   │   ├── services/              <-- API Requests (Exp 5 & 7)
│   │   ├── App.jsx                <-- Main Assembly Component
│   │   ├── main.jsx
│   │   └── index.css              <-- Tailwind Directive Imports
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
│
└── backend/                       <-- Node/Express Server (Exp 4, 5, 6, 7, 8)
    ├── models/                    <-- Mongoose Schemas (Exp 4)
    │   ├── Branch.js
    │   ├── Customer.js
    │   ├── Account.js
    │   └── Loan.js
    ├── server.js                  <-- Express + MongoDB setup
    ├── package.json
    ├── config/
    ├── controllers/
    └── routes/

## REST API Design with MongoDB + Mongoose

This project uses MongoDB with Mongoose to model the relational banking entities as document schemas.

### 1. Branch Model

```js
import mongoose from 'mongoose';

const branchSchema = new mongoose.Schema({
  b_name: { type: String, required: true, unique: true },
  b_city: { type: String, required: true },
  assets: { type: Number, required: true, default: 0.00 }
});

export default mongoose.model('Branch', branchSchema);
```

### 2. Customer Model

```js
import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
  c_name: { type: String, required: true, unique: true },
  c_street: { type: String, required: true },
  c_city: { type: String, required: true }
});

export default mongoose.model('Customer', customerSchema);
```

### 3. Account Model

```js
import mongoose from 'mongoose';

const accountSchema = new mongoose.Schema({
  ac_no: { type: String, required: true, unique: true },
  balance: { type: Number, required: true, default: 0.00 },
  b_name: { type: String, ref: 'Branch', required: true }
});

export default mongoose.model('Account', accountSchema);
```

### 4. Loan Model

```js
import mongoose from 'mongoose';

const loanSchema = new mongoose.Schema({
  l_no: { type: String, required: true, unique: true },
  amt: { type: Number, required: true, default: 0.00 },
  b_name: { type: String, ref: 'Branch', required: true },
  borrowers: [{ type: String, ref: 'Customer' }]
});

export default mongoose.model('Loan', loanSchema);
```

### 5. Express Server Setup

```js
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';

const app = express();
app.use(express.json());
app.use(cors());

mongoose.connect('mongodb://127.0.0.1:27017/loanDolphin')
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error(err));

app.get('/api/loans', async (req, res) => {
  const Loan = (await import('./models/Loan.js')).default;
  const loans = await Loan.find();
  res.json(loans);
});

app.listen(5000, () => console.log('Backend running on port 5000'));
```

### Setup Instructions

1. Install backend dependencies:

```bash
cd backend
npm install
```

2. Start MongoDB locally on port 27017.

3. Run the backend server:

```bash
npm start
```

4. Access the sample API endpoint:

```bash
http://localhost:5000/api/loans
```

This setup provides the foundation for a REST API layer connected to MongoDB, ready for CRUD endpoints and front-end integration.

