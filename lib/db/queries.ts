"server-only";

import { genSaltSync, hashSync } from "bcrypt-ts";
import { and, asc, desc, eq, gt } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { generateUUID } from "@/lib/utils";

import {
  chat,
  companyInfo,
  document,
  type Message,
  message,
  type Suggestion,
  suggestion,
  template,
  type Template,
  user,
  type User,
  Vote,
  vote,
} from "./schema";

// Optionally, if not using email/pass login, you can
// use the Drizzle adapter for Auth.js / NextAuth
// https://authjs.dev/reference/adapter/drizzle
let client = postgres(`${process.env.POSTGRES_URL!}?sslmode=require`);
let db = drizzle(client);

export async function getUser(email: string): Promise<Array<User>> {
  try {
    return await db.select().from(user).where(eq(user.email, email));
  } catch (error) {
    console.error("Failed to get user from database");
    throw error;
  }
}

export async function createUser(email: string, password: string) {
  let salt = genSaltSync(10);
  let hash = hashSync(password, salt);

  try {
    return await db.insert(user).values({ email, password: hash });
  } catch (error) {
    console.error("Failed to create user in database");
    throw error;
  }
}

export async function getTemplateByUserId({ userId }: { userId: string }) {
  try {
    const [selectedTemplate] = await db
      .select()
      .from(template)
      .where(eq(template.userId, userId));
    return selectedTemplate as Template;
  } catch (error) {
    console.error("Failed to get template by userId from database");
    throw error;
  }
}

export async function saveTemplate({
  templateContent,
  userId,
}: {
  templateContent: string;
  userId: string;
}) {
  try {
    const existingTemplate = await getTemplateByUserId({ userId });
    if (existingTemplate)
      return await db
        .update(template)
        .set({
          content: templateContent,
        })
        .where(eq(template.userId, userId));
    else
      return await db.insert(template).values({
        id: generateUUID(),
        content: templateContent,
        userId,
      });
  } catch (error) {
    console.error("Failed to save template in database");
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

export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}) {
  try {
    await db
      .delete(suggestion)
      .where(
        and(
          eq(suggestion.documentId, id),
          gt(suggestion.documentCreatedAt, timestamp),
        ),
      );

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

export async function saveSuggestions({
  suggestions,
}: {
  suggestions: Array<Suggestion>;
}) {
  try {
    return await db.insert(suggestion).values(suggestions);
  } catch (error) {
    console.error("Failed to save suggestions in database");
    throw error;
  }
}

export async function getSuggestionsByDocumentId({
  documentId,
}: {
  documentId: string;
}) {
  try {
    return await db
      .select()
      .from(suggestion)
      .where(and(eq(suggestion.documentId, documentId)));
  } catch (error) {
    console.error(
      "Failed to get suggestions by document version from database",
    );
    throw error;
  }
}
