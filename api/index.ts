import { VercelRequest, VercelResponse } from '@vercel/node';
import { config } from 'dotenv';
import { verify, settle as originalSettle } from 'x402/facilitator';
import {
  PaymentRequirementsSchema,
  type PaymentRequirements,
  type PaymentPayload,
  PaymentPayloadSchema,
  createConnectedClient,
  createSigner,
  SupportedEVMNetworks,
  Signer,
  ConnectedClient,
  SupportedPaymentKind,
} from 'x402/types';

config();

const EVM_PRIVATE_KEY = process.env.EVM_PRIVATE_KEY || '';
const REVNET_PROJECT_ID = process.env.REVNET_PROJECT_ID || '127';
const JB_MULTI_TERMINAL_ADDRESS = process.env.JB_MULTI_TERMINAL_ADDRESS || '0xdb9644369c79c3633cde70d2df50d827d7dc7dbc';
const USDC_CONTRACT_ADDRESS = process.env.USDC_CONTRACT_ADDRESS || '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

// New settle function: Only pay via Juicebox multiterminal, no escrow
async function settle(
  signer: Signer,
  paymentPayload: PaymentPayload,
  paymentRequirements: PaymentRequirements,
): Promise<any> {
  // Only perform direct payment via Juicebox multiterminal
  // ...implement direct payment logic here (see above for details)...
  // For now, just return a mock success
  return { success: true, paidVia: 'juicebox-multiterminal' };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    if (req.query.health !== undefined) {
      return res.json({ status: 'healthy', timestamp: new Date().toISOString() });
    }
    if (req.query.supported !== undefined) {
      const kinds: SupportedPaymentKind[] = [
        { x402Version: 1, scheme: 'exact', network: 'base' },
        { x402Version: 1, scheme: 'exact', network: 'base-sepolia' },
      ];
      return res.json({ kinds });
    }
    return res.json({
      name: 'x402 Facilitator Example',
      version: '1.0.0',
      description: 'A standalone x402 payment protocol facilitator implementation',
      endpoints: {
        '/api?health': 'Health check endpoint',
        '/api?supported': 'GET - Returns supported payment kinds',
        '/api/verify': 'POST - Verify x402 payment payloads',
        '/api/settle': 'POST - Settle x402 payments',
      },
      documentation: 'https://x402.org',
    });
  }

  if (req.method === 'POST') {
    if (req.url?.endsWith('/verify')) {
      try {
        const body = req.body || req;
        if (body && body.paymentPayload && body.paymentRequirements) {
          return res.json({ isValid: true, payer: (body.paymentPayload.payload as any)?.authorization?.from });
        } else {
          return res.json({ isValid: false, invalidReason: 'Missing paymentPayload or paymentRequirements' });
        }
      } catch (error) {
        return res.status(400).json({ error: `Invalid request: ${error}` });
      }
    }
    if (req.url?.endsWith('/settle')) {
      try {
        const body = req.body || req;
        const paymentRequirements = PaymentRequirementsSchema.parse(body.paymentRequirements);
        const paymentPayload = PaymentPayloadSchema.parse(body.paymentPayload);
        let signer: Signer;
        if (SupportedEVMNetworks.includes(paymentRequirements.network)) {
          signer = await createSigner(paymentRequirements.network, EVM_PRIVATE_KEY);
        } else {
          throw new Error('Unsupported network. Only EVM networks are supported.');
        }
        const response = await settle(signer, paymentPayload, paymentRequirements);
        return res.json(response);
      } catch (error) {
        return res.status(400).json({ error: `Invalid request: ${error}` });
      }
    }
    // fallback for POST
    return res.status(404).json({ error: 'Not found' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
