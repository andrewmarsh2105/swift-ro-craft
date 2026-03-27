import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand";

const NotFound = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="text-center space-y-6 max-w-sm">
        <Logo variant="full" scheme="auto" size="md" className="mx-auto text-foreground" />
        <div className="space-y-2">
          <p className="text-6xl font-black tabular-nums text-foreground/15">404</p>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Page not found</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            This page doesn't exist or may have been moved. Head back to your dashboard.
          </p>
        </div>
        <Button asChild size="lg" className="gap-2">
          <Link to="/">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
