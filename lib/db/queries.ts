"server-only";

import { genSaltSync, hashSync } from "bcrypt-ts";
import { and, asc, desc, eq, gt } from "drizzle-orm";

import { generateUUID } from "@/lib/utils";
import { db } from "./schema";

import {
  chat,
  companyInfo,
  document,
  type Message,
  message,
  template,
  type Template,
  user,
  type User,
  Vote,
  vote,
} from "./schema";

export async function getUser(email: string): Promise<Array<User>> {
  return await db.select().from(user).where(eq(user.email, email));
}

export async function createUser(email: string, password: string) {
  let salt = genSaltSync(10);
  let hash = hashSync(password, salt);
  return await db.insert(user).values({ email, password: hash });
}

export async function getTemplatesByUserId({ userId }: { userId: string }) {
  const templates = await db
    .select()
    .from(template)
    .where(eq(template.userId, userId));
  return templates as Array<Template>;
}

export async function saveTemplate({
  content,
  userId,
  title,
}: {
  content: string;
  userId: string;
  title: string;
}) {
  return await db.insert(template).values({
    id: generateUUID(),
    content,
    userId,
    title,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

export async function updateTemplate({
  id,
  content,
  title,
  updatedAt,
  userId,
}: {
  id: string;
  content: string;
  title: string;
  updatedAt: Date;
  userId: string;
}) {
  try {
    return await db
      .update(template)
      .set({ content, title: title, updatedAt })
      .where(and(eq(template.id, id), eq(template.userId, userId)));
  } catch (error) {
    console.error("Failed to update template in database");
    throw error;
  }
}

export async function deleteTemplateById({
  id,
  userId,
}: {
  id: string;
  userId: string;
}) {
  try {
    return await db
      .delete(template)
      .where(and(eq(template.id, id), eq(template.userId, userId)));
  } catch (error) {
    console.error("Failed to delete template by id from database");
    throw error;
  }
}

export async function getCompanyInfoByUserId({ userId }: { userId: string }) {
  try {
    const [selectedCompanyInfo] = await db
      .select()
      .from(companyInfo)
      .where(eq(companyInfo.userId, userId));
    return selectedCompanyInfo;
  } catch (error) {
    console.error("Failed to get company info by userId from database");
    throw error;
  }
}

export async function saveCompanyInfo({
  companyInfoContent,
  userId,
}: {
  companyInfoContent: string;
  userId: string;
}) {
  try {
    const existingCompanyInfo = await getCompanyInfoByUserId({ userId });
    if (existingCompanyInfo)
      return await db
        .update(companyInfo)
        .set({
          content: companyInfoContent,
        })
        .where(eq(companyInfo.userId, userId));
    else
      return await db.insert(companyInfo).values({
        id: generateUUID(),
        content: companyInfoContent,
        userId,
      });
  } catch (error) {
    console.error("Failed to save company info in database");
    throw error;
  }
}

export async function saveChat({
  id,
  userId,
  title,
}: {
  id: string;
  userId: string;
  title: string;
}) {
  try {
    return await db.insert(chat).values({
      id,
      createdAt: new Date(),
      userId,
      title,
    });
  } catch (error) {
    console.error("Failed to save chat in database");
    throw error;
  }
}

export async function updateChat({
  id,
  userId,
  title,
}: {
  id: string;
  userId: string;
  title: string;
}) {
  try {
    return await db
      .update(chat)
      .set({
        userId,
        title,
      })
      .where(and(eq(chat.id, id), eq(chat.userId, userId)));
  } catch (error) {
    console.error("Failed to update chat in database");
    throw error;
  }
}

export async function deleteChatById({ id }: { id: string }) {
  try {
    await db.delete(vote).where(eq(vote.chatId, id));
    await db.delete(message).where(eq(message.chatId, id));

    return await db.delete(chat).where(eq(chat.id, id));
  } catch (error) {
    console.error("Failed to delete chat by id from database");
    throw error;
  }
}

export async function getChatsByUserId({ id }: { id: string }) {
  try {
    return await db
      .select()
      .from(chat)
      .where(eq(chat.userId, id))
      .orderBy(desc(chat.createdAt));
  } catch (error) {
    console.error("Failed to get chats by user from database");
    throw error;
  }
}

export async function getChatById({ id }: { id: string }) {
  try {
    const [selectedChat] = await db.select().from(chat).where(eq(chat.id, id));
    return selectedChat;
  } catch (error) {
    console.error("Failed to get chat by id from database");
    throw error;
  }
}

export async function saveMessages({ messages }: { messages: Array<Message> }) {
  try {
    return await db.insert(message).values(messages);
  } catch (error) {
    console.error("Failed to save messages in database", error);
    throw error;
  }
}

export async function getMessagesByChatId({ id }: { id: string }) {
  try {
    return (
      (await db
        .select()
        .from(message)
        .where(eq(message.chatId, id))
        // potentially causes issues
        .orderBy(asc(message.createdAt))) as Array<Message>
    );
  } catch (error) {
    console.error("Failed to get messages by chat id from database", error);
    throw error;
  }
}

export async function voteMessage({
  chatId,
  messageId,
  type,
}: {
  chatId: string;
  messageId: string;
  type: "up" | "down";
}) {
  try {
    const [existingVote] = await db
      .select()
      .from(vote)
      .where(and(eq(vote.messageId, messageId)));

    if (existingVote) {
      return await db
        .update(vote)
        .set({ isUpvoted: type === "up" ? true : false })
        .where(and(eq(vote.messageId, messageId), eq(vote.chatId, chatId)));
    } else {
      return await db.insert(vote).values({
        chatId,
        messageId,
        isUpvoted: type === "up" ? true : false,
      });
    }
  } catch (error) {
    console.error("Failed to upvote message in database", error);
    throw error;
  }
}

export async function getVotesByChatId({ id }: { id: string }) {
  try {
    return (await db.select().from(vote).where(eq(vote.chatId, id))) as Vote[];
  } catch (error) {
    console.error("Failed to get votes by chat id from database", error);
    throw error;
  }
}

export async function saveDocument({
  id,
  title,
  content,
  userId,
}: {
  id: string;
  title: string;
  content: string;
  userId: string;
}) {
  try {
    return await db.insert(document).values({
      id,
      title,
      content,
      userId,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error("Failed to save document in database");
    throw error;
  }
}

export async function getDocumentsById({ id }: { id: string }) {
  try {
    const documents = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(asc(document.createdAt));

    return documents;
  } catch (error) {
    console.error("Failed to get document by id from database");
    throw error;
  }
}

export async function getDocumentById({ id }: { id: string }) {
  try {
    const [selectedDocument] = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(desc(document.createdAt));
    return selectedDocument;
  } catch (error) {
    console.error("Failed to get document by id from database");
    throw error;
  }
}

export async function getDocumentsByIdForUser({
  id,
  userId,
}: {
  id: string;
  userId: string;
}) {
  const documents = await db
    .select()
    .from(document)
    .where(and(eq(document.id, id), eq(document.userId, userId)))
    .orderBy(asc(document.createdAt));
  return documents;
}

export async function getDocumentByIdForUser({
  id,
  userId,
}: {
  id: string;
  userId: string;
}) {
  try {
    const [selectedDocument] = await db
      .select()
      .from(document)
      .where(and(eq(document.id, id), eq(document.userId, userId)))
      .orderBy(desc(document.createdAt))
      .limit(1);
    return selectedDocument;
  } catch (error) {
    console.error("Failed to get document by id for user from database");
    throw error;
  }
}

export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}) {
  try {
    return await db
      .delete(document)
      .where(and(eq(document.id, id), gt(document.createdAt, timestamp)));
  } catch (error) {
    console.error(
      "Failed to delete documents by id after timestamp from database",
    );
    throw error;
  }
}

export async function getUserPreferredTemplate(userId: string) {
  try {
    const users = await db
      .select({ preferredTemplateId: user.preferredTemplateId })
      .from(user)
      .where(eq(user.id, userId));

    return users.length > 0 ? users[0].preferredTemplateId : null;
  } catch (error) {
    console.error("Failed to get user preferred template:", error);
    throw error;
  }
}

export async function setUserPreferredTemplate(
  userId: string,
  templateId: string,
) {
  try {
    // First, verify that the template exists and belongs to the user
    const userTemplate = await db
      .select({ id: template.id })
      .from(template)
      .where(and(eq(template.id, templateId), eq(template.userId, userId)))
      .limit(1);

    if (userTemplate.length === 0) {
      throw new Error("Template not found or access denied");
    }

    // If validation passes, update the user's preferred template
    return await db
      .update(user)
      .set({ preferredTemplateId: templateId })
      .where(eq(user.id, userId));
  } catch (error) {
    console.error("Failed to set user preferred template:", error);
    throw error;
  }
}
