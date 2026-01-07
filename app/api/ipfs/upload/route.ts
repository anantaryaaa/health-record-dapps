/**
 * API Route for uploading encrypted medical records to Pinata IPFS
 * This runs on server-side to protect API keys
 */

import { NextRequest, NextResponse } from "next/server";

const PINATA_JWT = process.env.PINATA_JWT;

export async function POST(request: NextRequest) {
  try {
    // Check for JWT
    if (!PINATA_JWT) {
      return NextResponse.json(
        { success: false, error: "Pinata JWT not configured" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { encryptedPayload, metadata } = body;

    if (!encryptedPayload) {
      return NextResponse.json(
        { success: false, error: "Missing encrypted payload" },
        { status: 400 }
      );
    }

    // Upload to Pinata
    const response = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${PINATA_JWT}`,
      },
      body: JSON.stringify({
        pinataContent: encryptedPayload,
        pinataMetadata: {
          name: metadata?.name || `MedicalRecord_${Date.now()}`,
          keyvalues: metadata?.keyvalues || {},
        },
        pinataOptions: {
          cidVersion: 1,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Pinata upload error:", errorData);
      return NextResponse.json(
        { success: false, error: `Pinata upload failed: ${response.status}` },
        { status: response.status }
      );
    }

    const result = await response.json();

    return NextResponse.json({
      success: true,
      cid: result.IpfsHash,
      timestamp: result.Timestamp,
    });
  } catch (error) {
    console.error("Error in IPFS upload API:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
