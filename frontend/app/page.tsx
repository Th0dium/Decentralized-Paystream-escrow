import Link from "next/link";
import Header from "@/components/Header";

export default function Home() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-gray-900 mb-4">
              Paystream
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Decentralized Salary Streaming & Milestone-Based Escrow
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
              <div className="bg-white rounded-lg shadow-md p-8">
                <h3 className="text-xl font-semibold mb-4">💼 For Companies</h3>
                <p className="text-gray-600 mb-6">
                  Stream salaries to employees automatically. Set custom escrow
                  percentages and manage payments effortlessly.
                </p>
              </div>

              <div className="bg-white rounded-lg shadow-md p-8">
                <h3 className="text-xl font-semibold mb-4">👥 For Employees</h3>
                <p className="text-gray-600 mb-6">
                  Withdraw funds as they unlock. Submit milestones and claim
                  escrowed funds after approval.
                </p>
              </div>

              <div className="bg-white rounded-lg shadow-md p-8">
                <h3 className="text-xl font-semibold mb-4">✅ For Auditors</h3>
                <p className="text-gray-600 mb-6">
                  Review milestone submissions with evidence and approve or
                  reject claims securely.
                </p>
              </div>
            </div>

            <Link href="/login" className="btn-primary text-lg px-8 py-3">
              Get Started
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
