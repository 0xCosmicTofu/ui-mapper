import { handlers } from "../../../../auth";
import { NextRequest } from "next/server";

export const GET = async (req: NextRequest) => {
  // #region agent log
  const pathname = req.nextUrl.pathname;
  const isCallback = pathname.includes('callback');
  const errorParam = req.nextUrl.searchParams.get('error');
  const hasHandlers = !!handlers;
  const hasGET = typeof handlers?.GET === 'function';
  fetch('http://127.0.0.1:7242/ingest/cefeb5be-19ce-47e2-aae9-b6a86c063e28',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/[...nextauth]/route.ts:GET',message:'NextAuth GET handler',data:{pathname,isCallback,errorParam,hasHandlers,hasGET,url:req.url},timestamp:Date.now(),sessionId:'debug-session',runId:'config-error-investigation',hypothesisId:'H3'})}).catch(()=>{});
  // #endregion
  
  try {
    const response = await handlers.GET(req);
    // #region agent log
    const status = response?.status;
    const redirectLocation = response?.headers?.get('location') || '';
    const isErrorRedirect = redirectLocation.includes('/auth/error');
    fetch('http://127.0.0.1:7242/ingest/cefeb5be-19ce-47e2-aae9-b6a86c063e28',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/[...nextauth]/route.ts:GET:response',message:'NextAuth GET response',data:{status,redirectLocation,isErrorRedirect,errorFromRedirect:isErrorRedirect ? new URL(redirectLocation).searchParams.get('error') : null},timestamp:Date.now(),sessionId:'debug-session',runId:'config-error-investigation',hypothesisId:'H4'})}).catch(()=>{});
    // #endregion
    return response;
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/cefeb5be-19ce-47e2-aae9-b6a86c063e28',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/[...nextauth]/route.ts:GET:error',message:'NextAuth GET error',data:{error:error instanceof Error ? error.message : String(error),errorStack:error instanceof Error ? error.stack?.split('\n').slice(0,3).join('\n') : undefined},timestamp:Date.now(),sessionId:'debug-session',runId:'config-error-investigation',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
    throw error;
  }
};

export const POST = async (req: NextRequest) => {
  return handlers.POST(req);
};
