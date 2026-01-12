"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

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
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-800 flex items-center justify-center px-4">
      <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-xl p-8 max-w-md w-full">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-zinc-900 dark:text-zinc-100">
            Authentication Error
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mb-2">
            {errorMessage}
          </p>
          {error && (
            <p className="text-sm text-zinc-500 dark:text-zinc-500 mb-4 font-mono">
              Error: {error}
            </p>
          )}
          {errorDescription && (
            <p className="text-xs text-zinc-500 dark:text-zinc-500 mb-4">
              {errorDescription}
            </p>
          )}
          <Link
            href="/auth/signin"
            className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
          >
            Return to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-800 flex items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-600 dark:text-zinc-400">Loading...</p>
        </div>
      </div>
    }>
      <AuthErrorContent />
    </Suspense>
  );
}
