"use client";

import { useState, useRef, useEffect } from "react";
import { SEPOLIA_TOKENS, Token, formatToken } from "@/lib/tokens";

interface TokenSelectorProps {
  value: string;
  onChange: (token: Token) => void;
  label?: string;
  allowCustom?: boolean;
}

export function TokenSelector({
  value,
  onChange,
  label = "Select Token",
  allowCustom = true,
}: TokenSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [customAddress, setCustomAddress] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Find current selected token
  const selectedToken = SEPOLIA_TOKENS.find(
    (t) => t.address.toLowerCase() === value.toLowerCase()
  );

  // Filter tokens by search
  const filteredTokens = SEPOLIA_TOKENS.filter((token) =>
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
        setShowCustomInput(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleTokenSelect = (token: Token) => {
    onChange(token);
    setIsOpen(false);
    setSearchTerm("");
    setShowCustomInput(false);
  };

  const handleCustomSubmit = () => {
    if (
      customAddress.match(/^0x[a-fA-F0-9]{40}$/)
    ) {
      const customToken: Token = {
        id: "custom",
        name: "Custom Token",
        symbol: customAddress.slice(0, 6) + "...",
        address: customAddress,
        decimals: 18,
        logo: "❓",
      };
      onChange(customToken);
      setIsOpen(false);
      setCustomAddress("");
      setShowCustomInput(false);
    }
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

          {/* Custom Token Option */}
          {allowCustom && !showCustomInput && (
            <button
              onClick={() => setShowCustomInput(true)}
              className="w-full px-4 py-3 text-left hover:bg-blue-50 text-blue-600 border-t border-gray-200 flex items-center gap-2"
            >
              <span>➕</span>
              <span>Add Custom Token</span>
            </button>
          )}

          {/* Custom Token Input */}
          {allowCustom && showCustomInput && (
            <div className="px-4 py-3 border-t border-gray-200 space-y-2">
              <input
                type="text"
                placeholder="Token contract address (0x...)"
                value={customAddress}
                onChange={(e) => setCustomAddress(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleCustomSubmit}
                  disabled={!customAddress.match(/^0x[a-fA-F0-9]{40}$/)}
                  className="flex-1 px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    setShowCustomInput(false);
                    setCustomAddress("");
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
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
