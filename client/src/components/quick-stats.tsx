import { Card, CardContent } from "@/components/ui/card";

// Quick Stats Component (Standalone)
export function QuickStats() {
  return (
    <Card data-testid="quick-stats">
      <CardContent className="p-6">
        <h3 className="text-lg font-bold text-foreground mb-4">Today's Insights</h3>
        
        <div className="space-y-4">
          <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
            <i className="fas fa-chart-line text-success"></i>
            <div>
              <div className="text-sm font-medium" data-testid="insight-scoring">High-Scoring Day</div>
              <div className="text-xs text-muted-foreground">Average of 3.2 goals per match</div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
            <i className="fas fa-bullseye text-accent"></i>
            <div>
              <div className="text-sm font-medium" data-testid="insight-accuracy">Prediction Accuracy</div>
              <div className="text-xs text-muted-foreground">82% for this gameweek</div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
            <i className="fas fa-fire text-secondary"></i>
            <div>
              <div className="text-sm font-medium" data-testid="insight-streak">Hot Streak</div>
              <div className="text-xs text-muted-foreground">Man City: 8 wins in a row</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
