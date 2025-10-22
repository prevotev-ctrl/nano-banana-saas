import Stripe from "stripe";

let cachedStripe = null;

export function getStripe() {
  if (cachedStripe) return cachedStripe;
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    throw new Error("Missing STRIPE_SECRET_KEY env var");
  }
  cachedStripe = new Stripe(secret, { apiVersion: "2024-06-20" });
  return cachedStripe;
}
