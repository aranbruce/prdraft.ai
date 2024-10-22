import { GET as originalGET, POST as originalPOST } from "@/app/(auth)/auth";

export const GET = (params: any) => {
  return originalGET(params);
};

export const POST = (params: any) => {
  return originalPOST(params);
};
