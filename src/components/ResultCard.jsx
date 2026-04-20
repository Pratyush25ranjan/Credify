export default function ResultCard({ result }) {
  if (!result) return null;

  const {
    status = "Unknown",
    reason = "No explanation available",
    trustedMatches = [],
    otherMatches = [],
  } = result;

  const isReal = status.toLowerCase().includes("real");

  return (
    <div className="mt-8">

      {/* Main Card */}
      <div className="bg-white/80 backdrop-blur-md border border-gray-200 rounded-2xl shadow-xl p-6">

        {/* Top Section */}
        <div className="flex items-center justify-between mb-4">

          {/* Title */}
          <h2 className="text-2xl font-bold text-gray-800">
            Verification Result
          </h2>

          {/* Status Badge */}
          <span
            className={`px-4 py-1 rounded-full text-sm font-semibold shadow-sm
              ${
                isReal
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}
          >
            {status}
          </span>
        </div>

        {/* Divider */}
        <div className="h-px bg-gray-200 mb-4"></div>

        {/* Reason */}
        <p className="text-gray-600 mb-6 leading-relaxed">
          {reason}
        </p>

        {/* Trusted Sources */}
        <div className="mb-6">
          <h3 className="text-green-600 font-semibold mb-2 flex items-center gap-2">
            ✅ Trusted Sources
          </h3>

          {trustedMatches.length === 0 ? (
            <p className="text-gray-400">No trusted sources found</p>
          ) : (
            <div className="space-y-2">
              {trustedMatches.map((a, i) => (
                <a
                  key={i}
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 bg-green-50 rounded-lg hover:bg-green-100 transition"
                >
                  <p className="text-blue-600 font-medium">
                    {a.title}
                  </p>
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Other Sources */}
        <div>
          <h3 className="text-yellow-600 font-semibold mb-2 flex items-center gap-2">
            ⚠️ Other Sources
          </h3>

          {otherMatches.length === 0 ? (
            <p className="text-gray-400">No additional sources</p>
          ) : (
            <div className="space-y-2">
              {otherMatches.map((a, i) => (
                <a
                  key={i}
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                >
                  <p className="text-gray-700">
                    {a.title}
                  </p>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Glow Effect */}
      <div className="absolute inset-0 blur-3xl opacity-20 bg-blue-300 -z-10 rounded-2xl"></div>
    </div>
  );
}