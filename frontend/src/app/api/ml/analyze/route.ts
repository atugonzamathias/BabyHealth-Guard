import { NextResponse } from "next/server";

export const runtime = "nodejs";

const ML_SERVICE_URL =
  process.env.ML_SERVICE_URL?.trim() ||
  (process.env.NODE_ENV === "production"
    ? "https://babyhealth-guard-ml.onrender.com"
    : "http://127.0.0.1:8000");

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const modality = (formData.get("modality") as string) || "auto";

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "No image file was provided for analysis." },
        { status: 400 }
      );
    }

    try {
      const mlFormData = new FormData();
      mlFormData.append("file", file);
      mlFormData.append("modality", modality);

      const mlResponse = await fetch(
        `${ML_SERVICE_URL.replace(/\/+$/, "")}/api/v1/analyze`,
        {
          method: "POST",
          body: mlFormData,
          signal: AbortSignal.timeout(90_000),
        }
      );

      if (!mlResponse.ok) {
        const detail = await mlResponse.text();
        console.error(
          `ML service returned ${mlResponse.status}: ${detail.slice(0, 1000)}`
        );
        return NextResponse.json(
          { error: "The image analysis service could not analyze this image." },
          { status: mlResponse.status }
        );
      }

      const data = await mlResponse.json();
      return NextResponse.json(data);
    } catch (networkError) {
      console.error("ML analysis service request failed:", networkError);
      return NextResponse.json(
        {
          error:
            "The image analysis service is unavailable or timed out. Please try again shortly.",
        },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error("ML analyze API route error:", error);
    return NextResponse.json(
      { error: "Image analysis could not be completed." },
      { status: 500 }
    );
  }
}
