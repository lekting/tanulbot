import { Bot, Context, InputFile } from 'grammy';
import { store } from '../../store';
import { SubscriptionPlan } from '../../types';
import { t, getSubscriptionPlans } from '../i18n';
import { getUserLang } from '../../utils/handlerUtils';

/**
 * Create an invoice for subscription purchase
 * @param ctx - Telegram context
 * @param plan - Subscription plan to purchase
 */
export async function createSubscriptionInvoice(
  ctx: Context,
  plan: 'BASIC' | 'PREMIUM'
): Promise<void> {
  if (!ctx.from) return;

  const userId = ctx.from.id;
  const userLang = await getUserLang(userId);
  const plans = await getSubscriptionPlans(userLang);
  const planConfig = plans[plan];

  // Create invoice
  await ctx.replyWithInvoice(
    planConfig.title,
    planConfig.description,
    // Invoice payload as JSON string (will be returned when payment is successful)
    JSON.stringify({
      userId,
      plan: plan === 'BASIC' ? 'basic' : 'premium',
      timestamp: Date.now()
    }),
    // Use XTR for Telegram Stars (for digital goods/services)
    'XTR',
    // Price in Stars
    [
      {
        label: planConfig.title,
        amount: planConfig.price
      }
    ],
    {
      photo_url: `https://example.com/subscription-${plan.toLowerCase()}.jpg`,
      photo_width: 600,
      photo_height: 400,
      need_name: false,
      need_email: false,
      need_phone_number: false,
      need_shipping_address: false,
      is_flexible: false,
      max_tip_amount: 0,
      suggested_tip_amounts: []
    }
  );
}

/**
 * Handle pre-checkout query for subscription purchase
 * @param ctx - Telegram context with pre-checkout query
 */
export async function handlePreCheckout(ctx: Context): Promise<void> {
  // Always approve pre-checkout
  if (ctx.preCheckoutQuery) {
    try {
      await ctx.answerPreCheckoutQuery(true);
    } catch (error) {
      console.error('Error answering pre-checkout query:', error);
    }
  }
}

/**
 * Process successful payment for subscription
 * @param ctx - Telegram context with successful payment data
 */
export async function processSuccessfulPayment(ctx: Context): Promise<void> {
  if (!ctx.message?.successful_payment || !ctx.from) {
    return;
  }

  const userId = ctx.from.id;
  const userLang = await getUserLang(userId);
  const payment = ctx.message.successful_payment;

  try {
    // Parse payload JSON
    const payload = JSON.parse(payment.invoice_payload);

    // Verify this payment is for a subscription and matches the user
    if (payload.userId !== userId) {
      console.error('User ID mismatch in payment payload');
      return;
    }

    const plan = payload.plan as SubscriptionPlan;
    // Convert plan to uppercase for config lookup
    const planKey = plan === 'basic' ? 'BASIC' : 'PREMIUM';
    const plans = await getSubscriptionPlans(userLang);
    const planConfig = plans[planKey];

    // Calculate expiration time
    const expiresAt = Date.now() + planConfig.duration;

    // Update user's subscription
    store.setUserSubscription(
      userId,
      plan,
      expiresAt,
      payment.telegram_payment_charge_id
    );

    // Send confirmation message
    await ctx.reply(
      t('subscription.success', userLang, {
        plan: planConfig.title,
        expiry: new Date(expiresAt).toLocaleDateString()
      })
    );
  } catch (error) {
    console.error('Error processing successful payment:', error);
    await ctx.reply(t('subscription.error', userLang));
  }
}

/**
 * Cancel and refund a subscription
 * @param ctx - Telegram context
 */
export async function cancelSubscription(ctx: Context): Promise<void> {
  if (!ctx.from) return;

  const userId = ctx.from.id;
  const userLang = await getUserLang(userId);
  const subscription = await store.getUserSubscription(userId);

  // Check if subscription is active and has payment ID
  if (!subscription.isActive || !subscription.paymentChargeId) {
    await ctx.reply(t('subscription.no_active', userLang));
    return;
  }

  try {
    // Refund the payment
    await ctx.api.refundStarPayment(userId, subscription.paymentChargeId);

    // Update subscription status
    store.cancelSubscription(userId);

    // Confirm cancellation
    await ctx.reply(t('subscription.cancelled', userLang));
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    await ctx.reply(t('subscription.cancel_error', userLang));
  }
}

/**
 * Get subscription status for a user
 * @param ctx - Telegram context
 */
export async function getSubscriptionStatus(ctx: Context): Promise<void> {
  if (!ctx.from) return;

  const userId = ctx.from.id;
  const userLang = await getUserLang(userId);
  const subscription = await store.getUserSubscription(userId);

  let statusMessage = t('subscription.status_display', userLang, {
    plan: subscription.plan,
    active: subscription.isActive
      ? t('general.yes', userLang)
      : t('general.no', userLang)
  });

  // Add expiration date if available
  if (subscription.expiresAt) {
    const expiryDate = new Date(subscription.expiresAt).toLocaleDateString();
    statusMessage += `\n${t('subscription.expires', userLang, {
      date: expiryDate
    })}`;
  }

  // Add features list
  statusMessage += `\n\n${t('subscription.features', userLang)}:\n`;
  subscription.features.forEach((feature) => {
    statusMessage += `• ${feature}\n`;
  });

  await ctx.reply(statusMessage);
}

/**
 * Register subscription handlers with the bot
 * @param bot - Telegram bot instance
 */
export function registerSubscriptionHandlers(bot: Bot): void {
  // Handle pre-checkout queries
  bot.on('pre_checkout_query', handlePreCheckout);

  // Handle successful payments
  bot.on('message:successful_payment', processSuccessfulPayment);
}
