"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, LogOut, Loader2 } from "lucide-react";
import { signOut } from "next-auth/react";
import { ThemeToggle } from "@/components/theme-toggle";

interface HeaderProps {
  url: string;
  onUrlChange: (url: string) => void;
  onAnalyze: () => void;
  onExport: (format: "json" | "csv" | "generic") => void;
  isAnalyzing: boolean;
  hasResults: boolean;
}

export function Header({
  url,
  onUrlChange,
  onAnalyze,
  onExport,
  isAnalyzing,
  hasResults,
}: HeaderProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isAnalyzing) {
      onAnalyze();
    }
  };

  return (
    <header className="h-14 border-b bg-background flex items-center justify-between px-4 shrink-0">
      {/* Logo - Left */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <span className="text-primary-foreground font-bold text-sm">SF</span>
        </div>
        <span className="font-semibold text-lg hidden sm:inline">StructureFlow</span>
      </div>

      {/* URL Input - Center */}
      <div className="flex items-center gap-2 flex-1 max-w-2xl mx-8">
        <Input
          type="url"
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter URL to analyze..."
          className="flex-1"
          disabled={isAnalyzing}
        />
        <Button
          onClick={onAnalyze}
          disabled={isAnalyzing}
          size="sm"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing
            </>
          ) : (
            "Analyze"
          )}
        </Button>
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Export Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={!hasResults}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Export Format</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onExport("generic")}>
              Generic JSON
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onExport("json")}>
              Webflow JSON
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExport("csv")}>
              Webflow CSV
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Sign Out */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => signOut()}
          title="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
