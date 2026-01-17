import { handlers } from "../../../../auth";
import { NextRequest } from "next/server";
import { createHash } from "crypto";

// Normalize NEXTAUTH_URL by trimming whitespace (fixes trailing newline issue)
const NEXTAUTH_URL = process.env.NEXTAUTH_URL?.trim() || process.env.NEXTAUTH_URL;

// #region agent log
console.log("[DEBUG] NextAuth route handler loaded", {
  location: "app/api/auth/[...nextauth]/route.ts",
  hasHandlers: !!handlers,
  hasGET: typeof handlers?.GET === "function",
  hasPOST: typeof handlers?.POST === "function",
  nextAuthUrl: NEXTAUTH_URL,
  nextAuthUrlLength: NEXTAUTH_URL?.length || 0,
  rawNextAuthUrl: process.env.NEXTAUTH_URL,
  rawNextAuthUrlLength: process.env.NEXTAUTH_URL?.length || 0,
  authSecret: !!process.env.AUTH_SECRET,
  timestamp: new Date().toISOString(),
  hypothesisId: "A",
});
// #endregion

export const GET = async (req: NextRequest) => {
  // #region agent log
  const searchParams = Object.fromEntries(req.nextUrl.searchParams);
  const isCallback = req.nextUrl.pathname.includes('callback');
  const authUrl = process.env.AUTH_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const baseUrl = authUrl.replace(/\/api\/auth\/?$/, '');
  const expectedCallbackUrl = `${baseUrl}/api/auth/callback/google`;
  const provider = req.nextUrl.pathname.split('/').pop();
  const code = searchParams.code;
  const state = searchParams.state;
  const errorParam = searchParams.error;
  const redirectUriParam = searchParams.redirect_uri;
  const cookieHeader = req.headers.get('cookie') || '';
  const cookieList = cookieHeader.split(';').map(c => c.trim());
  const stateCookies = cookieList.filter(c => c.startsWith('authjs.state=') || c.startsWith('__Secure-authjs.state='));
  const pkceCookie = cookieList.find(c => c.startsWith('authjs.pkce.code_verifier=')) || cookieList.find(c => c.startsWith('__Secure-authjs.pkce.code_verifier='));
  const stateCookie = stateCookies[0];
  const stateCookieValue = stateCookie ? stateCookie.split('=')[1] : '';
  const pkceCookieValue = pkceCookie ? pkceCookie.split('=')[1] : '';
  const stateHash = state ? createHash("sha256").update(state).digest("hex") : "";
  const stateCookieHash = stateCookieValue
    ? createHash("sha256").update(stateCookieValue).digest("hex")
    : "";
  const stateHashMatches = !!stateHash && !!stateCookieHash && stateHash === stateCookieHash;
  const stateCookieHashPrefixes = stateCookies.map(cookie => {
    const value = cookie.split('=')[1] || '';
    return value ? createHash("sha256").update(value).digest("hex").substring(0, 8) : '';
  });
  fetch('http://127.0.0.1:7242/ingest/cefeb5be-19ce-47e2-aae9-b6a86c063e28',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/[...nextauth]/route.ts:GET:entry',message:'NextAuth GET handler called',data:{url:req.url,pathname:req.nextUrl.pathname,searchParams,isCallback,provider,hasCode:!!code,hasState:!!state,errorParam,redirectUriParam,expectedCallbackUrl,baseUrl,authUrl,hasHandlers:!!handlers,hasGET:typeof handlers?.GET === 'function',hasAuthSecret:!!process.env.AUTH_SECRET,authSecretLength:process.env.AUTH_SECRET?.length || 0,hasNextAuthUrl:!!process.env.NEXTAUTH_URL,nextAuthUrl:process.env.NEXTAUTH_URL,hasAuthUrl:!!process.env.AUTH_URL,authUrlFromEnv:process.env.AUTH_URL,hasGoogleClientId:!!process.env.GOOGLE_CLIENT_ID,googleClientIdLength:process.env.GOOGLE_CLIENT_ID?.length || 0,hasGoogleClientSecret:!!process.env.GOOGLE_CLIENT_SECRET,googleClientSecretLength:process.env.GOOGLE_CLIENT_SECRET?.length || 0,stateCookiePresent:!!stateCookie,stateCookieLength:stateCookieValue.length,stateCookieCount:stateCookies.length,stateCookieHashPrefixes, stateHashPresent:!!stateHash,stateCookieHashPresent:!!stateCookieHash,stateHashMatches,stateHashPrefix:stateHash.substring(0,8),stateCookieHashPrefix:stateCookieHash.substring(0,8),pkceCookiePresent:!!pkceCookie,pkceCookieLength:pkceCookieValue.length},timestamp:Date.now(),sessionId:'debug-session',runId:'invalid-client-investigation',hypothesisId:'H2'})}).catch(()=>{});
  // #endregion
  
  try {
    // #region agent log
    const handlerStartTime = Date.now();
    // #endregion
    const response = await handlers.GET(req);
    // #region agent log
    const handlerDuration = Date.now() - handlerStartTime;
    const responseStatus = response?.status;
    const responseText = await response?.clone()?.text().catch(() => '');
    const redirectLocation = response?.headers?.get('location') || response?.headers?.get('Location') || '';
    const allHeaders = Object.fromEntries(response?.headers?.entries() || []);
    const isErrorRedirect = redirectLocation.includes('/auth/error');
    const cookies = req.headers.get('cookie') || '';
    const authCookies = cookies.split(';').filter(c => c.includes('authjs') || c.includes('next-auth')).map(c => c.trim().substring(0, 50));
    const setCookieHeader = response?.headers?.get('set-cookie') || '';
    const setCookieParts = setCookieHeader.split(',').map(part => part.trim());
    const sessionCookies = setCookieParts.filter(c => c.includes('authjs.session-token') || c.includes('next-auth.session-token'));
    const sessionTokenCookies = setCookieParts.filter(c => c.includes('session-token'));
    const sessionTokenValues = sessionTokenCookies.map(c => {
      const match = c.match(/session-token=([^;]+)/);
      return match ? match[1].substring(0, 20) + '...' : '';
    });
    let oauthRedirectUri = '';
    let oauthClientId = '';
    let oauthState = '';
    let promptParam = '';
    if (redirectLocation && redirectLocation.includes('accounts.google.com')) {
      try {
        const oauthUrl = new URL(redirectLocation);
        oauthRedirectUri = oauthUrl.searchParams.get('redirect_uri') || '';
        oauthClientId = oauthUrl.searchParams.get('client_id') || '';
        oauthState = oauthUrl.searchParams.get('state') || '';
        promptParam = oauthUrl.searchParams.get('prompt') || '';
      } catch (e) {}
    }
    const isRedirectToHome = redirectLocation === '/' || redirectLocation.startsWith('/?');
    const isRedirectToSignIn = redirectLocation.includes('/auth/signin');
    const isRedirectToCallback = redirectLocation.includes('/api/auth/callback');
    fetch('http://127.0.0.1:7242/ingest/cefeb5be-19ce-47e2-aae9-b6a86c063e28',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/[...nextauth]/route.ts:GET:response',message:'NextAuth GET handler response',data:{status:responseStatus,statusText:response?.statusText,hasHeaders:!!response?.headers,redirectLocation,handlerDuration,responsePreview:responseText?.substring(0,200),isErrorRedirect,errorFromUrl:isErrorRedirect ? new URL(redirectLocation).searchParams.get('error') : null,allHeaders:Object.keys(allHeaders),authCookiesCount:authCookies.length,authCookies,setCookieHeaderPresent:!!setCookieHeader,setCookieCount:setCookieParts.length,sessionCookiesCount:sessionCookies.length,sessionTokenCookiesCount:sessionTokenCookies.length,sessionTokenValues,isGoogleOAuth:redirectLocation.includes('accounts.google.com'),oauthRedirectUri,oauthRedirectUriMatches:oauthRedirectUri === expectedCallbackUrl,expectedCallbackUrl,oauthClientIdMasked:oauthClientId ? `${oauthClientId.substring(0,8)}...${oauthClientId.length}chars` : '',oauthClientIdLength:oauthClientId?.length || 0,hasOauthState:!!oauthState,promptParam,isCallback,hasCode:!!code,isRedirectToHome,isRedirectToSignIn,isRedirectToCallback},timestamp:Date.now(),sessionId:'debug-session',runId:'oauth-loop-investigation',hypothesisId:'H11'})}).catch(()=>{});
    // #endregion
    return response;
  } catch (error) {
    // #region agent log
    const errorDetails = error instanceof Error ? {
      message: error.message,
      name: error.name,
      stack: error.stack?.split('\n').slice(0, 5).join('\n'),
    } : { error: String(error) };
    fetch('http://127.0.0.1:7242/ingest/cefeb5be-19ce-47e2-aae9-b6a86c063e28',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/[...nextauth]/route.ts:GET:error',message:'NextAuth GET handler error',data:{...errorDetails,isCallback,provider,hasCode:!!code},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    throw error;
  }
};

export const POST = async (req: NextRequest) => {
  // #region agent log
  const searchParams = Object.fromEntries(req.nextUrl.searchParams);
  const isCallback = req.nextUrl.pathname.includes('callback');
  const authUrl = process.env.AUTH_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const baseUrl = authUrl.replace(/\/api\/auth\/?$/, '');
  const expectedCallbackUrl = `${baseUrl}/api/auth/callback/google`;
  const requestBody = await req.clone().text().catch(() => '');
  let parsedBody: Record<string, unknown> = {};
  try {
    parsedBody = JSON.parse(requestBody);
  } catch (e) {}
  fetch('http://127.0.0.1:7242/ingest/cefeb5be-19ce-47e2-aae9-b6a86c063e28',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/[...nextauth]/route.ts:POST:entry',message:'NextAuth POST handler called',data:{url:req.url,pathname:req.nextUrl.pathname,searchParams,isCallback,hasHandlers:!!handlers,hasPOST:typeof handlers?.POST === 'function',hasAuthSecret:!!process.env.AUTH_SECRET,authSecretLength:process.env.AUTH_SECRET?.length || 0,hasNextAuthUrl:!!process.env.NEXTAUTH_URL,nextAuthUrl:process.env.NEXTAUTH_URL,hasAuthUrl:!!process.env.AUTH_URL,authUrl:process.env.AUTH_URL,baseUrl,expectedCallbackUrl,hasGoogleClientId:!!process.env.GOOGLE_CLIENT_ID,googleClientIdLength:process.env.GOOGLE_CLIENT_ID?.length || 0,hasGoogleClientSecret:!!process.env.GOOGLE_CLIENT_SECRET,googleClientSecretLength:process.env.GOOGLE_CLIENT_SECRET?.length || 0,requestBodyKeys:Object.keys(parsedBody)},timestamp:Date.now(),sessionId:'debug-session',runId:'invalid-client-investigation',hypothesisId:'H4'})}).catch(()=>{});
  // #endregion
  
  try {
    const response = await handlers.POST(req);
    // #region agent log
    const responseStatus = response?.status;
    const responseText = await response?.clone()?.text().catch(() => '');
    const setCookieHeader = response?.headers?.get('set-cookie') || '';
    const setCookieParts = setCookieHeader.split(',').map(part => part.trim());
    const stateSetCookieMatches = Array.from(setCookieHeader.matchAll(/(?:^|,)\s*(?:__Secure-)?authjs\.state=([^;]+)/g));
    const stateSetCookieValues = stateSetCookieMatches.map(match => match[1] || '');
    const stateSetCookie = stateSetCookieValues[0] ? `authjs.state=${stateSetCookieValues[0]}` : '';
    const stateSetCookieValue = stateSetCookieValues[0] || '';
    const stateSetCookieHash = stateSetCookieValue
      ? createHash("sha256").update(stateSetCookieValue).digest("hex")
      : '';
    // Parse the full response to extract the redirect_uri
    let redirectUri = '';
    let stateParam = '';
    let oauthClientIdFromResponse = '';
    try {
      const responseData = JSON.parse(responseText);
      if (responseData.url) {
        const urlObj = new URL(responseData.url);
        redirectUri = urlObj.searchParams.get('redirect_uri') || '';
        stateParam = urlObj.searchParams.get('state') || '';
        oauthClientIdFromResponse = urlObj.searchParams.get('client_id') || '';
      }
    } catch (e) {}
    const stateParamHash = stateParam
      ? createHash("sha256").update(stateParam).digest("hex")
      : '';
    const stateSetCookieMatchesParam = !!stateParamHash && !!stateSetCookieHash && stateParamHash === stateSetCookieHash;
    const stateSetCookieHashPrefixes = stateSetCookieValues.map(value => value ? createHash("sha256").update(value).digest("hex").substring(0, 8) : '');
    fetch('http://127.0.0.1:7242/ingest/cefeb5be-19ce-47e2-aae9-b6a86c063e28',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/[...nextauth]/route.ts:POST:response',message:'NextAuth POST handler response',data:{status:responseStatus,statusText:response?.statusText,hasHeaders:!!response?.headers,responsePreview:responseText?.substring(0,500),redirectUri,redirectUriMatches:redirectUri === expectedCallbackUrl,expectedCallbackUrl,oauthClientIdFromResponseMasked:oauthClientIdFromResponse ? `${oauthClientIdFromResponse.substring(0,8)}...${oauthClientIdFromResponse.length}chars` : '',oauthClientIdFromResponseLength:oauthClientIdFromResponse?.length || 0,stateParamPresent:!!stateParam,stateParamLength:stateParam.length,stateParamHashPrefix:stateParamHash.substring(0,8),setCookieHeaderPresent:!!setCookieHeader,setCookieCount:setCookieParts.length,stateSetCookiePresent:stateSetCookieValues.length > 0,stateSetCookieCount:stateSetCookieValues.length,stateSetCookieHashPrefix:stateSetCookieHash.substring(0,8),stateSetCookieHashPrefixes,stateSetCookieMatchesParam,setCookieHasSecure:setCookieHeader.includes('Secure'),setCookieHasSameSite:setCookieHeader.toLowerCase().includes('samesite='),setCookieHasPathApiAuth:setCookieHeader.includes('Path=/api/auth'),setCookieHasPathRoot:setCookieHeader.includes('Path=/'),fullResponseText:responseText},timestamp:Date.now(),sessionId:'debug-session',runId:'invalid-client-investigation',hypothesisId:'H5'})}).catch(()=>{});
    // #endregion
    return response;
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/cefeb5be-19ce-47e2-aae9-b6a86c063e28',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/[...nextauth]/route.ts:POST:error',message:'NextAuth POST handler error',data:{error:error instanceof Error ? error.message : String(error),stack:error instanceof Error ? error.stack : undefined,name:error instanceof Error ? error.name : undefined},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    throw error;
  }
};

