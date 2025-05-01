# Telegram Stars Subscription Integration

This document provides an overview of the subscription system implemented in TanulBot using Telegram Stars.

## Overview

TanulBot now offers premium subscription plans for enhanced language learning features. The subscription system is built using Telegram's Stars payment system, which allows digital goods and services to be sold directly within the Telegram platform.

## Subscription Plans

Currently, TanulBot offers two subscription plans:

1. **Basic Plan** (100 Stars, ~$1.30 USD)

   - Advanced dictation exercises
   - Detailed diary corrections
   - Enhanced vocabulary tracking
   - Extended chat history (20 messages)
   - Basic Anki deck exports

2. **Premium Plan** (300 Stars, ~$3.90 USD)
   - Expert dictation exercises with native audio
   - Comprehensive diary analysis with mnemonics
   - Full vocabulary management
   - Unlimited chat history
   - Custom Anki deck exports
   - Priority processing

Both plans last for 30 days and can be renewed.

## How It Works

### For Users

1. Users can check their subscription status by clicking the "💎 Subscription Status" button in the main menu.
2. To subscribe, users choose a plan from the subscription menu.
3. Telegram processes the payment using Stars.
4. Upon successful payment, users gain immediate access to premium features.
5. Subscriptions can be cancelled at any time, resulting in a refund of the Stars.

### Technical Implementation

The subscription system consists of:

1. **UserState** - Extended to include subscription status, plan type, features, and expiration.
2. **Subscription Service** - Handles payment processing, subscription activation, and refunds.
3. **Store Methods** - Added to check subscription status and manage feature access.
4. **UI Integration** - Subscription options in the main menu and a dedicated subscription management interface.

## Payment Flow

1. User requests a subscription
2. Bot creates an invoice using `replyWithInvoice` with `XTR` currency (Telegram Stars)
3. User approves payment
4. Telegram sends a `pre_checkout_query` to the bot
5. Bot confirms the pre-checkout
6. Upon successful payment, Telegram sends a `successful_payment` message
7. Bot activates the subscription and updates the user's state

## Integration Notes

- All payments for digital goods must use Telegram Stars (`XTR` currency)
- The system keeps track of the payment ID for potential refunds
- Subscription status is checked before granting access to premium features
- Feature access levels cascade (premium users have access to basic features)

## Dependencies

- grammY Bot Framework
- In-memory or persistent state store
- Telegram Stars payment system (integrated with Telegram)
