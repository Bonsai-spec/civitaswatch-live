const DEFAULT_API_BASE_URL = "http://localhost:4000";

const endpoints = [
  "/api/admin/incident-codes",
  "/api/admin/incident-subcodes",
  "/api/admin/service-types",
  "/api/admin/infrastructure-types",
  "/api/admin/emergency-contact-types",
];

function getApiBaseUrl() {
  return String(process.env.API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/+$/, "");
}

function getHeaders() {
  const headers = {
    Accept: "application/json",
  };

  if (process.env.API_TOKEN) {
    headers.Authorization = `Bearer ${process.env.API_TOKEN}`;
  }

  return headers;
}

async function readJsonResponse(response) {
  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    return null;
  }

  return response.json();
}

async function smokeEndpoint(baseUrl, endpoint) {
  const url = `${baseUrl}${endpoint}`;
  const response = await fetch(url, {
    method: "GET",
    headers: getHeaders(),
  });
  const body = await readJsonResponse(response);

  if (!response.ok) {
    const detail = body?.error || body?.message || response.statusText || "Request failed";
    throw new Error(`${endpoint} returned ${response.status}: ${detail}`);
  }

  if (!Array.isArray(body)) {
    throw new Error(`${endpoint} returned ${typeof body}, expected an array`);
  }

  return {
    endpoint,
    count: body.length,
  };
}

async function main() {
  const baseUrl = getApiBaseUrl();
  const results = [];

  for (const endpoint of endpoints) {
    results.push(await smokeEndpoint(baseUrl, endpoint));
  }

  console.log(`Success: master register API smoke test passed for ${baseUrl}`);
  for (const result of results) {
    console.log(`- ${result.endpoint}: ${result.count} record(s)`);
  }
}

main().catch((error) => {
  console.error("Failure: master register API smoke test failed");
  console.error(error.message);
  process.exitCode = 1;
});
