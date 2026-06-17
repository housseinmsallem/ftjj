export async function sendSms({ to, message }) {
  if (!process.env.SMS_PROVIDER) {
    console.log('[SMS:DEV]', { to, message });
    return { skipped: true };
  }
  return { queued: true, provider: process.env.SMS_PROVIDER };
}
