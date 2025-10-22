import Stripe from "stripe";

const secret = process.env.STRIPE_SECRET_KEY;
if (!secret) {
  throw new Error("Missing STRIPE_SECRET_KEY env var");
}

// Use the latest stable API version supported by the SDK
export const stripe = new Stripe(secret, {
  apiVersion: "2024-06-20",
});

