import Link from "next/link";
import { Card, CardContent, CardTitleBar } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <Card>
        <CardTitleBar>Error - Page Not Found</CardTitleBar>
        <CardContent className="py-6 text-center space-y-4">
          <div className="text-4xl">:(</div>
          <h1 className="text-lg font-bold">404 - Page Not Found</h1>
          <p className="text-sm text-muted-foreground">
            The page you&apos;re looking for doesn&apos;t exist or has been
            moved.
          </p>
          <div className="flex gap-2 justify-center pt-2">
            <Button variant="secondary" asChild>
              <Link href="/">Go Home</Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link href="/browse">Browse Sources</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
