import { cleanupExpiredTemporaryDocuments } from "@/lib/db/queries";

export async function GET() {
  try {
    console.log("Running midnight cleanup of expired temporary documents...");

    const result = await cleanupExpiredTemporaryDocuments();

    return Response.json({
      success: true,
      message:
        "Midnight cleanup completed successfully - removed expired temporary documents",
      timestamp: new Date().toISOString(),
      result,
    });
  } catch (error) {
    console.error("Midnight cleanup error:", error);
    return Response.json(
      {
        success: false,
        error: "Midnight cleanup failed",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
