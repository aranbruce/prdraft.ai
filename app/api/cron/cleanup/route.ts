import { NextRequest } from "next/server";
import { cleanupExpiredTemporaryDocuments } from "@/lib/db/queries";

export async function GET() {
  try {
    console.log("Running scheduled cleanup of expired temporary documents...");
    
    const result = await cleanupExpiredTemporaryDocuments();
    
    return Response.json({
      success: true,
      message: "Scheduled cleanup completed successfully",
      timestamp: new Date().toISOString(),
      result,
    });
  } catch (error) {
    console.error("Scheduled cleanup error:", error);
    return Response.json(
      { 
        success: false,
        error: "Scheduled cleanup failed", 
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
