import Link from "next/link";
import { Card, CardContent, CardTitleBar } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function UserNotFound() {
  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <Card>
        <CardTitleBar>Error - User Not Found</CardTitleBar>
        <CardContent className="py-6 text-center space-y-4">
          <div className="text-4xl">:(</div>
          <h1 className="text-lg font-bold">User Not Found</h1>
          <p className="text-sm text-muted-foreground">
            The user you&apos;re looking for doesn&apos;t exist or may have been
            removed.
          </p>
          <div className="flex gap-2 justify-center pt-2">
            <Button variant="secondary" asChild>
              <Link href="/">Go Home</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
