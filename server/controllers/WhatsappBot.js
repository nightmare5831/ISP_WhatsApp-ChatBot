import twilio from "twilio";
import { customerByPhone, customerById,customerByIdPassword } from "../utills/service";
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

    console.log("User message:", userMessage);
    try {
      // await testLoginEndpoints()
      let userSession = userSessions.get(senderNumber) || {
        state: "initial",
        lastActivity: Date.now(),
      };

      if (Date.now() - userSession.lastActivity > 30 * 60 * 1000) {
        userSession = { state: "initial", lastActivity: Date.now() };
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
      twiml.message(
        "❌ Sorry, there was an error processing your request. Please try again later."
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
      twiml.message(
        `${senderNumber} مرحبًا، لم نتمكن من العثور على حسابك بالرقم.\n` +
        `الرجاء إدخال 👤 معرف العميل و 🔑 تسجيل الدخول إلى البوابة، أو 📞 الاتصال بالدعم.\n`+
        `مثال: 9557 4001360932\n\n`
      );
      return;
    }
    if (!userSession.customerId) {
      userSession.customerId = customer.id
      userSession.customerName = customer.name || "Customer";
    };
    userSession.state = "awaiting_selection";
    twiml.message(
      `👋 ${userSession.customerName} !مرحباً\n\n` +
        `الرجاء اختيار أحد الخيارات عن طريق الرد بالرقم:\n` +
        `📋 عرض معلومات الحساب واستخدام البيانات\n` +
        `🎫 إعادة الشحن عبر القسيمة\n` +
        `💰 التحقق من الرصيد\n` +
        `📶 تغيير خطة الخدمة\n` +
        `📞 الدعم والردود التلقائية\n\n` +
        `أجب برقم (1 ~ 5) للاستمرار`
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

    if (selection.toLowerCase() === "menu") {
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
      twiml.message(
        `❌ اختيار خاطئ. يُرجى الرد برقم من ١ إلى ٥.\n\n` +
          `1️⃣ عرض معلومات الحساب\n` +
          `2️⃣ إعادة الشحن عبر القسيمة\n` +
          `3️⃣ التحقق من الرصيد\n` +
          `4️⃣ تغيير خطة الخدمة\n` +
          `5️⃣ يدعم\n\n` +
          `اكتب "القائمة" لرؤية الخيارات مرة أخرى.`
      );
      return;
    }

    const selectedOption = MENU_OPTIONS[selection];

    switch (selectedOption) {
      case "account_info":
        await WhatsappBot.handleAccountInfo(twiml, userSession.customerId);
        userSession.state = "awaiting_selection"; // Reset to main menu
        break;

      case "recharge_voucher":
        twiml.message(
          `🎫 Voucher Recharge\n\n` + `Please enter your voucher code:`
        );
        userSession.state = "awaiting_voucher";
        break;

      case "check_balance":
        await WhatsappBot.handleCheckBalance(twiml, userSession.customerId);
        userSession.state = "awaiting_selection"; // Reset to main menu
        break;

      case "change_plan":
        await WhatsappBot.handleChangePlan(twiml, userSession.customerId);
        userSession.state = "awaiting_plan_selection";
        break;

      case "support":
        await WhatsappBot.handleSupport(twiml, userSession.customerId);
        userSession.state = "initial"; // Reset to main menu
        break;
    }
  }

  static async handleAccountInfo(twiml, customerId) {
    // Replace with actual customer data retrieval
    const customer = await customerById(customerId);

    if (customer) {
      twiml.message(
        `📋 معلومات الحساب\n\n` +
        `👤 ${customer.name || "غير متوفر"} :اسم المستخدم\n` +
        `📦 ${customer.plan || "مدفوع مسبقًا (مخصص)"} الخطة الحالية:\n` +
        `✨ ${customer.expire} تاريخ انتهاء الصلاحية:\n` +
        `🎉 ${customer.speed} سرعة:\n` +
        `💰 ${customer.balance || "0.00"} الرصيد: $\n` +
        `🧶 ${customer.status} حالة:\n` +
        `📊${customer.dataUsage || "0 MB"} استخدام البيانات:/ ${
          customer.dataLimit || "غير محدود"
        }\n` +
        `اكتب "القائمة" للعودة إلى القائمة الرئيسية.`
      );
    } else {
      twiml.message(
        `❌ تعذر استرداد معلومات الحساب. يُرجى التواصل مع الدعم.\n\n` +
         `اكتب 'menu' للعودة إلى القائمة الرئيسية.`
      );
    }
  }

  static async handleVoucherInput(
    twiml,
    senderNumber,
    voucherCode,
    userSession
  ) {
    if (voucherCode.toLowerCase() === "menu") {
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
    const isValidVoucher = await WhatsappBot.validateVoucher(voucherCode);

    if (isValidVoucher) {
      twiml.message(
        `✅ تم تطبيق القسيمة بنجاح!\n\n` +
          `🎫 ${voucherCode} رمز القسيمة:\n` +
          `💰 المبلغ: 10.00 دولارًا\n` +
          `📊 نيو بالانس: 25.00 دولارًا\n\n` +
          `اكتب "القائمة" للعودة إلى القائمة الرئيسية.`
      );
    } else {
      twiml.message(
        `${voucherCode} ❌ رمز قسيمة غير صالح:\n\n` +
          `يرجى التحقق من الكود ومحاولة مرة أخرى، أو اكتب "القائمة" للعودة إلى القائمة الرئيسية.`
      );
      return; // Stay in voucher input state
    }

    userSession.state = "awaiting_voucher";
  }

  static async handleCheckBalance(twiml, customerId) {
    const customer = await customerById(customerId);

    if (customer) {
      twiml.message(
        `💰 معلومات الرصيد\n\n` +
          `${customer.balance || "0.00"} الرصيد الحالي: $\n` +
          `${customer.lastRecharge || "غير متوفر"} آخر شحن:\n` +
          `${customer.nextBillDate || "غير متوفر"} تاريخ الفاتورة القادمة:\n\n` +
          `اكتب "قائمة" للعودة إلى القائمة الرئيسية.`
      );
    } else {
      twiml.message(
        `❌ لم يتمكن من استرجاع معلومات الرصيد.\n\n` +
          `اكتب "قائمة" للعودة إلى القائمة الرئيسية.`
      );
    }
  }

  static async handleChangePlan(twiml, customerId) {
    twiml.message(
      `📶 خطط الخدمة المتاحة\n\n` +
        `1️⃣ الخطة الأساسية - 10 دولارات أمريكية شهريًا (1 جيجابايت)\n` +
        `2️⃣ الخطة القياسية - 20 دولارًا أمريكيًا شهريًا (5 جيجابايت)\n` +
        `3️⃣ الخطة المميزة - 30 دولارًا أمريكيًا شهريًا (غير محدودة)\n` +
        `4️⃣ خطة المؤسسة - 50 دولارًا أمريكيًا شهريًا (غير محدود + أولوية)\n\n` +
        `قم بالرد برقم الخطة (1-4) أو اكتب "القائمة" للعودة.`
    );
  }

  static async handlePlanSelection(
    twiml,
    senderNumber,
    selection,
    userSession
  ) {
    if (selection.toLowerCase() === "menu") {
      userSession.state = "awaiting_selection";
      await WhatsappBot.handleInitialMessage(
        twiml,
        senderNumber,
        userMessage,
        userSession
      );
      return;
    }

    const planMap = {
      1: "الخطة الأساسية - 10 دولارات أمريكية شهريًا (1 جيجابايت)",
      2: "الخطة القياسية - 20 دولارًا أمريكيًا شهريًا (5 جيجابايت)",
      3: "الخطة المميزة - 30 دولارًا أمريكيًا شهريًا (غير محدودة)",
      4: "خطة المؤسسة - 50 دولارًا أمريكيًا شهريًا (غير محدود + أولوية)",
    };

    if (planMap[selection]) {
      // Implement plan change logic here
      twiml.message(
        `✅ تم تقديم طلب تغيير الخطة\n\n` +
          `📦 ${planMap[selection]}خطة جديدة:\n` +
          `📅 تاريخ السريان: دورة الفوترة التالية\n` +
          `📧 سيتم إرسال التأكيد عبر البريد الإلكتروني.\n\n` +
          `اكتب "قائمة" للعودة إلى القائمة الرئيسية.`
      );
      userSession.state = "awaiting_selection";
    } else {
      twiml.message(
        `اختيار الخطة غير صحيح. يُرجى اختيار 1-4 أو كتابة "قائمة" للرجوع.`
      );
    }
  }

  static async handleSupport(twiml, customerId) {
    twiml.message(
      `📞 معلومات الدعم\n\n` +
        `📧 Email: support@yourcompany.com\n` +
        `📞 Phone: +1-800-XXX-XXXX\n` +
        `🕒 Hours: Mon-Fri 9AM-6PM\n` +
        `💬 Live Chat: متوفر على موقعنا\n\n` +
        `في حالة وجود أي مشكلة طارئة، يرجى الاتصال بخط الدعم الخاص بنا.\n\n` +
        `اكتب "قائمة" للعودة إلى القائمة الرئيسية.`
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
