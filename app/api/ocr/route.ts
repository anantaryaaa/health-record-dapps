import { NextRequest, NextResponse } from "next/server";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage } from "@langchain/core/messages";

// Medical record fields to extract
interface ExtractedMedicalData {
  noRekamMedik: string;
  tanggalMasuk: string;
  tanggalKeluar: string;
  diagnosisUtama: string;
  icdCode: string;
  diagnosisSekunder: string;
  keluhan: string;
  riwayatAlergi: string;
  tindakan: string;
  resepObat: string;
  keadaanKeluar: "sembuh" | "membaik" | "belumSembuh" | "meninggal" | "";
  dokterPenanggungJawab: string;
}

const EXTRACTION_PROMPT = `Anda adalah asisten medis AI yang ahli dalam membaca dan mengekstrak informasi dari dokumen rekam medis.

Analisis gambar dokumen medis ini dan ekstrak informasi berikut dalam format JSON. Jika informasi tidak ditemukan, gunakan string kosong "".

Field yang harus diekstrak:
1. noRekamMedik - Nomor rekam medik pasien
2. tanggalMasuk - Tanggal masuk (format: YYYY-MM-DD)
3. tanggalKeluar - Tanggal keluar (format: YYYY-MM-DD)
4. diagnosisUtama - Diagnosis utama/primer
5. icdCode - Kode ICD-10 jika ada
6. diagnosisSekunder - Diagnosis sekunder/tambahan
7. keluhan - Keluhan utama pasien
8. riwayatAlergi - Riwayat alergi pasien
9. tindakan - Tindakan medis yang dilakukan
10. resepObat - Resep obat yang diberikan (daftar obat)
11. keadaanKeluar - Keadaan saat keluar, HARUS salah satu dari: "sembuh", "membaik", "belumSembuh", "meninggal", atau "" jika tidak ada
12. dokterPenanggungJawab - Nama dokter penanggung jawab

PENTING:
- Untuk tanggal, konversi ke format YYYY-MM-DD
- Untuk keadaanKeluar, petakan ke nilai yang sesuai:
  - "sembuh" untuk pulih total/sembuh
  - "membaik" untuk kondisi membaik/perbaikan
  - "belumSembuh" untuk belum sembuh/rawat jalan lanjutan
  - "meninggal" untuk pasien meninggal
- Jika ada multiple diagnosis, gabung dengan ", "
- Jika ada multiple obat, tulis dalam format list dengan koma

Balas HANYA dengan JSON object yang valid tanpa markdown code block atau teks tambahan.`;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get("image") as File;

    if (!imageFile) {
      return NextResponse.json(
        { error: "No image provided" },
        { status: 400 }
      );
    }

    // Get API key from environment
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Google API key not configured" },
        { status: 500 }
      );
    }

    // Convert file to base64
    const bytes = await imageFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString("base64");
    
    // Determine mime type
    const mimeType = imageFile.type || "image/jpeg";

    // Initialize Gemini model
    const model = new ChatGoogleGenerativeAI({
      model: "models/gemini-2.0-flash",
      apiKey: apiKey,
      maxOutputTokens: 2048,
      temperature: 0.1, // Low temperature for more consistent extraction
    });

    // Create message with image
    const message = new HumanMessage({
      content: [
        {
          type: "text",
          text: EXTRACTION_PROMPT,
        },
        {
          type: "image_url",
          image_url: {
            url: `data:${mimeType};base64,${base64Image}`,
          },
        },
      ],
    });

    // Call the model
    const response = await model.invoke([message]);
    
    // Parse the response
    let extractedData: ExtractedMedicalData;
    const content = response.content as string;
    
    try {
      // Try to parse JSON directly
      extractedData = JSON.parse(content);
    } catch {
      // Try to extract JSON from response if wrapped in markdown
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Could not parse JSON from response");
      }
    }

    // Validate keadaanKeluar value
    const validKeadaan = ["sembuh", "membaik", "belumSembuh", "meninggal", ""];
    if (!validKeadaan.includes(extractedData.keadaanKeluar)) {
      extractedData.keadaanKeluar = "";
    }

    return NextResponse.json({
      success: true,
      data: extractedData,
    });

  } catch (error) {
    console.error("OCR Error:", error);
    return NextResponse.json(
      { 
        error: "Failed to process image",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
