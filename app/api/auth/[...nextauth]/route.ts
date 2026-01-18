import { handlers } from "../../../../auth";
import { NextRequest } from "next/server";

export const GET = async (req: NextRequest) => {
  return handlers.GET(req);
};

export const POST = async (req: NextRequest) => {
  return handlers.POST(req);
};
