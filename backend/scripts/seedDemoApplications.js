import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Customer from '../models/Customer.js';
import Branch from '../models/Branch.js';
import Loan from '../models/Loan.js';
import Account from '../models/Account.js';
import { requestMlPrediction } from '../services/mlPrediction.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const csvPath = path.resolve(__dirname, '../../ml/test_sample.csv');
const prefix = 'demo_ca2_';

function parseCsv(text) {
  const [headerLine, ...lines] = text.trim().split(/\r?\n/);
  const headers = headerLine.split(',');
  return lines.filter(Boolean).map((line) => {
    const values = line.split(',');
    return Object.fromEntries(headers.map((header, index) => [header, values[index] || '']));
  });
}

function applicantFromRow(row) {
  return {
    married: row.Married || 'No',
    dependents: row.Dependents === '3+' ? '3+' : ['0', '1', '2'].includes(row.Dependents) ? row.Dependents : '0',
    education: row.Education || 'Graduate',
    selfEmployed: row.Self_Employed || 'No',
    applicantIncome: Number(row.ApplicantIncome || 0),
    coapplicantIncome: Number(row.CoapplicantIncome || 0),
    termMonths: Number(row.Loan_Amount_Term || 360),
    creditHistory: Number(row.Credit_History) === 1 ? 1 : 0,
    propertyArea: ['Urban', 'Semiurban', 'Rural'].includes(row.Property_Area) ? row.Property_Area : 'Urban'
  };
}

async function seed() {
  if (!fs.existsSync(csvPath)) throw new Error('Run ml/analysis.ipynb first to create ml/test_sample.csv.');
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/loanDolphin');
  try {
    const branch = await Branch.findOne().sort({ b_name: 1 });
    if (!branch) throw new Error('Create a branch before seeding demo applications.');
    const sampleRows = parseCsv(fs.readFileSync(csvPath, 'utf8')).slice(0, 24);
    const demoUsers = sampleRows.map((_, index) => `${prefix}${String(index + 1).padStart(3, '0')}`);

    await Loan.deleteMany({ customerUserId: { $in: demoUsers } });
    await Account.deleteMany({ userid: { $in: demoUsers } });
    await Customer.deleteMany({ userid: { $in: demoUsers } });
    await User.deleteMany({ userid: { $in: demoUsers } });

    for (let index = 0; index < sampleRows.length; index += 1) {
      const row = sampleRows[index];
      const userid = demoUsers[index];
      const applicant = applicantFromRow(row);
      const user = await User.create({ userid, password: 'DemoLoan#2026', type: 'customer' });
      const customerId = `${prefix}customer_${String(index + 1).padStart(3, '0')}`;
      const customer = await Customer.create({
        c_id: customerId,
        userid: user.userid,
        c_name: `Demo Applicant ${String(index + 1).padStart(2, '0')}`,
        c_street: 'Demo Street',
        c_city: 'Demo City',
        aadharNumber: `${String(index + 1).padStart(4, '0')}0000000000`,
        panCard: `DEMO${String(index + 1).padStart(5, '0')}D`
      });
      await Account.create({ ac_no: `${prefix}account_${index + 1}`, userid, b_name: branch.b_name, balance: 0 });
      const loan = await Loan.create({
        l_no: `${prefix}loan_${String(index + 1).padStart(3, '0')}`,
        amt: Math.max(1, Number(row.LoanAmount || 1)) * 1000,
        b_name: branch.b_name,
        c_id: customer.c_id,
        customerUserId: user.userid,
        borrowers: [customer.c_id],
        applicant,
        status: ['Pending', 'Pending', 'Approved', 'Rejected'][index % 4]
      });
      try {
        loan.mlPrediction = await requestMlPrediction(loan.amt, applicant);
        await loan.save();
      } catch (error) {
        console.error(`Could not score ${loan.l_no}:`, error.message);
      }
    }
    console.log(`Seeded ${sampleRows.length} held-out demo applications at branch ${branch.b_name}.`);
    console.log(`Demo customer IDs use ${prefix}; shared demo password: DemoLoan#2026`);
  } finally {
    await mongoose.disconnect();
  }
}

seed().catch((error) => {
  console.error('Demo application seeding failed:', error);
  process.exitCode = 1;
});
