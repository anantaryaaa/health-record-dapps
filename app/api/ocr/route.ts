import { NextRequest, NextResponse } from "next/server";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage } from "@langchain/core/messages";

export async function POST(request: NextRequest) {
  try {
    const { imageBase64 } = await request.json();

    if (!imageBase64) {
      return NextResponse.json(
        { success: false, error: "No image provided" },
        { status: 400 }
      );
    }

    // Initialize Gemini model
    const model = new ChatGoogleGenerativeAI({
      model: "gemini-2.0-flash",
      apiKey: process.env.GOOGLE_API_KEY,
    });

    // Create message with image
    const message = new HumanMessage({
      content: [
        {
          type: "text",
          text: `You are a medical document OCR assistant. Analyze this medical document image and extract the following information into a JSON format.

Extract these fields (use empty string "" if not found):
- noRekamMedik: Medical record number
- tanggalMasuk: Admission date (format: YYYY-MM-DD)
- tanggalKeluar: Discharge date (format: YYYY-MM-DD)
- diagnosisUtama: Primary diagnosis
- icdCode: ICD-10 code
- diagnosisSekunder: Secondary diagnosis
- keluhan: Patient complaints/symptoms
- riwayatAlergi: Allergy history
- tindakan: Medical procedures performed
- resepObat: Prescription/medication
- keadaanKeluar: Discharge condition (e.g., "Improved", "Cured", "Referred")
- dokterPenanggungJawab: Attending physician name

IMPORTANT: 
- Return ONLY valid JSON, no markdown, no explanation
- If the image is not a medical document, return empty values
- Extract as much information as visible in the document
- For dates, convert to YYYY-MM-DD format if possible

Example output:
{"noRekamMedik":"MR-2024-001","tanggalMasuk":"2024-01-15","tanggalKeluar":"2024-01-17","diagnosisUtama":"Acute Bronchitis","icdCode":"J20.9","diagnosisSekunder":"","keluhan":"Batuk berdahak 5 hari","riwayatAlergi":"Tidak ada","tindakan":"Pemeriksaan fisik","resepObat":"Ambroxol 3x1","keadaanKeluar":"Membaik","dokterPenanggungJawab":"Dr. Ahmad"}`,
        },
        {
          type: "image_url",
          image_url: {
            url: imageBase64,
          },
        },
      ],
    });

    // Call Gemini
    const response = await model.invoke([message]);
    const content = response.content as string;

    // Parse JSON from response
    let extractedData;
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0]);
      } else {
        extractedData = JSON.parse(content);
      }
    } catch {
      console.error("Failed to parse OCR response:", content);
      return NextResponse.json(
        { success: false, error: "Failed to parse OCR result" },
        { status: 500 }
      );
    }

    // Ensure all fields exist with defaults
    const result = {
      noRekamMedik: extractedData.noRekamMedik || "",
      tanggalMasuk: extractedData.tanggalMasuk || new Date().toISOString().split("T")[0],
      tanggalKeluar: extractedData.tanggalKeluar || "",
      diagnosisUtama: extractedData.diagnosisUtama || "",
      icdCode: extractedData.icdCode || "",
      diagnosisSekunder: extractedData.diagnosisSekunder || "",
      keluhan: extractedData.keluhan || "",
      riwayatAlergi: extractedData.riwayatAlergi || "",
      tindakan: extractedData.tindakan || "",
      resepObat: extractedData.resepObat || "",
      keadaanKeluar: extractedData.keadaanKeluar || "",
      dokterPenanggungJawab: extractedData.dokterPenanggungJawab || "",
    };

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("OCR API error:", error);
    return NextResponse.json(
      { success: false, error: "OCR processing failed" },
      { status: 500 }
    );
  }
}
