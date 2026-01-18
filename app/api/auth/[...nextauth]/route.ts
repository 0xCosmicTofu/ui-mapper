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
    const response = await handlers.GET(req);
    // #region agent log
    const status = response?.status;
    const redirectLocation = response?.headers?.get('location') || '';
    const isErrorRedirect = redirectLocation.includes('/auth/error');
    const errorFromRedirect = isErrorRedirect && redirectLocation ? new URL(redirectLocation, req.url).searchParams.get('error') : null;
    const setCookieHeaders = response?.headers?.get('set-cookie') || '';
    const hasSessionCookie = setCookieHeaders.includes('session-token');
    
    // CRITICAL: Extract redirect_uri from OAuth authorization URL
    const isOAuthRedirect = redirectLocation && (redirectLocation.includes('accounts.google.com') || redirectLocation.includes('oauth'));
    let redirectUri = null;
    let decodedRedirectUri = null;
    let fullOAuthUrl = null;
    
    if (isOAuthRedirect && redirectLocation) {
      try {
        fullOAuthUrl = redirectLocation;
        const url = new URL(redirectLocation);
        redirectUri = url.searchParams.get('redirect_uri');
        if (redirectUri) {
          // redirect_uri is URL-encoded, decode it to show the actual callback URL
          decodedRedirectUri = decodeURIComponent(redirectUri);
        }
      } catch (e) {
        console.error('[NEXTAUTH-GET-RESPONSE] Error parsing redirect URL', e);
      }
    }
    
    // Also check if this is a callback request (coming back from Google)
    const isCallbackRequest = pathname.includes('callback');
    const callbackError = req.nextUrl.searchParams.get('error');
    const callbackErrorDescription = req.nextUrl.searchParams.get('error_description');
    
    console.log('[NEXTAUTH-GET-RESPONSE] NextAuth GET response', {
      status,
      pathname,
      isCallbackRequest,
      callbackError,
      callbackErrorDescription,
      redirectLocation: redirectLocation ? redirectLocation.substring(0, 200) : null, // Truncate for readability
      isOAuthRedirect,
      redirectUri,
      decodedRedirectUri,
      isErrorRedirect,
      errorFromRedirect,
      hasSessionCookie,
      redirectLocationOrigin: redirectLocation ? new URL(redirectLocation, req.url).origin : null,
      requestOrigin: new URL(req.url).origin,
      requestUrl: req.url
    });
    
    // CRITICAL: If we have a redirect_uri, log it prominently with full context
    if (decodedRedirectUri) {
      console.log('[OAUTH-CALLBACK-URL] ==========================================');
      console.log('[OAUTH-CALLBACK-URL] CALLBACK URL BEING SENT TO GOOGLE:', decodedRedirectUri);
      console.log('[OAUTH-CALLBACK-URL] Full OAuth URL:', fullOAuthUrl?.substring(0, 300));
      console.log('[OAUTH-CALLBACK-URL] Request URL:', req.url);
      console.log('[OAUTH-CALLBACK-URL] AUTH_REDIRECT_PROXY_URL:', process.env.AUTH_REDIRECT_PROXY_URL);
      console.log('[OAUTH-CALLBACK-URL] AUTH_URL:', process.env.AUTH_URL);
      console.log('[OAUTH-CALLBACK-URL] NEXTAUTH_URL:', process.env.NEXTAUTH_URL);
      console.log('[OAUTH-CALLBACK-URL] ==========================================');
      console.log('[OAUTH-CALLBACK-URL] This URL MUST match exactly what is in Google Cloud Console');
    }
    fetch('http://127.0.0.1:7242/ingest/cefeb5be-19ce-47e2-aae9-b6a86c063e28',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/[...nextauth]/route.ts:GET:response',message:'NextAuth GET response',data:{status,pathname,isCallbackRequest,callbackError,callbackErrorDescription,redirectLocation:redirectLocation?.substring(0,200),isOAuthRedirect,redirectUri,decodedRedirectUri,isErrorRedirect,errorFromRedirect,hasSessionCookie,redirectLocationOrigin:redirectLocation ? new URL(redirectLocation, req.url).origin : null,requestOrigin:new URL(req.url).origin,requestUrl:req.url},timestamp:Date.now(),sessionId:'debug-session',runId:'oauth-callback-url-investigation',hypothesisId:'H7'})}).catch(()=>{});
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
