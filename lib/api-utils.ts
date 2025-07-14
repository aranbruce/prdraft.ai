import { NextRequest } from "next/server";
import { auth } from "@/app/(auth)/auth";

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  success: boolean;
}

export class ApiError extends Error {
  constructor(
    public message: string,
    public status: number = 500,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function withAuth<T>(
  handler: (userId: string, request: NextRequest) => Promise<T>,
  request: NextRequest,
): Promise<Response> {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return Response.json(
        { error: "Unauthorized", success: false },
        { status: 401 }
      );
    }

    const result = await handler(session.user.id, request);
    // Handle cases where result might be null/undefined
    return Response.json({ 
      data: result ?? null, 
      success: true 
    });
  } catch (error) {
    console.error("API Error:", error);
    
    if (error instanceof ApiError) {
      return Response.json(
        { error: error.message, success: false },
        { status: error.status }
      );
    }
    
    return Response.json(
      { error: "Internal server error", success: false },
      { status: 500 }
    );
  }
}

export function validateRequired(obj: any, fields: string[]): void {
  const missing = fields.filter(field => !obj[field]);
  if (missing.length > 0) {
    throw new ApiError(`Missing required fields: ${missing.join(", ")}`, 400);
  }
}

export function getSearchParam(request: NextRequest, param: string): string {
  const { searchParams } = new URL(request.url);
  const value = searchParams.get(param);
  if (!value) {
    throw new ApiError(`Missing required parameter: ${param}`, 400);
  }
  return value;
}
