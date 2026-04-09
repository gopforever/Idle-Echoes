import { RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export default function ErrorState({ message = "Failed to load data", onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <div className="h-12 w-12 rounded-full bg-red-900/30 flex items-center justify-center">
        <RefreshCcw className="h-6 w-6 text-red-400" />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">API Offline</p>
        <p className="text-xs text-muted-foreground mt-1">{message}</p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCcw className="h-3.5 w-3.5 mr-1.5" />
          Retry
        </Button>
      )}
    </div>
  );
}
