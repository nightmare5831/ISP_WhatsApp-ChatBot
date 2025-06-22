import dotenv from "dotenv";
import twilio from "twilio";

dotenv.config();

const { SID: accountSid, KEY: TwilloAuthToken } = process.env;

twilio(accountSid, TwilloAuthToken);
const { MessagingResponse } = twilio.twiml;

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
    console.log('body:', Body);
    if (!From) {
      twiml.message("Please provide a valid phone number.");
      res.set("Content-Type", "text/xml");
      return res.status(400).send(twiml.toString());
    }

    try {
      const serviceData = {
        name: "ISP Service",
        description:
          "We provide high-speed internet services with 24/7 customer support.",
        phoneNumber: From,
      };

      twiml.message(
        `Name: ${serviceData.name}\nDescription: ${serviceData.description}\n Your Number: ${serviceData.phoneNumber}`
      );
      res.set("Content-Type", "text/xml");
      return res.status(200).send(twiml.toString());
    } catch (error) {
      return next(error);
    }
  }
}

export default WhatsappBot;
