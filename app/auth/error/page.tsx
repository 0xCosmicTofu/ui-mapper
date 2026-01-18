"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { AlertCircle, Loader2 } from "lucide-react";

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // Map NextAuth error codes to user-friendly messages
  const errorMessages: Record<string, string> = {
    Configuration: "There is a problem with the server configuration.",
    AccessDenied: "You do not have permission to sign in.",
    Verification: "The verification token has expired or has already been used.",
    Default: "An error occurred during authentication.",
  };

  const errorMessage = error ? errorMessages[error] || errorMessages.Default : errorMessages.Default;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 max-w-7xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold">Webflow UI Mapper</h1>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 max-w-md py-12">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <AlertCircle className="h-12 w-12 text-destructive" />
            </div>
            <CardTitle className="text-2xl">Authentication Error</CardTitle>
            <CardDescription>{errorMessage}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm font-mono text-muted-foreground">
                  Error: {error}
                </p>
              </div>
            )}
            {errorDescription && (
              <p className="text-sm text-muted-foreground">
                {errorDescription}
              </p>
            )}
            <Button asChild className="w-full">
              <Link 
                href="/auth/signin"
                prefetch={false}
                onClick={(e) => {
                  // #region agent log
                  const currentUrl = window.location.href;
                  const currentOrigin = window.location.origin;
                  const linkElement = e.currentTarget;
                  const resolvedHref = linkElement.getAttribute('href');
                  console.log('[ERROR-PAGE] Link click', {currentUrl,currentOrigin,linkHref:resolvedHref,isRelative:resolvedHref?.startsWith('/')});
                  fetch('http://127.0.0.1:7242/ingest/cefeb5be-19ce-47e2-aae9-b6a86c063e28',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/auth/error/page.tsx:Link:click',message:'Error page link clicked',data:{currentUrl,currentOrigin,linkHref:resolvedHref,isRelative:resolvedHref?.startsWith('/')},timestamp:Date.now(),sessionId:'debug-session',runId:'config-error-investigation',hypothesisId:'H6'})}).catch(()=>{});
                  // #endregion
                }}
              >
                Return to Sign In
              </Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <AuthErrorContent />
    </Suspense>
  );
}
