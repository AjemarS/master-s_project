import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "~/ui/primitives/alert";

interface ErrorAlertProps {
  message: string | null;
  className?: string;
}

export function ErrorAlert({ message, className }: ErrorAlertProps) {
  if (!message) return null;
  return (
    <Alert className={`mb-6 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20 ${className || ""}`}>
      <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
      <AlertDescription className="text-red-800 dark:text-red-300">
        {message}
      </AlertDescription>
    </Alert>
  );
}
