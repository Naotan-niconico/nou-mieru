export function Field({
  label,
  children,
  error,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-lg font-bold text-stone-900">{label}</span>
      {children}
      {error ? <span className="mt-2 block text-base font-bold text-red-700">{error}</span> : null}
    </label>
  );
}

export const inputClass =
  "w-full rounded-xl border border-stone-300 bg-white px-4 py-4 text-xl text-stone-950 outline-none focus:border-green-600 focus:ring-4 focus:ring-green-100";

export const buttonClass =
  "w-full rounded-2xl bg-green-700 px-5 py-5 text-xl font-bold text-white shadow-sm hover:bg-green-800 disabled:bg-stone-300";

export const subButtonClass =
  "w-full rounded-2xl border border-green-200 bg-white px-5 py-4 text-lg font-bold text-green-900 hover:bg-green-50";

export function ErrorMessage({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-lg font-bold text-red-800">
      {message}
    </div>
  );
}
