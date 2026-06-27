import Customer from '../models/Customer.js';
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'multimaart_secret_token_123';
const WHATSAPP_API_TOKEN = process.env.WHATSAPP_API_TOKEN;
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

// Helper function to send interactive message
const sendInteractiveMessage = async (recipientPhone) => {
  if (!WHATSAPP_API_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
    console.error("WhatsApp API Token or Phone Number ID is missing in ENV.");
    return;
  }

  const url = `https://graph.facebook.com/v17.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
  
  const data = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: recipientPhone,
    type: "interactive",
    interactive: {
      type: "button",
      body: {
        text: "Welcome to Multi Mart! Please select your interest so we can assist you better:"
      },
      action: {
        buttons: [
          {
            type: "reply",
            reply: {
              id: "SELLER",
              title: "Seller"
            }
          },
          {
            type: "reply",
            reply: {
              id: "DISTRICT_PARTNER",
              title: "District Partner"
            }
          },
          {
            type: "reply",
            reply: {
              id: "PROFILE_INQUIRY",
              title: "Profile Inquiry"
            }
          }
        ]
      }
    }
  };

  try {
    await axios.post(url, data, {
      headers: {
        'Authorization': `Bearer ${WHATSAPP_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error("Error sending WhatsApp message:", error.response?.data || error.message);
  }
};

// @desc    Verify Webhook
// @route   GET /api/whatsapp/webhook
// @access  Public
export const verifyWebhook = (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  } else {
    res.sendStatus(400);
  }
};

// @desc    Receive WhatsApp Messages
// @route   POST /api/whatsapp/webhook
// @access  Public
export const receiveMessage = async (req, res) => {
  try {
    const body = req.body;

    if (body.object) {
      if (
        body.entry &&
        body.entry[0].changes &&
        body.entry[0].changes[0].value.messages &&
        body.entry[0].changes[0].value.messages[0]
      ) {
        const message = body.entry[0].changes[0].value.messages[0];
        const senderPhone = message.from;
        
        let customerName = "WhatsApp User";
        if (body.entry[0].changes[0].value.contacts && body.entry[0].changes[0].value.contacts[0]) {
            customerName = body.entry[0].changes[0].value.contacts[0].profile.name;
        }

        // 1. If it's a simple text message, send the menu
        if (message.type === 'text') {
            await sendInteractiveMessage(senderPhone);
        }
        
        // 2. If it's a button reply, process the response and save to DB
        if (message.type === 'interactive' && message.interactive.type === 'button_reply') {
            const buttonId = message.interactive.button_reply.id;
            let onboardingType = '';
            
            if (buttonId === 'SELLER') onboardingType = 'Seller';
            else if (buttonId === 'DISTRICT_PARTNER') onboardingType = 'District Partner';
            else if (buttonId === 'PROFILE_INQUIRY') onboardingType = 'Profile Inquiry';
            
            if (onboardingType) {
                // Check if customer already exists based on phone
                let customer = await Customer.findOne({ phone: senderPhone });
                
                if (!customer) {
                    // Get highest customer ID
                    const allCustomers = await Customer.find({}, 'customerId').lean();
                    let maxCount = 0;
                    for (const c of allCustomers) {
                      if (c.customerId) {
                        const match = c.customerId.match(/-(\d+)$/);
                        if (match) {
                          const num = parseInt(match[1], 10);
                          if (num > maxCount) maxCount = num;
                        }
                      }
                    }
                    const finalId = `cus-${String(maxCount + 1).padStart(3, '0')}`;

                    // Create new customer/lead
                    customer = await Customer.create({
                        customerId: finalId,
                        name: customerName,
                        phone: senderPhone,
                        onboarding: onboardingType,
                        status: 'Pending', // Using Pending as it is valid enum
                        notes: 'Captured via WhatsApp Auto-reply',
                        sourceFile: 'WhatsApp API'
                    });
                    console.log(`Saved new WhatsApp lead: ${senderPhone}`);
                } else {
                    // Update existing
                    customer.onboarding = onboardingType;
                    customer.status = 'Pending';
                    customer.notes = customer.notes ? `${customer.notes} | Interacted via WhatsApp` : 'Interacted via WhatsApp';
                    await customer.save();
                    console.log(`Updated existing WhatsApp lead: ${senderPhone}`);
                }
                
                // Send a confirmation message
                const url = `https://graph.facebook.com/v17.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
                await axios.post(url, {
                    messaging_product: "whatsapp",
                    to: senderPhone,
                    text: { body: `Thank you! We have noted your interest as a ${onboardingType}. Our team will contact you shortly.` }
                }, {
                    headers: { 'Authorization': `Bearer ${WHATSAPP_API_TOKEN}` }
                }).catch(err => console.error("Error sending confirmation:", err.message));
            }
        }
      }
      res.sendStatus(200);
    } else {
      res.sendStatus(404);
    }
  } catch (error) {
    console.error("Webhook processing error:", error);
    res.sendStatus(500);
  }
};
