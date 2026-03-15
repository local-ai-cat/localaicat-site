import { Environment, Paddle } from "@paddle/paddle-node-sdk";
import { getPaddleEnvironment } from "./env";

let paddleClient: Paddle | null = null;

function getPaddleApiKey() {
  const apiKey = process.env.PADDLE_API_KEY;

  if (!apiKey) {
    throw new Error("Missing PADDLE_API_KEY");
  }

  return apiKey;
}

export function getPaddleClient() {
  if (!paddleClient) {
    paddleClient = new Paddle(getPaddleApiKey(), {
      environment:
        getPaddleEnvironment() === "production"
          ? Environment.production
          : Environment.sandbox
    });
  }

  return paddleClient;
}

export function getPaddleWebhookSecret() {
  const secret = process.env.PADDLE_WEBHOOK_SECRET;

  if (!secret) {
    throw new Error("Missing PADDLE_WEBHOOK_SECRET");
  }

  return secret;
}

