import { auth } from "@/app/(auth)/auth";
import {
  getTemplateByUserId,
  saveTemplate,
  updateTemplate,
} from "@/db/queries";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new Response("Missing id", { status: 400 });
  }

  const session = await auth();

  if (!session || !session.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const template = await getTemplateByUserId({ userId: id });

  if (!template) {
    return new Response("Not Found", { status: 404 });
  }

  if (template.userId !== session.user.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  return Response.json(template, { status: 200 });
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new Response("Missing id", { status: 400 });
  }

  const session = await auth();

  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { content }: { content: string } = await request.json();

  if (session.user && session.user.id) {
    const template = await saveTemplate({
      id,
      content,
      userId: session.user.id,
    });

    return Response.json(document, { status: 200 });
  } else {
    return new Response("Unauthorized", { status: 401 });
  }
}

export async function PATCH(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  const { content }: { content: string } = await request.json();

  if (!id) {
    return new Response("Missing id", { status: 400 });
  }

  const session = await auth();

  if (!session || !session.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const template = await getTemplateByUserId({ userId: id });

  if (template.userId !== session.user.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  await updateTemplate({
    content: content,
    userId: session.user.id,
  });

  return new Response("Deleted", { status: 200 });
}
