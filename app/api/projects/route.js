// Deprecated: kept for backward compatibility. Prefer /api/generate
export async function POST() {
  return new Response(JSON.stringify({ error: "Utilisez /api/generate" }), { status: 410 });
}