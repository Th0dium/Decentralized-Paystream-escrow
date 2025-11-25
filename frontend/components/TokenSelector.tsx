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
      <label className="block text-sm font-medium mb-2">{label}</label>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-left hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-between"
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
            <span className="text-gray-500">Choose a token...</span>
          )}
        </span>
        <span className="text-gray-400">▼</span>
      </button>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 border border-gray-300 bg-white rounded-lg shadow-lg">
          {/* Search Input */}
          <input
            type="text"
            placeholder="Search token..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border-b border-gray-200 focus:outline-none focus:ring-0"
            autoFocus
          />

          {/* Token List */}
          <div className="max-h-64 overflow-y-auto">
            {filteredTokens.length > 0 ? (
              filteredTokens.map((token) => (
                <button
                  key={token.id}
                  onClick={() => handleTokenSelect(token)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-100 flex items-center justify-between border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{token.logo || "💰"}</span>
                    <div>
                      <div className="font-semibold">{token.symbol}</div>
                      <div className="text-xs text-gray-500">{token.name}</div>
                    </div>
                  </div>
                  {selectedToken?.address === token.address && (
                    <span className="text-blue-600">✓</span>
                  )}
                </button>
              ))
            ) : (
              <div className="px-4 py-3 text-center text-gray-500 text-sm">
                No tokens found
              </div>
            )}
          </div>
        </div>
      )}

      {selectedToken && (
        <p className="text-xs text-gray-500 mt-1">
          Address: {selectedToken.address.slice(0, 6)}...
          {selectedToken.address.slice(-4)}
        </p>
      )}
    </div>
  );
}
