import { CoreMessage } from "ai";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/app/(auth)/auth";
import { Chat as PreviewChat } from "@/components/custom/chat";
import { getChatById } from "@/db/queries";
import { Chat } from "@/db/schema";
import { convertToUIMessages, generateUUID } from "@/lib/utils";

export default async function Page({ params }: { params: any }) {
  const { id } = params;
  const session = await auth();
  const chatFromDb = await getChatById({ id });

  if (!session || !session.user) {
    redirect("/");
  }

  if (!chatFromDb) {
    return notFound();
  }

  // type casting
  const chat: Chat = {
    ...chatFromDb,
    messages: convertToUIMessages(chatFromDb.messages as Array<CoreMessage>),
  };

  if (session.user.id !== chat.userId) {
    return notFound();
  }

  return <PreviewChat id={chat.id} initialMessages={chat.messages} />;
}
