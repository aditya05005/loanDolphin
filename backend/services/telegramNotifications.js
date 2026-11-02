const TELEGRAM_API = 'https://api.telegram.org';

/**
 * Sends a minimal operational alert to the configured Telegram chat.
 * Credentials are read at call time so local .env and hosted env vars work alike.
 */
export async function notifyLoanDisbursed({ loanNumber, amount, branchName, managerUserId }) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();

  if (!botToken && !chatId) return { sent: false, reason: 'not_configured' };
  if (!botToken || !chatId) {
    throw new Error('Both TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID must be configured.');
  }

  const text = [
    'Loan disbursed',
    `Loan: ${loanNumber}`,
    `Amount: $${Number(amount).toLocaleString('en-US')}`,
    `Branch: ${branchName}`,
    `Disbursed by: ${managerUserId}`
  ].join('\n');

  const response = await fetch(`${TELEGRAM_API}/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
    signal: AbortSignal.timeout(7000)
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || result?.ok !== true) {
    throw new Error(`Telegram sendMessage failed${result?.description ? `: ${result.description}` : '.'}`);
  }

  return { sent: true };
}
