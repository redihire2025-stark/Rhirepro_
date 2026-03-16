import { useNavigate, useRouteError } from "react-router";
import { Button } from "../components/ui/button";
import { Home, RefreshCw } from "lucide-react";

export default function ErrorPage() {
  const navigate = useNavigate();
  const error = useRouteError() as any;

  return (
    <div className="min-h-screen bg-[#F6F6F6] flex items-center justify-center p-4">
      <div className="text-center max-w-2xl">
        <div className="text-8xl mb-6">⚠️</div>
        <h1 className="text-4xl font-bold text-[#3A1F1F] mb-4">Oops! Something went wrong</h1>
        <p className="text-[#8A8A8A] mb-6">
          We encountered an unexpected error. Please try again or return to the home page.
        </p>
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-left">
            <p className="text-sm text-red-800 font-mono">
              {error.statusText || error.message || "Unknown error"}
            </p>
          </div>
        )}
        <div className="flex gap-4 justify-center">
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            className="border-2 border-[#FF2B2B] text-[#FF2B2B] hover:bg-[#FF2B2B] hover:text-white rounded-full px-6"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Page
          </Button>
          <Button
            onClick={() => navigate("/")}
            className="bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full px-6"
          >
            <Home className="h-4 w-4 mr-2" />
            Go Home
          </Button>
        </div>
      </div>
    </div>
  );
}
