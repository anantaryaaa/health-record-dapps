import { NextRequest, NextResponse } from "next/server";
import { createThirdwebClient, getContract, prepareContractCall, sendTransaction } from "thirdweb";
import { privateKeyToAccount } from "thirdweb/wallets";
import { defineChain } from "thirdweb/chains";

const RELAYER_PRIVATE_KEY = process.env.RELAYER_PRIVATE_KEY;
const PATIENT_IDENTITY_ADDRESS = process.env.NEXT_PUBLIC_PATIENT_IDENTITY_ADDRESS || "0x985c859bFe24bb0Ca8b922b57f6aCfeEf5DC314e";
const THIRDWEB_CLIENT_ID = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || "";
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://rpc.sepolia-api.lisk.com";

const liskSepolia = defineChain({
  id: 4202,
  name: "Lisk Sepolia Testnet",
  rpc: RPC_URL,
  nativeCurrency: {
    name: "ETH",
    symbol: "ETH",
    decimals: 18,
  },
  blockExplorers: [
    {
      name: "Lisk Sepolia Explorer",
      url: "https://sepolia-blockscout.lisk.com",
    },
  ],
});

export async function POST(request: NextRequest) {
  try {
    // Validate relayer is configured
    if (!RELAYER_PRIVATE_KEY) {
      return NextResponse.json(
        { error: "Relayer not configured" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { hospitalAddress, hospitalName } = body;

    // Validate input
    if (!hospitalAddress || !hospitalName) {
      return NextResponse.json(
        { error: "Missing hospitalAddress or hospitalName" },
        { status: 400 }
      );
    }

    // Validate address format
    if (!hospitalAddress.startsWith("0x") || hospitalAddress.length !== 42) {
      return NextResponse.json(
        { error: "Invalid hospital address format" },
        { status: 400 }
      );
    }

    // Create thirdweb client
    const client = createThirdwebClient({
      clientId: THIRDWEB_CLIENT_ID,
    });

    // Create relayer account
    const relayerAccount = privateKeyToAccount({
      client,
      privateKey: RELAYER_PRIVATE_KEY,
    });

    // Get contract
    const contract = getContract({
      client,
      chain: liskSepolia,
      address: PATIENT_IDENTITY_ADDRESS,
    });

    // Check if already whitelisted
    // Note: We'll just try to whitelist and let it fail if already whitelisted

    // Prepare whitelist transaction
    const tx = prepareContractCall({
      contract,
      method: "function whitelistHospital(address _hospital, string calldata _hospitalName)",
      params: [hospitalAddress, hospitalName],
    });

    // Send transaction
    const result = await sendTransaction({
      account: relayerAccount,
      transaction: tx,
    });

    return NextResponse.json({
      success: true,
      txHash: result.transactionHash,
      message: `Hospital ${hospitalName} whitelisted successfully`,
    });
  } catch (error: unknown) {
    console.error("Error whitelisting hospital:", error);
    
    // Check for specific errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (errorMessage.includes("already") || errorMessage.includes("HospitalAlreadyWhitelisted")) {
      return NextResponse.json({
        success: true,
        message: "Hospital is already whitelisted",
        alreadyWhitelisted: true,
      });
    }

    return NextResponse.json(
      { 
        error: "Failed to whitelist hospital",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
