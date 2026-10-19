# LoanDolphin Project Notes

## Product model

- LoanDolphin is currently a loan application and servicing prototype. It does not move real money or connect to banking or payout networks.
- A customer applies for their own loan. Staff review applications; the customer dashboard is not a staff loan origination tool.
- A customer may have at most one `Pending` loan application. Enforce this rule in the backend as well as the interface.
- Loan statuses are `Pending`, `Approved`, `Rejected`, and `Disbursed`. Approval does not add to the customer's displayed balance; disbursement credits the internal account balance.
- The displayed “Wallet Balance” is an internal database balance and is not currently redeemable or transferable.

## Roles and access

- `administrator`: system setup, branch creation, and branch detail edits.
- `branch_manager`: branch scoped loan review and operations.
- `senior_manager`: legacy network wide staff role; avoid adding new features that depend on it unless requested.
- `customer`: self service loan applications and their own loan/account data.
- Enforce access in backend routes. Frontend visibility checks are for usability, not security.

## Branches and accounts

- `b_name` is a branch identifier referenced by loans, accounts, and manager assignments. Do not rename it without a deliberate migration of those references.
- Branch `lendingBudget` is the remaining available lending budget. Disbursement atomically deducts the loan amount, and a loan cannot be disbursed if the branch lacks budget. It is still an internal simulation value, not actual available funds or an accounting ledger.
- Customer accounts are internal records. Ensure an account exists before crediting a disbursement, and avoid crediting the same loan more than once.

## Implementation guidance

- Keep loan ownership and customer identity derived from the authenticated server session, not request body identity fields.
- Preserve customer branch scoping for branch managers.
- Keep customer dashboard and navigation focused on customer actions; the current app is a single page without separate Dashboard, Loans, or Branches routes.
