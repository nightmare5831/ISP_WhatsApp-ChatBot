import twilio from "twilio";
import {
  customerByPhone,
  customerById,
  customerByIdPassword,
} from "../utills/service";
import dotenv from "dotenv";

dotenv.config();

const { SID: accountSid, KEY: TwilloAuthToken } = process.env;

twilio(accountSid, TwilloAuthToken);
const { MessagingResponse } = twilio.twiml;

// In-memory store for user sessions (consider using Redis for production)
const userSessions = new Map();

// Menu options mapping
const MENU_OPTIONS = {
  1: "account_info",
  2: "recharge_voucher",
  3: "check_balance",
  4: "change_plan",
  5: "support",
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

    let userSession = userSessions.get(senderNumber) || {
      state: "initial",
      lastActivity: Date.now(),
      language: 0,
    };
    console.log("User message:", userMessage);
    try {
      if (Date.now() - userSession.lastActivity > 30 * 60 * 1000) {
        userSession = {
          state: "initial",
          lastActivity: Date.now(),
          language: userSession.language || 0,
        };
      }
      console.log("User session state:", userSession.state);
      switch (userSession.state) {
        case "initial":
          await WhatsappBot.handleInitialMessage(
            twiml,
            senderNumber,
            userMessage,
            userSession
          );
          break;

        case "awaiting_selection":
          await WhatsappBot.handleMenuSelection(
            twiml,
            senderNumber,
            userMessage,
            userSession
          );
          break;

        case "awaiting_voucher":
          await WhatsappBot.handleVoucherInput(
            twiml,
            senderNumber,
            userMessage,
            userSession
          );
          break;

        case "awaiting_plan_selection":
          await WhatsappBot.handlePlanSelection(
            twiml,
            senderNumber,
            userMessage,
            userSession
          );
          break;
        case "plan":
          await WhatsappBot.handleSupport(
            twiml,
            senderNumber,
            userMessage,
            userSession
          );
          break;
        case "support":
          await WhatsappBot.changeLanguage(
            twiml,
            senderNumber,
            userMessage,
            userSession
          );
          break;
        default:
          await WhatsappBot.handleInitialMessage(
            twiml,
            senderNumber,
            userMessage,
            userSession
          );
      }

      userSession.lastActivity = Date.now();
      userSessions.set(senderNumber, userSession);

      res.set("Content-Type", "text/xml");
      return res.status(200).send(twiml.toString());
    } catch (error) {
      console.error("Error", error);
      userSession.language === 1
        ? twiml.message(
            "❌ Sorry, there was an error processing your request. Please try again later."
          )
        : twiml.message(
            "❌ عذرًا، حدث خطأ أثناء معالجة طلبك. يُرجى المحاولة لاحقًا."
          );
      res.set("Content-Type", "text/xml");
      return res.status(200).send(twiml.toString());
    }
  }

  static async handleInitialMessage(
    twiml,
    senderNumber,
    userMessage,
    userSession
  ) {
    let customerId = userSession.customerId;
    let customer;
    if (!customerId) {
      customer =
        userSession.state === "idVerification"
          ? await customerByIdPassword(userMessage)
          : await customerByPhone(senderNumber);
    }
    if (!customer && !customerId) {
      userSession.state = "idVerification";
      userSession.language === 1
        ? twiml.message(
            `${senderNumber} مرحبًا، لم نتمكن من العثور على حسابك بالرقم.\n` +
              `الرجاء إدخال 👤 معرف العميل و 🔑 تسجيل الدخول إلى البوابة، أو 📞 الاتصال بالدعم.\n` +
              `مثال: 9557 4001360932\n\n`
          )
        : twiml.message(
            `Hello, we could not find your account with the number ${senderNumber}.\n` +
              `Please send 👤 CutomerId and 🔑 Portal-login , Or 📞 contact support.\n` +
              `Example: 9557 4001360932\n\n`
          );
      return;
    }
    if (!userSession.customerId) {
      userSession.customerId = customer.id;
      userSession.customerName = customer.name || "Customer";
    }
    userSession.state = "awaiting_selection";
    console.log("language", userSession.language);
    userSession.language === 1
      ? twiml.message(
          `👋 ${userSession.customerName} !مرحباً\n\n` +
            `❌ اختيار خاطئ. يُرجى الرد برقم من ١ إلى ٥.\n\n` +
            `1️⃣ عرض معلومات الحساب\n` +
            `2️⃣ إعادة الشحن عبر القسيمة\n` +
            `3️⃣ التحقق من الرصيد\n` +
            `4️⃣ تغيير خطة الخدمة\n` +
            `5️⃣ يدعم\n\n` +
            `أجب برقم (1 ~ 5) للاستمرار`
        )
      : twiml.message(
          `👋 Welcome ${userSession.customerName}!\n\n` +
            `Please choose an option by replying with the number:\n` +
            `1️⃣ View account information\n` +
            `2️⃣ Recharge via voucher\n` +
            `3️⃣ Check balance\n` +
            `4️⃣ Change service plan\n` +
            `5️⃣ Support & Auto-Replies\n\n` +
            `Reply with a number (1-5) to continue.`
        );
    return;
  }

  static async handleMenuSelection(
    twiml,
    senderNumber,
    userMessage,
    userSession
  ) {
    const selection = userMessage.trim();

    if (
      selection.toLowerCase() === "menu" ||
      selection.toLowerCase() === "قائمة طعام"
    ) {
      userSession.state = "awaiting_selection";
      await WhatsappBot.handleInitialMessage(
        twiml,
        senderNumber,
        userMessage,
        userSession
      );
      return;
    }

    if (!MENU_OPTIONS[selection]) {
      userSession.language === 1
        ? twiml.message(
            `❌ اختيار خاطئ. يُرجى الرد برقم من ١ إلى ٥.\n\n` +
              `1️⃣ عرض معلومات الحساب\n` +
              `2️⃣ إعادة الشحن عبر القسيمة\n` +
              `3️⃣ التحقق من الرصيد\n` +
              `4️⃣ تغيير خطة الخدمة\n` +
              `5️⃣ يدعم\n\n` +
              `اكتب "القائمة" لرؤية الخيارات مرة أخرى.`
          )
        : twiml.message(
            `❌ Invalid selection. Please reply with a number from 1 to 5.\n\n` +
              `1️⃣ View account information\n` +
              `2️⃣ Recharge via voucher\n` +
              `3️⃣ Check balance\n` +
              `4️⃣ Change service plan\n` +
              `5️⃣ Support & Auto-Replies\n\n` +
              `Type 'menu' to see options again.`
          );
      return;
    }

    const selectedOption = MENU_OPTIONS[selection];

    switch (selectedOption) {
      case "account_info":
        await WhatsappBot.handleAccountInfo(twiml, userSession);
        userSession.state = "awaiting_selection"; // Reset to main menu
        break;

      case "recharge_voucher":
        twiml.message(
          `🎫 Voucher Recharge\n\n` + `Please enter your voucher code:`
        );
        userSession.state = "awaiting_voucher";
        break;

      case "check_balance":
        await WhatsappBot.handleCheckBalance(twiml, userSession);
        userSession.state = "awaiting_selection"; // Reset to main menu
        break;

      case "change_plan":
        await WhatsappBot.handleChangePlan(twiml, userSession);
        userSession.state = "awaiting_plan_selection";
        break;

      case "support":
        await WhatsappBot.handleSupport(twiml, userSession);
        userSession.state = "support";
        break;
    }
  }

  static async handleAccountInfo(twiml, userSession) {
    // Replace with actual customer data retrieval
    const customer = await customerById(userSession.customerId);

    if (customer) {
      userSession.language === 1
        ? twiml.message(
            `📋 معلومات الحساب\n\n` +
              `👤 ${customer.name || "غير متوفر"} :اسم المستخدم\n` +
              `📦 ${customer.plan || "مدفوع مسبقًا (مخصص)"} الخطة الحالية:\n` +
              `✨ ${customer.expire} تاريخ انتهاء الصلاحية:\n` +
              `📈 ${customer.speed} MB سرعة:\n` +
              `💰 ${customer.balance || "0.00"} الرصيد: $\n` +
              `🧶 ${customer.status} حالة:\n` +
              `📊 استخدام البيانات: ${customer.dataUsage || "0"} جيجابايت / ${customer.dataLimit || "غير محدود"} جيجابايت \n`+
              `اكتب "القائمة" للعودة إلى القائمة الرئيسية.`
          )
        : twiml.message(
            `📋 Account Information\n\n` +
              `👤 UserName: ${customer.name || "N/A"}\n` +
              `📦 Current Plan: ${customer.plan || "Prepaid(custom)"}\n` +
              `✨ Expiry Date: ${customer.expire}\n` +
              `📈 Speed: ${customer.id} MB\n` +
              `💰 Balance: LYD ${customer.balance || "0.00"}\n` +
              `🧶 Status: ${customer.status}\n` +
              `📊 Data Usage: ${customer.dataUsage || "0"} GB / ${customer.dataLimit || "Unlimited"} GB \n` +
              `Type 'menu' to return to main menu.`
          );
    } else {
      userSession.language === 1
        ? twiml.message(
            `❌ تعذر استرداد معلومات الحساب. يُرجى التواصل مع الدعم.\n\n` +
              `اكتب 'menu' للعودة إلى القائمة الرئيسية.`
          )
        : twiml.message(
            `❌ Could not retrieve account information. Please contact support.\n\n` +
              `Type 'menu' to return to main menu.`
          );
    }
  }

  static async handleVoucherInput(
    twiml,
    senderNumber,
    voucherCode,
    userSession
  ) {
    if (
      voucherCode.toLowerCase() === "menu" ||
      voucherCode.toLowerCase() === "قائمة طعام"
    ) {
      userSession.state = "awaiting_selection";
      await WhatsappBot.handleInitialMessage(
        twiml,
        senderNumber,
        userMessage,
        userSession
      );
      return;
    }

    // Validate and process voucher (implement your voucher logic here)
    const isValidVoucher = await WhatsappBot.validateVoucher(voucherCode, userSession.customerId);

    if (isValidVoucher) {
      userSession.language === 1
        ? twiml.message(
            `✅ تم تطبيق القسيمة بنجاح!\n\n` +
              `🎫 ${voucherCode} رمز القسيمة:\n` +
              `💰 المبلغ: 10.00 دولارًا\n` +
              `📊 نيو بالانس: 25.00 دولارًا\n\n` +
              `اكتب "القائمة" للعودة إلى القائمة الرئيسية.`
          )
        : twiml.message(
            `✅ Voucher Applied Successfully!\n\n` +
              `🎫 Voucher Code: ${voucherCode}\n` +
              `💰 Amount: $10.00\n` +
              `📊 New Balance: $25.00\n\n` +
              `Type 'menu' to return to main menu.`
          );
    } else {
      userSession.language === 1
        ? twiml.message(
            `${voucherCode} ❌ رمز قسيمة غير صالح:\n\n` +
              `يرجى التحقق من الكود ومحاولة مرة أخرى، أو اكتب "القائمة" للعودة إلى القائمة الرئيسية.`
          )
        : twiml.message(
            `❌ Invalid voucher code: ${voucherCode}\n\n` +
              `Please check the code and try again, or type 'menu' to return to main menu.`
          );
      return; // Stay in voucher input state
    }

    userSession.state = "awaiting_voucher";
  }

  static async handleCheckBalance(twiml, userSession) {
    const customer = await customerById(userSession.customerId);

    if (customer) {
      userSession.language === 1
        ? twiml.message(
            `💰 معلومات الرصيد\n\n` +
              `${customer.balance || "0.00"} الرصيد الحالي: $\n` +
              `آخر عملية شحن: ${customer.lastRecharge || "N/A"}\n` +
              `${
                customer.nextBillDate || "غير متوفر"
              } تاريخ الفاتورة القادمة:\n\n` +
              `اكتب "قائمة" للعودة إلى القائمة الرئيسية.`
          )
        : twiml.message(
            `💰 Balance Information\n\n` +
              `Current Balance: LYD ${customer.balance || "0.00"}\n` +
              `Last Recharge: ${customer.lastRecharge || "N/A"}\n` +
              `Next Bill Date: ${customer.nextBillDate || "N/A"}\n\n` +
              `Type 'menu' to return to main menu.`
          );
    } else {
      userSession.language === 1
        ? twiml.message(
            `❌ لم يتمكن من استرجاع معلومات الرصيد.\n\n` +
              `اكتب "قائمة" للعودة إلى القائمة الرئيسية.`
          )
        : twiml.message(
            `❌ Could not retrieve balance information.\n\n` +
              `Type 'menu' to return to main menu.`
          );
    }
  }

  static async handleChangePlan(twiml, userSession) {
    userSession.language === 1
      ? twiml.message(
          `📶 خطط الخدمة المتاحة\n\n` +
            `1️⃣ الخطة الأساسية - 10 دولارات أمريكية شهريًا (1 جيجابايت)\n` +
            `2️⃣ الخطة القياسية - 20 دولارًا أمريكيًا شهريًا (5 جيجابايت)\n` +
            `3️⃣ الخطة المميزة - 30 دولارًا أمريكيًا شهريًا (غير محدودة)\n` +
            `4️⃣ خطة المؤسسة - 50 دولارًا أمريكيًا شهريًا (غير محدود + أولوية)\n\n` +
            `قم بالرد برقم الخطة (1-4) أو اكتب "القائمة" للعودة.`
        )
      : twiml.message(
          `📶 Available Service Plans\n\n` +
            `1️⃣ Basic Plan - $10/month (1GB)\n` +
            `2️⃣ Standard Plan - $20/month (5GB)\n` +
            `3️⃣ Premium Plan - $30/month (Unlimited)\n` +
            `4️⃣ Enterprise Plan - $50/month (Unlimited + Priority)\n\n` +
            `Reply with the plan number (1-4) or type 'menu' to return.`
        );
  }

  static async handlePlanSelection(
    twiml,
    senderNumber,
    selection,
    userSession
  ) {
    if (
      selection.toLowerCase() === "menu" ||
      selection.toLowerCase() === "قائمة طعام"
    ) {
      userSession.state = "awaiting_selection";
      await WhatsappBot.handleInitialMessage(
        twiml,
        senderNumber,
        userMessage,
        userSession
      );
      return;
    }

    const planMap =
      userSession.language === 1
        ? {
            1: "الخطة الأساسية - 10 دنانير ليبية/شهريًا (1 جيجابايت)",
            2: "الخطة القياسية - 20 دينار ليبي/الشهر (5 جيجابايت)",
            3: "الخطة المميزة - 30 دينار ليبي شهريًا (غير محدودة)",
            4: "خطة المؤسسة - 0 دينار ليبي/الشهر (غير محدود + أولوية)",
          }
        : {
            1: "Basic Plan - LYD 10/month (1GB)",
            2: "Standard Plan - LYD 20/month (5GB)",
            3: "Premium Plan - LYD 30/month (Unlimited)",
            4: "Enterprise Plan - LYD 0/month (Unlimited + Priority)",
          };
    if (planMap[selection]) {
      // Implement plan change logic here
      userSession.language === 1
        ? twiml.message(
            `✅ تم تقديم طلب تغيير الخطة\n\n` +
              `📦 ${planMap[selection]}خطة جديدة:\n` +
              `📅 تاريخ السريان: دورة الفوترة التالية\n` +
              `📧 سيتم إرسال التأكيد عبر البريد الإلكتروني.\n\n` +
              `اكتب "قائمة" للعودة إلى القائمة الرئيسية.`
          )
        : twiml.message(
            `✅ Plan Change Request Submitted\n\n` +
              `📦 New Plan: ${planMap[selection]}\n` +
              `📅 Effective Date: Next billing cycle\n` +
              `📧 Confirmation will be sent via email.\n\n` +
              `Type 'menu' to return to main menu.`
          );
      userSession.state = "awaiting_selection";
    } else {
      userSession.language === 1
        ? twiml.message(
            `اختيار الخطة غير صحيح. يُرجى اختيار 1-4 أو كتابة "قائمة" للرجوع.`
          )
        : twiml.message(
            `❌ Invalid plan selection. Please choose 1-4 or type 'menu' to return.`
          );
    }
  }

  static async handleSupport(twiml, userSession) {
    userSession.language === 1
      ? twiml.message(
          `📞 معلومات الدعم\n\n` +
            `📧 Email: support@yourcompany.com\n` +
            `📞 Phone: +1-800-XXX-XXXX\n` +
            `🕒 Hours: Mon-Fri 9AM-6PM\n` +
            `💬 Live Chat: متوفر على موقعنا\n\n` +
            `في حالة وجود أي مشكلة طارئة، يرجى الاتصال بخط الدعم الخاص بنا.\n` +
            `إذا كنت بحاجة إلى تغيير اللغة، يرجى كتابة الرقم 0 أو 1 \n.` +
            `مثال: 0-الإنجليزية، 1-العربية \n` +
            `اكتب "قائمة" للعودة إلى القائمة الرئيسية.`
        )
      : twiml.message(
          `📞 Support Information\n\n` +
            `📧 Email: support@yourcompany.com\n` +
            `📞 Phone: +1-800-XXX-XXXX\n` +
            `🕒 Hours: Mon-Fri 9AM-6PM\n` +
            `💬 Live Chat: Available on our website\n\n` +
            `For urgent issues, please call our support line.\n` +
            `If you need to change language, please type number 0 or 1 \n.` +
            `ex: 0-english, 1-arabic \n` +
            `Type 'menu' to return to main menu.`
        );
    userSession.state = "support";
  }

  static async validateVoucher(voucherCode,customerId) {
    // Implement your voucher validation logic here
    // WhatsappBot is just a placeholder
    return voucherCode.length >= 6 && voucherCode.length <= 12;
  }

  static async changeLanguage(twiml, senderNumber, userMessage, userSession) {
    const message = userMessage.trim();
    console.log("support message", message, typeof message);
    const clang = message === 0 ? "English" : "Arabic";
    userSession.language === "0"
      ? twiml.message(
          `Lanauage is changed to ${clang} \n` +
            `Type 'menu' to return to main menu.`
        )
      : twiml.message(
          `تم تغيير اللغة إلى ${clang} \n` +
            `اكتب "القائمة" للعودة إلى القائمة الرئيسية.`
        );
    userSession.language = message === "0" ? 0 : 1;
    userSession.state = "awaiting_selection";
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
