import { handlers } from "../../../../auth";
import { NextRequest } from "next/server";

export const GET = async (req: NextRequest) => {
  // #region agent log
  const pathname = req.nextUrl.pathname;
  const isCallback = pathname.includes('callback');
  const isSignIn = pathname.includes('signin');
  const provider = pathname.split('/').pop(); // Extract provider from path like /api/auth/signin/google
  const errorParam = req.nextUrl.searchParams.get('error');
  const hasHandlers = !!handlers;
  const hasGET = typeof handlers?.GET === 'function';
  
  // Capture OAuth authorization URL if this is a signin request
  const authorizationUrl = isSignIn && provider && provider !== 'signin' ? req.url : null;
  
  const requestHeaders = {
    host: req.headers.get('host'),
    'x-forwarded-host': req.headers.get('x-forwarded-host'),
    'x-forwarded-proto': req.headers.get('x-forwarded-proto'),
    origin: req.headers.get('origin'),
    referer: req.headers.get('referer'),
  };
  
  console.log('[NEXTAUTH-GET] NextAuth GET handler', {
    pathname,
    isCallback,
    isSignIn,
    provider,
    errorParam,
    hasHandlers,
    hasGET,
    url: req.url,
    authorizationUrl,
    requestHeaders
  });
  fetch('http://127.0.0.1:7242/ingest/cefeb5be-19ce-47e2-aae9-b6a86c063e28',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/[...nextauth]/route.ts:GET',message:'NextAuth GET handler',data:{pathname,isCallback,isSignIn,provider,errorParam,hasHandlers,hasGET,url:req.url,authorizationUrl,requestHeaders},timestamp:Date.now(),sessionId:'debug-session',runId:'oauth-callback-url-investigation',hypothesisId:'H7'})}).catch(()=>{});
  // #endregion
  
  try {
    // #region agent log
    const requestHeaders = {
      host: req.headers.get('host'),
      'x-forwarded-host': req.headers.get('x-forwarded-host'),
      'x-forwarded-proto': req.headers.get('x-forwarded-proto'),
      origin: req.headers.get('origin'),
      referer: req.headers.get('referer'),
    };
    console.log('[NEXTAUTH-GET] Request headers for URL detection', requestHeaders);
    fetch('http://127.0.0.1:7242/ingest/cefeb5be-19ce-47e2-aae9-b6a86c063e28',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/[...nextauth]/route.ts:GET:headers',message:'Request headers',data:requestHeaders,timestamp:Date.now(),sessionId:'debug-session',runId:'config-error-investigation',hypothesisId:'H3'})}).catch(()=>{});
    // #endregion
    
    const response = await handlers.GET(req);
    // #region agent log
    const status = response?.status;
    const redirectLocation = response?.headers?.get('location') || '';
    const isErrorRedirect = redirectLocation.includes('/auth/error');
    const errorFromRedirect = isErrorRedirect && redirectLocation ? new URL(redirectLocation, req.url).searchParams.get('error') : null;
    const setCookieHeaders = response?.headers?.get('set-cookie') || '';
    const hasSessionCookie = setCookieHeaders.includes('session-token');
    
    // CRITICAL: Check if redirectLocation contains OAuth callback URL
    const isOAuthRedirect = redirectLocation && (redirectLocation.includes('accounts.google.com') || redirectLocation.includes('oauth'));
    const callbackUrlInRedirect = isOAuthRedirect && redirectLocation ? (() => {
      try {
        const url = new URL(redirectLocation);
        return url.searchParams.get('redirect_uri') || url.searchParams.get('callback_uri') || null;
      } catch {
        return null;
      }
    })() : null;
    
    console.log('[NEXTAUTH-GET-RESPONSE] NextAuth GET response', {
      status,
      redirectLocation,
      isErrorRedirect,
      isOAuthRedirect,
      callbackUrlInRedirect,
      errorFromRedirect,
      hasSessionCookie,
      redirectLocationOrigin: redirectLocation ? new URL(redirectLocation, req.url).origin : null,
      requestOrigin: new URL(req.url).origin,
      // Extract callback URL from OAuth redirect if present
      fullRedirectUrl: redirectLocation
    });
    fetch('http://127.0.0.1:7242/ingest/cefeb5be-19ce-47e2-aae9-b6a86c063e28',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/[...nextauth]/route.ts:GET:response',message:'NextAuth GET response',data:{status,redirectLocation,isErrorRedirect,isOAuthRedirect,callbackUrlInRedirect,errorFromRedirect,hasSessionCookie,redirectLocationOrigin:redirectLocation ? new URL(redirectLocation, req.url).origin : null,requestOrigin:new URL(req.url).origin,fullRedirectUrl:redirectLocation},timestamp:Date.now(),sessionId:'debug-session',runId:'oauth-callback-url-investigation',hypothesisId:'H7'})}).catch(()=>{});
    // #endregion
    return response;
  } catch (error) {
    // #region agent log
    const errorMsg = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack?.split('\n').slice(0,3).join('\n') : undefined;
    console.error('[NEXTAUTH-GET-ERROR] NextAuth GET error', {error:errorMsg,errorStack});
    fetch('http://127.0.0.1:7242/ingest/cefeb5be-19ce-47e2-aae9-b6a86c063e28',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/[...nextauth]/route.ts:GET:error',message:'NextAuth GET error',data:{error:errorMsg,errorStack},timestamp:Date.now(),sessionId:'debug-session',runId:'config-error-investigation',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
    throw error;
  }
};

export const POST = async (req: NextRequest) => {
  return handlers.POST(req);
};
