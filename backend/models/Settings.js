import mongoose from 'mongoose';

const settingsSchema = mongoose.Schema(
  {
    sellerScript: {
      type: String,
      default: "Hello {Name}, I am calling from Multi Maart regarding our exclusive Seller onboarding program. Am I speaking with {Name} from {Company}?\n\nMulti Maart is India's fastest growing B2B marketplace. By onboarding {Company} as a Seller, you get access to thousands of wholesale buyers across the country.\n\nWe charge ZERO commission on your first 100 orders! Sellers in your category have seen a 50% increase in sales within the first month.\n\nQ: Is there any registration fee?\n→ No, seller registration is absolutely free.\n\nShall I send you the Seller Registration link on WhatsApp right now so you can create your free catalog?",
    },
    districtPartnerScript: {
      type: String,
      default: "Hello {Name}, I am calling from Multi Maart regarding our District Partner franchise opportunity. Am I speaking with {Name} from {Company}?\n\nWe are appointing exclusive District Partners to lead Multi Maart's expansion. As a partner, you will earn a percentage of ALL transactions happening in your district.\n\nThis is a highly lucrative monopoly business model. Once you secure your district, no one else can take the franchise there, guaranteeing you long-term passive income.\n\nQ: What is the investment?\n→ The franchise fee depends on the district tier, starting from just ₹50,000.\n\nShall I share the official District Partner pitch deck on your WhatsApp so you can review the ROI projections?",
    }
  },
  {
    timestamps: true,
  }
);

const Settings = mongoose.model('Settings', settingsSchema);

export default Settings;
