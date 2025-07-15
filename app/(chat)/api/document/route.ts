import { NextRequest } from "next/server";
import { auth } from "@/app/(auth)/auth";
import {
  getDocumentById,
  getTemporaryDocumentById,
  getDocumentsByIdForUser,
  saveDocument,
  saveTemporaryDocument,
  deleteDocumentsByIdAfterTimestamp,
  getDocumentByIdForUser,
  cleanupExpiredTemporaryDocuments,
} from "@/lib/db/queries";

export async function GET(request: NextRequest) {
  try {
    // Passive cleanup of expired temporary documents
    cleanupExpiredTemporaryDocuments().catch(console.error);

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    
    if (!id) {
      return Response.json({ error: "Document ID is required" }, { status: 400 });
    }

    const session = await auth();
    let document = null;

    // First try to get regular document if user is logged in
    if (session?.user?.id) {
      const documents = await getDocumentsByIdForUser({ id, userId: session.user.id });
      if (documents && documents.length > 0) {
        // Return array format expected by the frontend
        return Response.json(documents);
      }
    }

    // If not found, try temporary document (for guest users or if document doesn't exist)
    const tempDocs = await getTemporaryDocumentById(id);
    if (tempDocs && tempDocs.length > 0) {
      // Return array format expected by the frontend
      return Response.json(tempDocs);
    }

    return Response.json({ error: "Document not found" }, { status: 404 });
  } catch (error) {
    console.error("API Error:", error);
    return Response.json(
      { error: "Internal server error", success: false },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    
    if (!id) {
      return Response.json({ error: "Document ID is required" }, { status: 400 });
    }

    const body = await request.json();
    
    if (!body.content || !body.title) {
      return Response.json({ error: "Content and title are required" }, { status: 400 });
    }

    const { content, title } = body;

    // If user is logged in, save as regular document
    if (session?.user?.id) {
      const document = await saveDocument({
        id,
        content,
        title,
        userId: session.user.id,
      });

      return Response.json(document);
    } else {
      // If user is not logged in, save as temporary document
      const document = await saveTemporaryDocument({
        id,
        content,
        title,
      });

      return Response.json(document);
    }
  } catch (error) {
    console.error("API Error:", error);
    return Response.json(
      { error: "Internal server error", success: false },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    
    if (!id) {
      return Response.json({ error: "Document ID is required" }, { status: 400 });
    }

    const body = await request.json();
    
    if (!body.timestamp) {
      return Response.json({ error: "Timestamp is required" }, { status: 400 });
    }

    const { timestamp } = body;

    // Check ownership before deletion
    const document = await getDocumentByIdForUser({ id, userId: session.user.id });
    if (!document) {
      return Response.json({ error: "Document not found or unauthorized" }, { status: 404 });
    }

    await deleteDocumentsByIdAfterTimestamp({
      id,
      timestamp: new Date(timestamp),
    });

    return Response.json({ 
      message: "Documents deleted successfully", 
      success: true 
    });
  } catch (error) {
    console.error("API Error:", error);
    return Response.json(
      { error: "Internal server error", success: false },
      { status: 500 }
    );
  }
}
