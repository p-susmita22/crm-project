import Customer from '../models/Customer.js';
import WhatsAppMessage from '../models/WhatsAppMessage.js';
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
        text: `🌟 Welcome to Multimaart! 🌟\n🙏 A Heartfelt Welcome from the Multimaart Family!\n\nThank you for reaching out to us. We are truly delighted to connect with you and sincerely appreciate your interest in becoming a part of the Multimaart family.\n\nPlease select your interest so we can assist you better:`
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
    const response = await axios.post(url, data, {
      headers: {
        'Authorization': `Bearer ${WHATSAPP_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    // Log outbound message
    if (response.data && response.data.messages && response.data.messages[0]) {
      await WhatsAppMessage.create({
        customerPhone: recipientPhone,
        messageId: response.data.messages[0].id,
        direction: 'outbound',
        type: 'interactive',
        content: data.interactive.body.text,
        status: 'sent'
      });
    }
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

        // Check for existing customer to manage state
        let customer = await Customer.findOne({ phone: senderPhone });

        // Log inbound message
        await WhatsAppMessage.create({
          customerPhone: senderPhone,
          messageId: message.id,
          direction: 'inbound',
          type: message.type,
          content: message.type === 'text' ? message.text.body : (message.type === 'interactive' ? message.interactive.button_reply.title : 'Media/Other'),
          status: 'received'
        });

        // 1. If it's a simple text message, send the menu or process state
        if (message.type === 'text') {
            const textContent = message.text.body.trim();
            
            // If they are a District Partner and haven't given a district yet, they are answering the district question
            if (customer && customer.onboarding === 'District Partner' && (!customer.district || customer.district === '')) {
                customer.district = textContent;
                await customer.save();

                // Ask if they are interested in the franchise
                const url = `https://graph.facebook.com/v17.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
                const data = {
                    messaging_product: "whatsapp",
                    recipient_type: "individual",
                    to: senderPhone,
                    type: "interactive",
                    interactive: {
                        type: "button",
                        body: { text: "District Partner franchise is investable. Are you interested?" },
                        action: {
                            buttons: [
                                { type: "reply", reply: { id: "DP_INTERESTED_YES", title: "Yes" } },
                                { type: "reply", reply: { id: "DP_INTERESTED_NO", title: "No" } }
                            ]
                        }
                    }
                };

                try {
                    const response = await axios.post(url, data, {
                        headers: { 'Authorization': `Bearer ${WHATSAPP_API_TOKEN}`, 'Content-Type': 'application/json' }
                    });
                    if (response.data && response.data.messages && response.data.messages[0]) {
                        await WhatsAppMessage.create({
                            customerPhone: senderPhone,
                            messageId: response.data.messages[0].id,
                            direction: 'outbound',
                            type: 'interactive',
                            content: data.interactive.body.text,
                            status: 'sent'
                        });
                    }
                } catch (e) {
                    console.error("Error sending Yes button", e.message);
                }
            } else {
                await sendInteractiveMessage(senderPhone);
            }
        }
        
        // 2. If it's a button reply, process the response and save to DB
        if (message.type === 'interactive' && message.interactive.type === 'button_reply') {
            const buttonId = message.interactive.button_reply.id;
            
            if (buttonId === 'DP_INTERESTED_YES') {
                if (customer) {
                    customer.status = 'Interested';
                    customer.notes = customer.notes ? `${customer.notes} | Interested in DP` : 'Interested in DP';
                    await customer.save();
                }
                
                // Send final confirmation
                const url = `https://graph.facebook.com/v17.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
                const confText = `Thank you! We have noted your interest as a District Partner. Our team will contact you shortly.`;
                const confRes = await axios.post(url, {
                    messaging_product: "whatsapp",
                    to: senderPhone,
                    text: { body: confText }
                }, {
                    headers: { 'Authorization': `Bearer ${WHATSAPP_API_TOKEN}` }
                }).catch(err => console.error("Error sending confirmation:", err.message));
                
                if (confRes && confRes.data && confRes.data.messages) {
                  await WhatsAppMessage.create({
                    customerPhone: senderPhone,
                    messageId: confRes.data.messages[0].id,
                    direction: 'outbound',
                    type: 'text',
                    content: confText,
                    status: 'sent'
                  });
                }
                return res.sendStatus(200); // Exit early since this is handled
            }

            if (buttonId === 'DP_INTERESTED_NO') {
                if (customer) {
                    customer.status = 'Rejected';
                    customer.notes = customer.notes ? `${customer.notes} | Not interested in DP` : 'Not interested in DP';
                    await customer.save();
                }
                
                // Send final confirmation for No
                const url = `https://graph.facebook.com/v17.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
                const confText = `thank you for contacting multimaart`;
                const confRes = await axios.post(url, {
                    messaging_product: "whatsapp",
                    to: senderPhone,
                    text: { body: confText }
                }, {
                    headers: { 'Authorization': `Bearer ${WHATSAPP_API_TOKEN}` }
                }).catch(err => console.error("Error sending confirmation:", err.message));
                
                if (confRes && confRes.data && confRes.data.messages) {
                  await WhatsAppMessage.create({
                    customerPhone: senderPhone,
                    messageId: confRes.data.messages[0].id,
                    direction: 'outbound',
                    type: 'text',
                    content: confText,
                    status: 'sent'
                  });
                }
                return res.sendStatus(200); // Exit early since this is handled
            }

            let onboardingType = '';
            
            if (buttonId === 'SELLER') onboardingType = 'Seller';
            else if (buttonId === 'DISTRICT_PARTNER') onboardingType = 'District Partner';
            else if (buttonId === 'PROFILE_INQUIRY') onboardingType = 'Profile Inquiry';
            
            if (onboardingType) {
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
                        sourceFile: 'WhatsApp API',
                        district: '' // ensure district is empty
                    });
                    console.log(`Saved new WhatsApp lead: ${senderPhone}`);
                } else {
                    // Update existing
                    customer.onboarding = onboardingType;
                    customer.status = 'Pending';
                    customer.district = ''; // reset district to ask again
                    customer.notes = customer.notes ? `${customer.notes} | Interacted via WhatsApp` : 'Interacted via WhatsApp';
                    await customer.save();
                    console.log(`Updated existing WhatsApp lead: ${senderPhone}`);
                }
                
                if (onboardingType === 'District Partner') {
                    // Send "From which district?"
                    const url = `https://graph.facebook.com/v17.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
                    const askDistrictText = `From which district?`;
                    const confRes = await axios.post(url, {
                        messaging_product: "whatsapp",
                        to: senderPhone,
                        text: { body: askDistrictText }
                    }, {
                        headers: { 'Authorization': `Bearer ${WHATSAPP_API_TOKEN}` }
                    }).catch(err => console.error("Error asking district:", err.message));
                    
                    if (confRes && confRes.data && confRes.data.messages) {
                      await WhatsAppMessage.create({
                        customerPhone: senderPhone,
                        messageId: confRes.data.messages[0].id,
                        direction: 'outbound',
                        type: 'text',
                        content: askDistrictText,
                        status: 'sent'
                      });
                    }
                } else {
                    // Send a confirmation message for Seller and Profile Inquiry
                    const url = `https://graph.facebook.com/v17.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
                    const confText = `Thank you! We have noted your interest as a ${onboardingType}. Our team will contact you shortly.`;
                    const confRes = await axios.post(url, {
                        messaging_product: "whatsapp",
                        to: senderPhone,
                        text: { body: confText }
                    }, {
                        headers: { 'Authorization': `Bearer ${WHATSAPP_API_TOKEN}` }
                    }).catch(err => console.error("Error sending confirmation:", err.message));
                    
                    if (confRes && confRes.data && confRes.data.messages) {
                      await WhatsAppMessage.create({
                        customerPhone: senderPhone,
                        messageId: confRes.data.messages[0].id,
                        direction: 'outbound',
                        type: 'text',
                        content: confText,
                        status: 'sent'
                      });
                    }
                }
            }
        }
      } else if (
        body.entry &&
        body.entry[0].changes &&
        body.entry[0].changes[0].value.statuses &&
        body.entry[0].changes[0].value.statuses[0]
      ) {
        // Handle message status updates (sent, delivered, read)
        const statusObj = body.entry[0].changes[0].value.statuses[0];
        await WhatsAppMessage.findOneAndUpdate(
          { messageId: statusObj.id },
          { status: statusObj.status }
        );
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

// @desc    Get recent chats (group by phone)
// @route   GET /api/whatsapp/chats
// @access  Private (Admin)
export const getChats = async (req, res) => {
  try {
    const chats = await WhatsAppMessage.aggregate([
      { $sort: { timestamp: -1 } },
      {
        $group: {
          _id: "$customerPhone",
          lastMessage: { $first: "$$ROOT" }
        }
      },
      { $sort: { "lastMessage.timestamp": -1 } }
    ]);
    
    // Attach customer names
    const populatedChats = await Promise.all(chats.map(async (chat) => {
      const customer = await Customer.findOne({ phone: chat._id }, 'name status onboarding');
      return {
        phone: chat._id,
        name: customer ? customer.name : 'Unknown',
        onboarding: customer ? customer.onboarding : '',
        status: customer ? customer.status : '',
        lastMessage: chat.lastMessage
      };
    }));
    
    res.json(populatedChats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get chat history for a phone number
// @route   GET /api/whatsapp/chats/:phone
// @access  Private (Admin)
export const getChatHistory = async (req, res) => {
  try {
    const messages = await WhatsAppMessage.find({ customerPhone: req.params.phone })
      .sort({ timestamp: 1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Send manual message via WhatsApp API
// @route   POST /api/whatsapp/chats/:phone/send
// @access  Private (Admin)
export const sendManualMessage = async (req, res) => {
  const { text, type, mediaId, mediaUrl } = req.body;
  const recipientPhone = req.params.phone;

  if (!WHATSAPP_API_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
    return res.status(500).json({ message: "WhatsApp API credentials missing" });
  }

  const url = `https://graph.facebook.com/v17.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
  let data = {
    messaging_product: "whatsapp",
    to: recipientPhone,
    type: type || 'text',
  };

  if ((type === 'document') && (mediaId || mediaUrl)) {
    data.document = mediaId
      ? { id: mediaId, caption: text || '', filename: text || 'document.pdf' }
      : { link: mediaUrl, caption: text || '' };
  } else if ((type === 'image') && (mediaId || mediaUrl)) {
    data.image = mediaId
      ? { id: mediaId, caption: text || '' }
      : { link: mediaUrl, caption: text || '' };
  } else {
    data.text = { body: text };
  }

  try {
    const response = await axios.post(url, data, {
      headers: {
        'Authorization': `Bearer ${WHATSAPP_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.data && response.data.messages && response.data.messages[0]) {
      const savedMessage = await WhatsAppMessage.create({
        customerPhone: recipientPhone,
        messageId: response.data.messages[0].id,
        direction: 'outbound',
        type: type || 'text',
        content: text || 'Media attached',
        mediaUrl: mediaUrl || '',
        status: 'sent'
      });
      res.json(savedMessage);
    } else {
      res.status(400).json({ message: "Failed to send message" });
    }
  } catch (error) {
    console.error("Manual send error:", error.response?.data || error.message);
    res.status(500).json({ message: "Error sending message via API", details: error.response?.data });
  }
};

// @desc    Upload media to Meta servers and get media_id
// @route   POST /api/whatsapp/upload-media
// @access  Private (Admin)
export const uploadMedia = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }
  if (!WHATSAPP_API_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
    return res.status(500).json({ message: 'WhatsApp API credentials missing' });
  }

  try {
    const FormData = (await import('form-data')).default;
    const form = new FormData();
    form.append('file', req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });
    form.append('messaging_product', 'whatsapp');
    form.append('type', req.file.mimetype);

    const uploadUrl = `https://graph.facebook.com/v17.0/${WHATSAPP_PHONE_NUMBER_ID}/media`;
    const response = await axios.post(uploadUrl, form, {
      headers: {
        'Authorization': `Bearer ${WHATSAPP_API_TOKEN}`,
        ...form.getHeaders(),
      },
    });

    res.json({ mediaId: response.data.id, filename: req.file.originalname });
  } catch (error) {
    console.error('Media upload error:', error.response?.data || error.message);
    res.status(500).json({ message: 'Failed to upload media to Meta', details: error.response?.data });
  }
};

// @desc    Delete multiple chats
// @route   DELETE /api/whatsapp/chats
// @access  Private (Admin)
export const deleteChats = async (req, res) => {
  const { phoneNumbers } = req.body;

  if (!phoneNumbers || !Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
    return res.status(400).json({ message: 'No phone numbers provided for deletion' });
  }

  try {
    await WhatsAppMessage.deleteMany({ customerPhone: { $in: phoneNumbers } });
    res.json({ message: 'Chats deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
