"use client";

import { useState, useRef, useEffect } from "react";
import { WHITELISTED_TOKENS, Token } from "@/lib/tokens";

interface TokenSelectorProps {
  value: string;
  onChange: (token: Token) => void;
  label?: string;
}

export function TokenSelector({
  value,
  onChange,
  label = "Select Token",
}: TokenSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Find current selected token
  const selectedToken = WHITELISTED_TOKENS.find(
    (t) => t.address.toLowerCase() === value.toLowerCase()
  );

  // Filter tokens by search
  const filteredTokens = WHITELISTED_TOKENS.filter((token) =>
    token.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
    token.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleTokenSelect = (token: Token) => {
    onChange(token);
    setIsOpen(false);
    setSearchTerm("");
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-sm font-medium mb-2 text-slate-200">{label}</label>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2 border border-slate-700 rounded-lg bg-slate-900 text-left text-slate-100 hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-between"
      >
        <span className="flex items-center gap-2">
          {selectedToken ? (
            <>
              <span>{selectedToken.logo || "💰"}</span>
              <span>
                {selectedToken.symbol} - {selectedToken.name}
              </span>
            </>
          ) : (
            <span className="text-slate-400">Choose a token...</span>
          )}
        </span>
        <span className="text-slate-400">▼</span>
      </button>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 border border-slate-700 bg-slate-800 rounded-lg shadow-lg">
          {/* Search Input */}
          <input
            type="text"
            placeholder="Search token..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border-b border-slate-700 bg-slate-900 text-slate-100 focus:outline-none focus:ring-0"
            autoFocus
          />

          {/* Token List */}
          <div className="max-h-64 overflow-y-auto">
            {filteredTokens.length > 0 ? (
              filteredTokens.map((token) => (
                <button
                  key={token.id}
                  onClick={() => handleTokenSelect(token)}
                  className="w-full px-4 py-3 text-left hover:bg-slate-700 text-slate-100 flex items-center justify-between border-b border-slate-700 last:border-b-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{token.logo || "💰"}</span>
                    <div>
                      <div className="font-semibold">{token.symbol}</div>
                      <div className="text-xs text-slate-400">{token.name}</div>
                    </div>
                  </div>
                  {selectedToken?.address === token.address && (
                    <span className="text-blue-400">✓</span>
                  )}
                </button>
              ))
            ) : (
              <div className="px-4 py-3 text-center text-slate-400 text-sm">
                No tokens found
              </div>
            )}
          </div>
        </div>
      )}

      {selectedToken && (
        <p className="text-xs text-slate-400 mt-1">
          Address: {selectedToken.address.slice(0, 6)}...
          {selectedToken.address.slice(-4)}
        </p>
      )}
    </div>
  );
}
