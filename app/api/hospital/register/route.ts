import { NextRequest, NextResponse } from "next/server";
import { keccak256, encodePacked, toBytes } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const SYSTEM_VERIFIER_PRIVATE_KEY = process.env.RELAYER_PRIVATE_KEY;

export async function POST(request: NextRequest) {
  try {
    if (!SYSTEM_VERIFIER_PRIVATE_KEY) {
      return NextResponse.json({ error: "System verifier not configured" }, { status: 500 });
    }

    const body = await request.json();
    const { hospitalAddress, hospitalName, licenseNumber } = body;

    // Validate required fields
    if (!hospitalAddress || !hospitalName || !licenseNumber) {
      return NextResponse.json(
        { error: "Missing required fields: hospitalAddress, hospitalName, licenseNumber" },
        { status: 400 }
      );
    }

    // Validate address format
    if (!hospitalAddress.startsWith("0x") || hospitalAddress.length !== 42) {
      return NextResponse.json({ error: "Invalid hospital address format" }, { status: 400 });
    }

    // Contract code:
    // bytes32 messageHash = keccak256(abi.encodePacked(sender, _licenseNumber));
    // NOTE: Contract only uses sender + licenseNumber, NOT name!
    const messageHash = keccak256(
      encodePacked(
        ["address", "string"],
        [hospitalAddress as `0x${string}`, licenseNumber]
      )
    );

    const account = privateKeyToAccount(SYSTEM_VERIFIER_PRIVATE_KEY as `0x${string}`);
    
    // signMessage with raw bytes - this adds "\x19Ethereum Signed Message:\n32" prefix
    const signature = await account.signMessage({ 
      message: { raw: toBytes(messageHash) }
    });

    console.log("=== Signature Generation Debug ===");
    console.log("Hospital address:", hospitalAddress);
    console.log("License number:", licenseNumber);
    console.log("Message hash:", messageHash);
    console.log("Signature:", signature);
    console.log("Signer/Verifier address:", account.address);
    console.log("==================================");

    return NextResponse.json({
      success: true,
      signature,
      messageHash,
      verifier: account.address,
    });

  } catch (error: unknown) {
    console.error("Error generating signature:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    return NextResponse.json(
      { error: "Failed to generate signature", details: errorMessage },
      { status: 500 }
    );
  }
}
