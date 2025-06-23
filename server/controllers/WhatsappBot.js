import twilio from "twilio";
import { customerByPhone } from "../utills/service";
import { testLoginEndpoints } from "../utills/splynxClient";
import dotenv from "dotenv";

dotenv.config();

const { SID: accountSid, KEY: TwilloAuthToken } = process.env;

twilio(accountSid, TwilloAuthToken);
const { MessagingResponse } = twilio.twiml;

// In-memory store for user sessions (consider using Redis for production)
const userSessions = new Map();

// Menu options mapping
const MENU_OPTIONS = {
  1: 'account_info',
  2: 'recharge_voucher', 
  3: 'check_balance',
  4: 'change_plan',
  5: 'support'
};

/**
 * @class WhatsappBot
 * @description class will implement bot functionality
 */
class WhatsappBot {
  /**
   * @memberof WhatsappBot
   * @param {object} req - Request sent to the route
   * @param {object} res - Response sent from the controller
   * @param {object} next - Error handler
   * @returns {object} - object representing response message
   **/
  static async ispService(req, res, next) {
    const twiml = new MessagingResponse();
    const { From, Body } = req.body;
    const senderNumber = From.replace("whatsapp:", "");
    const userMessage = Body.trim();

    console.log("User message:", userMessage);

    try {
      // await testLoginEndpoints();
      
      // Get or create user session
      let userSession = userSessions.get(senderNumber) || {
        state: 'initial',
        lastActivity: Date.now()
      };

      // Clean up old sessions (older than 30 minutes)
      if (Date.now() - userSession.lastActivity > 30 * 60 * 1000) {
        userSession = { state: 'initial', lastActivity: Date.now() };
      }

      // Handle different conversation states
      switch (userSession.state) {
        case 'initial':
          await WhatsappBot.handleInitialMessage(twiml, senderNumber, userMessage);
          userSession.state = 'awaiting_selection';
          break;
          
        case 'awaiting_selection':
          await WhatsappBot.handleMenuSelection(twiml, senderNumber, userMessage, userSession);
          break;
          
        case 'awaiting_voucher':
          await WhatsappBot.handleVoucherInput(twiml, senderNumber, userMessage, userSession);
          break;
          
        case 'awaiting_plan_selection':
          await WhatsappBot.handlePlanSelection(twiml, senderNumber, userMessage, userSession);
          break;
          
        default:
          await WhatsappBot.handleInitialMessage(twiml, senderNumber, userMessage);
          userSession.state = 'awaiting_selection';
      }

      // Update session
      userSession.lastActivity = Date.now();
      userSessions.set(senderNumber, userSession);

      res.set("Content-Type", "text/xml");
      return res.status(200).send(twiml.toString());
      
    } catch (error) {
      console.error("Error", error);
      twiml.message("❌ Sorry, there was an error processing your request. Please try again later.");
      res.set("Content-Type", "text/xml");
      return res.status(200).send(twiml.toString());
    }
  }

  static async handleInitialMessage(twiml, senderNumber, userMessage) {
    // Uncomment when ready to check customer
    // const customer = await customerByPhone(senderNumber);
    // if (!customer) {
    //   twiml.message(
    //     `Hello, we could not find your account with the number ${senderNumber}. Please contact support.`
    //   );
    //   return;
    // }

    twiml.message(
      `👋 Welcome ${senderNumber}!\n\n` +
      `Please choose an option by replying with the number:\n\n` +
      `1️⃣ View account information and data usage\n` +
      `2️⃣ Recharge via voucher\n` +
      `3️⃣ Check balance\n` +
      `4️⃣ Change service plan\n` +
      `5️⃣ Support & Auto-Replies\n\n` +
      `Reply with a number (1-5) to continue.`
    );
  }

  static async handleMenuSelection(twiml, senderNumber, userMessage, userSession) {
    const selection = userMessage.trim();
    
    if (selection.toLowerCase() === 'menu') {
      userSession.state = 'awaiting_selection';
      await WhatsappBot.handleInitialMessage(twiml, senderNumber, '');
      return;
    }

    if (!MENU_OPTIONS[selection]) {
      twiml.message(
        `❌ Invalid selection. Please reply with a number from 1 to 5.\n\n` +
        `1️⃣ View account information\n` +
        `2️⃣ Recharge via voucher\n` +
        `3️⃣ Check balance\n` +
        `4️⃣ Change service plan\n` +
        `5️⃣ Support\n\n` +
        `Type 'menu' to see options again.`
      );
      return;
    }

    const selectedOption = MENU_OPTIONS[selection];

    switch (selectedOption) {
      case 'account_info':
        await WhatsappBot.handleAccountInfo(twiml, senderNumber);
        userSession.state = 'initial'; // Reset to main menu
        break;
        
      case 'recharge_voucher':
        twiml.message(
          `🎫 Voucher Recharge\n\n` +
          `Please enter your voucher code:`
        );
        userSession.state = 'awaiting_voucher';
        break;
        
      case 'check_balance':
        await WhatsappBot.handleCheckBalance(twiml, senderNumber);
        userSession.state = 'initial'; // Reset to main menu
        break;
        
      case 'change_plan':
        await WhatsappBot.handleChangePlan(twiml, senderNumber);
        userSession.state = 'awaiting_plan_selection';
        break;
        
      case 'support':
        await WhatsappBot.handleSupport(twiml, senderNumber);
        userSession.state = 'initial'; // Reset to main menu
        break;
    }
  }

  static async handleAccountInfo(twiml, senderNumber) {
    // Replace with actual customer data retrieval
    const customer = await customerByPhone(senderNumber);
    
    if (customer) {
      twiml.message(
        `📋 Account Information\n\n` +
        `📞 Phone: ${senderNumber}\n` +
        `👤 Name: ${customer.name || 'N/A'}\n` +
        `💰 Balance: $${customer.balance || '0.00'}\n` +
        `📊 Data Usage: ${customer.dataUsage || '0 MB'} / ${customer.dataLimit || 'Unlimited'}\n` +
        `📦 Current Plan: ${customer.plan || 'Basic'}\n\n` +
        `Type 'menu' to return to main menu.`
      );
    } else {
      twiml.message(
        `❌ Could not retrieve account information. Please contact support.\n\n` +
        `Type 'menu' to return to main menu.`
      );
    }
  }

  static async handleVoucherInput(twiml, senderNumber, voucherCode, userSession) {
    if (voucherCode.toLowerCase() === 'menu') {
      userSession.state = 'initial';
      await WhatsappBot.handleInitialMessage(twiml, senderNumber, '');
      return;
    }

    // Validate and process voucher (implement your voucher logic here)
    const isValidVoucher = await WhatsappBot.validateVoucher(voucherCode);
    
    if (isValidVoucher) {
      twiml.message(
        `✅ Voucher Applied Successfully!\n\n` +
        `🎫 Voucher Code: ${voucherCode}\n` +
        `💰 Amount: $10.00\n` +
        `📊 New Balance: $25.00\n\n` +
        `Type 'menu' to return to main menu.`
      );
    } else {
      twiml.message(
        `❌ Invalid voucher code: ${voucherCode}\n\n` +
        `Please check the code and try again, or type 'menu' to return to main menu.`
      );
      return; // Stay in voucher input state
    }
    
    userSession.state = 'awaiting_voucher';
  }

  static async handleCheckBalance(twiml, senderNumber) {
    const customer = await customerByPhone(senderNumber);
    
    if (customer) {
      twiml.message(
        `💰 Balance Information\n\n` +
        `Current Balance: $${customer.balance || '0.00'}\n` +
        `Last Recharge: ${customer.lastRecharge || 'N/A'}\n` +
        `Next Bill Date: ${customer.nextBillDate || 'N/A'}\n\n` +
        `Type 'menu' to return to main menu.`
      );
    } else {
      twiml.message(
        `❌ Could not retrieve balance information.\n\n` +
        `Type 'menu' to return to main menu.`
      );
    }
  }

  static async handleChangePlan(twiml, senderNumber) {
    twiml.message(
      `📶 Available Service Plans\n\n` +
      `1️⃣ Basic Plan - $10/month (1GB)\n` +
      `2️⃣ Standard Plan - $20/month (5GB)\n` +
      `3️⃣ Premium Plan - $30/month (Unlimited)\n` +
      `4️⃣ Enterprise Plan - $50/month (Unlimited + Priority)\n\n` +
      `Reply with the plan number (1-4) or type 'menu' to return.`
    );
  }

  static async handlePlanSelection(twiml, senderNumber, selection, userSession) {
    if (selection.toLowerCase() === 'menu') {
      userSession.state = 'awaiting_selection';
      await WhatsappBot.handleInitialMessage(twiml, senderNumber, '');
      return;
    }

    const planMap = {
      1: 'Basic Plan - $10/month (1GB)',
      2: 'Standard Plan - $20/month (5GB)', 
      3: 'Premium Plan - $30/month (Unlimited)',
      4: 'Enterprise Plan - $50/month (Unlimited + Priority)'
    };

    if (planMap[selection]) {
      // Implement plan change logic here
      twiml.message(
        `✅ Plan Change Request Submitted\n\n` +
        `📦 New Plan: ${planMap[selection]}\n` +
        `📅 Effective Date: Next billing cycle\n` +
        `📧 Confirmation will be sent via email.\n\n` +
        `Type 'menu' to return to main menu.`
      );
      userSession.state = 'awaiting_selection';
    } else {
      twiml.message(
        `❌ Invalid plan selection. Please choose 1-4 or type 'menu' to return.`
      );
    }
  }

  static async handleSupport(twiml, senderNumber) {
    twiml.message(
      `📞 Support Information\n\n` +
      `📧 Email: support@yourcompany.com\n` +
      `📞 Phone: +1-800-XXX-XXXX\n` +
      `🕒 Hours: Mon-Fri 9AM-6PM\n` +
      `💬 Live Chat: Available on our website\n\n` +
      `For urgent issues, please call our support line.\n\n` +
      `Type 'menu' to return to main menu.`
    );
  }

  static async validateVoucher(voucherCode) {
    // Implement your voucher validation logic here
    // WhatsappBot is just a placeholder
    return voucherCode.length >= 6 && voucherCode.length <= 12;
  }

  static resetUserSession(senderNumber) {
    userSessions.delete(senderNumber);
  }

  static cleanupOldSessions() {
    const now = Date.now();
    const thirtyMinutes = 30 * 60 * 1000;
    
    for (const [phone, session] of userSessions.entries()) {
      if (now - session.lastActivity > thirtyMinutes) {
        userSessions.delete(phone);
      }
    }
  }
}

// Clean up sessions every 10 minutes
setInterval(() => {
  WhatsappBot.cleanupOldSessions();
}, 10 * 60 * 1000);

export default WhatsappBot;