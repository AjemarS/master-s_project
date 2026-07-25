import { Skeleton } from "~/ui/primitives/skeleton";
import { Card, CardContent } from "~/ui/primitives/card";

export default function POSLoading() {
  return (
    <div className="space-y-6 p-8">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="pt-6">
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-20" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <Skeleton className="h-64" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
