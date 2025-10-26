import { Card, CardContent } from "@/components/ui/card";
import { Construction } from "lucide-react";

interface PlaceholderProps {
  title: string;
  description: string;
}

export default function Placeholder({ title, description }: PlaceholderProps) {
  return (
    <div className="flex items-center justify-center min-h-[60vh] animate-in fade-in duration-500">
      <Card className="max-w-md w-full shadow-lg">
        <CardContent className="pt-6 text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-4 rounded-full bg-accent/10">
              <Construction className="h-12 w-12 text-accent" />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">{title}</h2>
            <p className="text-muted-foreground">{description}</p>
          </div>
          <p className="text-sm text-muted-foreground italic">
            This feature is coming soon. Stay tuned!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
