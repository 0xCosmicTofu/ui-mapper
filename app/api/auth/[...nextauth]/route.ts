import { handlers } from "@/auth";

// #region agent log
if (typeof fetch !== 'undefined') {
  fetch('http://127.0.0.1:7242/ingest/cefeb5be-19ce-47e2-aae9-b6a86c063e28',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:3',message:'NextAuth handlers initialized',data:{hasGet:!!handlers.GET,hasPost:!!handlers.POST,authSecret:process.env.AUTH_SECRET ? 'present' : 'missing'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B,C,D'})}).catch(()=>{});
}
// #endregion

export const { GET, POST } = handlers;
