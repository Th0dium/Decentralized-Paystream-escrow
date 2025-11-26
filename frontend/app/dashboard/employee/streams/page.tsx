"use client";

import { Card } from "@/components/Card";
import { useAuth, useEmployeeStreams } from "@/lib/hooks";

export default function EmployeeStreamsPage() {
  const { walletAddress } = useAuth();
  const { streams, loading, error } = useEmployeeStreams(walletAddress);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg text-gray-600">Loading streams...</div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <div className="text-red-600">Error: {error}</div>
      </Card>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">My Salary Streams</h1>

      {streams.length === 0 ? (
        <Card>
          <p className="text-center text-gray-600 py-8">
            You have no active streams. Contact your company to create one.
          </p>
        </Card>
      ) : (
        <div className="grid gap-6">
          {streams.map((stream) => (
            <Card key={stream.streamId}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold">
                    Stream #{stream.streamId}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Company: {stream.company.slice(0, 6)}...
                    {stream.company.slice(-4)}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    stream.cancelled
                      ? "bg-red-100 text-red-700"
                      : stream.paused
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-green-100 text-green-700"
                  }`}
                >
                  {stream.cancelled ? "Cancelled" : stream.paused ? "Paused" : "Active"}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <div className="text-sm text-gray-600">Total Amount</div>
                  <div className="text-lg font-semibold">
                    {(BigInt(stream.totalAmount) / BigInt(10 ** 18)).toString()} Tokens
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Withdrawn</div>
                  <div className="text-lg font-semibold">
                    {(BigInt(stream.withdrawn) / BigInt(10 ** 18)).toString()} Tokens
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Escrowed</div>
                  <div className="text-lg font-semibold text-purple-600">
                    {(BigInt(stream.escrowed) / BigInt(10 ** 18)).toString()} Tokens
                  </div>
                </div>
              </div>

              <div className="text-sm text-gray-600">
                <p>Start: {new Date(stream.startTime * 1000).toLocaleDateString()}</p>
                <p>End: {new Date(stream.stopTime * 1000).toLocaleDateString()}</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
