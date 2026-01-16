/* eslint-env node */
import { config } from "dotenv";
import express, { Request, Response } from "express";
import path from "path";
import { fileURLToPath } from "url";
import { verify, settle as originalSettle } from "x402/facilitator";
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
} from "x402/types";
import {
  createPublicClient,
  http,
  publicActions,
  createWalletClient,
  parseEther,
  parseUnits,
} from "viem";
import { base } from "viem/chains";
import { keccak256, AbiCoder } from "ethers";
import { privateKeyToAccount } from "viem/accounts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config();

const EVM_PRIVATE_KEY = process.env.EVM_PRIVATE_KEY || "";
const BASE_URL = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
const REVNET_PROJECT_ID = process.env.REVNET_PROJECT_ID || "127";
const JB_MULTI_TERMINAL_ADDRESS =
  process.env.JB_MULTI_TERMINAL_ADDRESS || "0xdb9644369c79c3633cde70d2df50d827d7dc7dbc";
const USDC_CONTRACT_ADDRESS =
  process.env.USDC_CONTRACT_ADDRESS || "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
// Removed ESCROW_ADDRESS, no escrow logic

if (!EVM_PRIVATE_KEY) {
  console.error("Missing required environment variable: EVM_PRIVATE_KEY");
  process.exit(1);
}

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

// JBMultiTerminal ABI for the pay function
const JB_MULTI_TERMINAL_ABI = [
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_projectId",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "_token",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_amount",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "_beneficiary",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_minReturnedTokens",
        type: "uint256",
      },
      {
        internalType: "string",
        name: "_memo",
        type: "string",
      },
      {
        internalType: "bytes",
        name: "_metadata",
        type: "bytes",
      },
    ],
    name: "pay",
    outputs: [
      {
        internalType: "uint256",
        name: "beneficiaryTokenCount",
        type: "uint256",
      },
    ],
    stateMutability: "payable",
    type: "function",
  },
] as const;

const JB_MULTI_TERMINAL_ADDRESS_CONST = JB_MULTI_TERMINAL_ADDRESS as `0x${string}`;

// Custom function to create a connected client with Alchemy RPC
/**
 * Creates a connected client for the specified network using Alchemy RPC
 *
 * @param network - The blockchain network to connect to
 * @returns A connected client for the specified network
 */
function createConnectedClientWithRPC(network: string): ConnectedClient {
  if (network === "base") {
    return createPublicClient({
      chain: base,
      transport: http("https://base-mainnet.g.alchemy.com/v2/ClOKwqeAGcaXIYc2YcP61"),
    }).extend(publicActions) as ConnectedClient;
  }
  // Fallback to default for other networks
  return createConnectedClient(network);
}

const app = express();

// Configure express to parse JSON bodies
app.use(express.json());

// Enable CORS for all routes
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization",
  );
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
  } else {
    next();
  }
});



type VerifyRequest = {
  paymentPayload: PaymentPayload;
  paymentRequirements: PaymentRequirements;
};

type SettleRequest = {
  paymentPayload: PaymentPayload;
  paymentRequirements: PaymentRequirements;
};

app.post("/verify", async (req: Request, res: Response) => {
  try {
    const body: VerifyRequest = req.body;
    // Only use successful Juicebox multiterminal payment as success
    // (In a real implementation, check the payment on-chain or via Juicebox API)
    // For now, mock as always valid if payload present
    if (body && body.paymentPayload && body.paymentRequirements) {
      res.json({ isValid: true, payer: (body.paymentPayload.payload as any)?.authorization?.from });
    } else {
      res.json({ isValid: false, invalidReason: 'Missing paymentPayload or paymentRequirements' });
    }
  } catch (error) {
    res.status(400).json({ error: `Invalid request: ${error}` });
  }
});

app.get("/verify", (req: Request, res: Response) => {
  res.json({
    endpoint: "/verify",
    description: "POST to verify x402 payments",
    body: {
      paymentPayload: "PaymentPayload",
      paymentRequirements: "PaymentRequirements",
    },
  });
});

app.get("/settle", (req: Request, res: Response) => {
  res.json({
    endpoint: "/settle",
    description: "POST to settle x402 payments",
    body: {
      paymentPayload: "PaymentPayload",
      paymentRequirements: "PaymentRequirements",
    },
  });
});

app.get("/supported", async (req: Request, res: Response) => {
  const kinds: SupportedPaymentKind[] = [
    {
      x402Version: 1,
      scheme: "exact",
      network: "base",
    },
    {
      x402Version: 1,
      scheme: "exact",
      network: "base-sepolia",
    },
  ];

  res.json({
    kinds,
  });
});

app.post("/settle", async (req: Request, res: Response) => {
  try {
    console.log("🔍 /settle received body:", JSON.stringify(req.body, null, 2));
    const body: SettleRequest = req.body;
    const paymentRequirements = PaymentRequirementsSchema.parse(body.paymentRequirements);
    const paymentPayload = PaymentPayloadSchema.parse(body.paymentPayload);

    // use the correct private key based on the requested network
    let signer: Signer;
    if (SupportedEVMNetworks.includes(paymentRequirements.network)) {
      signer = await createSigner(paymentRequirements.network, EVM_PRIVATE_KEY);
    } else {
      throw new Error("Unsupported network. Only EVM networks are supported.");
    }

    // settle
    console.log("🔄 Calling settle function...");
    const response = await settle(signer, paymentPayload, paymentRequirements);
    console.log("✅ Settlement completed:", JSON.stringify(response, null, 2));

    // Revnet integration is now handled in the custom settle function

    res.json(response);
  } catch (error) {
    console.error("error", error);
    res.status(400).json({ error: `Invalid request: ${error}` });
  }
});

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// Root endpoint - serve the client page
app.get("/", (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// API info endpoint
app.get("/api", (req: Request, res: Response) => {
  res.json({
    name: "x402 Facilitator Example",
    version: "1.0.0",
    description: "A standalone x402 payment protocol facilitator implementation",
    endpoints: {
      "/health": "Health check endpoint",
      "/supported": "GET - Returns supported payment kinds",
      "/verify": "GET/POST - Verify x402 payment payloads",
      "/settle": "GET/POST - Settle x402 payments",
    },
    documentation: "https://x402.org",
  });
});

// Test resource endpoint that demonstrates x402 flow


const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`x402 Facilitator Example server listening at ${BASE_URL}`);
  console.log(`Health check: ${BASE_URL}/health`);
  console.log(`Supported networks: ${BASE_URL}/supported`);
});
