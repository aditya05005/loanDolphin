# loanDolphin


This is a loan management software.

banking-loan-system/               <-- Main Git Repository
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
    ├── config/
    ├── controllers/
    ├── models/                    <-- Mongoose Schemas (Exp 4)
    ├── routes/
    ├── server.js
    └── package.json