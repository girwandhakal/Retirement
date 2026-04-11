import { NextResponse } from "next/server";

const defaultApiBaseUrl = "http://127.0.0.1:8000";

function buildPlannerApiUrl() {
  const configuredBaseUrl =
    process.env.RETIREMENT_API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    defaultApiBaseUrl;
  const normalizedBaseUrl = configuredBaseUrl.endsWith("/")
    ? configuredBaseUrl.slice(0, -1)
    : configuredBaseUrl;

  return `${normalizedBaseUrl}/v1/calc/planner`;
}

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  try {
    const response = await fetch(buildPlannerApiUrl(), {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const data = (await response.json()) as unknown;
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      { message: "Retirement API is unavailable." },
      { status: 503 },
    );
  }
}
