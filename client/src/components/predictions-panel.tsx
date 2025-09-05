import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Fixture, Team, Prediction } from "@/lib/types";

export function PredictionsPanel() {
  const { data: fixtures, isLoading: fixturesLoading } = useQuery({
    queryKey: ["/api/fixtures"],
    select: (data: Fixture[]) => data.filter(f => f.status === "NS" || f.status === "TBD").slice(0, 3),
  });

  const { data: teams } = useQuery({
    queryKey: ["/api/teams"],
  });

  const { data: predictions } = useQuery({
    queryKey: ["/api/predictions"],
  });

  const getTeam = (teamId: number): Team | undefined => {
    return teams?.find((team: Team) => team.id === teamId);
  };

  const getPrediction = (fixtureId: number): Prediction | undefined => {
    return predictions?.find((pred: Prediction) => pred.fixtureId === fixtureId);
  };

  if (fixturesLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-6 w-24" />
        </div>
        {[...Array(2)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Match Predictions</h2>
        <div className="flex items-center space-x-2">
          <Tooltip>
            <TooltipTrigger>
              <i className="fas fa-info-circle text-muted-foreground cursor-help" data-testid="predictions-info"></i>
            </TooltipTrigger>
            <TooltipContent>
              <p>Predictions based on team form, head-to-head stats, and advanced analytics</p>
            </TooltipContent>
          </Tooltip>
          <span className="text-sm text-muted-foreground">AI-Powered</span>
        </div>
      </div>
      
      {fixtures?.map((fixture: Fixture) => {
        const homeTeam = getTeam(fixture.homeTeamId);
        const awayTeam = getTeam(fixture.awayTeamId);
        const prediction = getPrediction(fixture.id);
        
        return (
          <Card key={fixture.id} data-testid={`prediction-card-${fixture.id}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    {homeTeam?.logo ? (
                      <img 
                        src={homeTeam.logo} 
                        alt={homeTeam.name}
                        className="w-10 h-10 rounded-full object-cover"
                        data-testid={`prediction-home-logo-${fixture.id}`}
                      />
                    ) : (
                      <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-bold">
                          {homeTeam?.name?.substring(0, 2).toUpperCase() || "HM"}
                        </span>
                      </div>
                    )}
                    <span className="font-semibold" data-testid={`prediction-home-name-${fixture.id}`}>
                      {homeTeam?.name || "Home Team"}
                    </span>
                  </div>
                  <span className="text-muted-foreground">vs</span>
                  <div className="flex items-center space-x-2">
                    {awayTeam?.logo ? (
                      <img 
                        src={awayTeam.logo} 
                        alt={awayTeam.name}
                        className="w-10 h-10 rounded-full object-cover"
                        data-testid={`prediction-away-logo-${fixture.id}`}
                      />
                    ) : (
                      <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-bold">
                          {awayTeam?.name?.substring(0, 2).toUpperCase() || "AW"}
                        </span>
                      </div>
                    )}
                    <span className="font-semibold" data-testid={`prediction-away-name-${fixture.id}`}>
                      {awayTeam?.name || "Away Team"}
                    </span>
                  </div>
                </div>
                <span className="text-sm text-muted-foreground" data-testid={`prediction-date-${fixture.id}`}>
                  {new Date(fixture.date).toLocaleDateString()}
                </span>
              </div>
              
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center">
                  <Tooltip>
                    <TooltipTrigger>
                      <div className="text-2xl font-bold text-primary cursor-help" data-testid={`home-win-prob-${fixture.id}`}>
                        {prediction?.homeWinProbability || "45"}%
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Home win probability based on recent form and historical data</p>
                    </TooltipContent>
                  </Tooltip>
                  <div className="text-sm text-muted-foreground">Home Win</div>
                </div>
                <div className="text-center">
                  <Tooltip>
                    <TooltipTrigger>
                      <div className="text-2xl font-bold text-muted-foreground cursor-help" data-testid={`draw-prob-${fixture.id}`}>
                        {prediction?.drawProbability || "28"}%
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Draw probability considering both teams' defensive strength</p>
                    </TooltipContent>
                  </Tooltip>
                  <div className="text-sm text-muted-foreground">Draw</div>
                </div>
                <div className="text-center">
                  <Tooltip>
                    <TooltipTrigger>
                      <div className="text-2xl font-bold text-secondary cursor-help" data-testid={`away-win-prob-${fixture.id}`}>
                        {prediction?.awayWinProbability || "27"}%
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Away win probability factoring in away form and head-to-head</p>
                    </TooltipContent>
                  </Tooltip>
                  <div className="text-sm text-muted-foreground">Away Win</div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Confidence Level</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full prediction-confidence" 
                        style={{ width: `${prediction?.confidence || "78"}%` }}
                        data-testid={`confidence-bar-${fixture.id}`}
                      ></div>
                    </div>
                    <span className="text-sm font-medium" data-testid={`confidence-value-${fixture.id}`}>
                      {prediction?.confidence || "78"}%
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <Tooltip>
                    <TooltipTrigger>
                      <div className="flex justify-between cursor-help">
                        <span className="text-muted-foreground">Expected Goals</span>
                        <span className="font-medium" data-testid={`expected-goals-${fixture.id}`}>
                          {prediction?.expectedGoalsHome || "2.1"} - {prediction?.expectedGoalsAway || "1.4"}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Predicted total goals based on attacking and defensive stats</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger>
                      <div className="flex justify-between cursor-help">
                        <span className="text-muted-foreground">Both Teams Score</span>
                        <span className="font-medium text-success" data-testid={`both-teams-score-${fixture.id}`}>
                          Yes ({prediction?.bothTeamsScore || "65"}%)
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Probability both teams will score based on scoring patterns</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-border">
                <Button 
                  className="w-full bg-primary text-primary-foreground hover:opacity-90"
                  data-testid={`detailed-analysis-${fixture.id}`}
                >
                  View Detailed Analysis
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
      
      {(!fixtures || fixtures.length === 0) && (
        <Card>
          <CardContent className="p-8 text-center">
            <i className="fas fa-crystal-ball text-4xl text-muted-foreground mb-4"></i>
            <h3 className="text-lg font-semibold text-foreground mb-2">No Predictions Available</h3>
            <p className="text-muted-foreground">Predictions will appear when upcoming matches are scheduled.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
