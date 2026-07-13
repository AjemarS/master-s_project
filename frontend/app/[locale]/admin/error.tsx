"use client";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center space-y-4">
        <h2 className=" text-2xl font-bold">Admin Panel Error</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          {error.message || "Something went wrong in the admin panel. Please try again."}
        </p>
        <button
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          onClick={() => reset()}
        >
          Try again
        </button>
      </div>
    </div>
  );
}