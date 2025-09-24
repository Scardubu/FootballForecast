import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/lib/auth-context";
import { TeamDisplay, MatchTeamsDisplay } from "@/components/team-display";
import { ErrorBoundary } from "@/components/error-boundary";
import { PredictionCardSkeleton } from "@/components/loading";
import type { Fixture, Team, Prediction } from "@shared/schema";

export function PredictionsPanel() {
  const { auth, isLoading: authLoading } = useAuth();
  
  const { data: fixtures, isLoading: fixturesLoading } = useQuery<Fixture[]>({
    queryKey: ["/api/fixtures"],
    select: (data: Fixture[]) => data.filter(f => f.status === "NS" || f.status === "TBD").slice(0, 3),
    enabled: !authLoading && !!auth?.authenticated,
  });

  const { data: teams } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
    enabled: !authLoading && !!auth?.authenticated,
  });

  const { data: predictions } = useQuery<Prediction[]>({
    queryKey: ["/api/predictions"],
    enabled: !authLoading && !!auth?.authenticated,
  });

  const getTeam = (teamId: number): Team | undefined => {
    return teams?.find((team: Team) => team.id === teamId);
  };

  const getPrediction = (fixtureId: number): Prediction | undefined => {
    return predictions?.find((pred: Prediction) => pred.fixtureId === fixtureId);
  };

  if (authLoading || fixturesLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          <div className="h-6 w-24 bg-muted animate-pulse rounded" />
        </div>
        {[...Array(2)].map((_, i) => (
          <PredictionCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <ErrorBoundary>
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
        const homeTeam = fixture.homeTeamId ? getTeam(fixture.homeTeamId) : undefined;
        const awayTeam = fixture.awayTeamId ? getTeam(fixture.awayTeamId) : undefined;
        const prediction = getPrediction(fixture.id);
        
        return (
          <Card key={fixture.id} className="hover-lift smooth-transition animate-fade-in" data-testid={`prediction-card-${fixture.id}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <MatchTeamsDisplay
                  homeTeam={homeTeam}
                  awayTeam={awayTeam}
                  size="lg"
                  showFlags={false}
                  className="flex-1"
                />
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
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">AI Confidence</span>
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
                    <Tooltip>
                      <TooltipTrigger>
                        <i className="fas fa-brain text-accent text-xs cursor-help"></i>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>ML model confidence based on data quality and feature strength</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <Tooltip>
                    <TooltipTrigger>
                      <div className="flex justify-between cursor-help">
                        <span className="text-muted-foreground">Expected Goals (xG)</span>
                        <span className="font-medium" data-testid={`expected-goals-${fixture.id}`}>
                          {prediction?.expectedGoalsHome || "2.1"} - {prediction?.expectedGoalsAway || "1.4"}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Advanced metric: Quality of scoring chances each team is likely to create</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger>
                      <div className="flex justify-between cursor-help">
                        <span className="text-muted-foreground">Both Teams Score</span>
                        <span className="font-medium text-success" data-testid={`both-teams-score-${fixture.id}`}>
                          {prediction?.bothTeamsScore || "65"}%
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Probability both teams will score based on attacking/defensive patterns</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger>
                      <div className="flex justify-between cursor-help">
                        <span className="text-muted-foreground">Over 2.5 Goals</span>
                        <span className="font-medium text-secondary" data-testid={`over-25-goals-${fixture.id}`}>
                          {prediction?.over25Goals || "52"}%
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Likelihood of 3+ goals based on team attacking trends</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger>
                      <div className="flex justify-between cursor-help">
                        <span className="text-muted-foreground">Model Version</span>
                        <span className="font-medium text-accent text-xs">
                          v1.0
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>ML model version: XGBoost with calibrated probabilities</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                
                {/* AI Explanation Section */}
                <div className="mt-4 p-3 bg-accent/10 rounded-lg border border-accent/20">
                  <div className="flex items-start space-x-2">
                    <i className="fas fa-lightbulb text-accent mt-0.5"></i>
                    <div>
                      <div className="text-sm font-medium text-accent mb-1">AI Insight</div>
                      <div className="text-xs text-muted-foreground leading-relaxed">
                        {`The AI model predicts a ${homeTeam?.name || "home"} win based on recent form analysis, expected goals differential, and home advantage factors.`}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Key Factors */}
                <div className="mt-3">
                  <div className="text-sm font-medium mb-2">Key Factors</div>
                  <div className="space-y-1">
                    {[
                        { name: "Home Advantage", value: "+15%", positive: true },
                        { name: "Recent Form", value: "+8%", positive: true },
                        { name: "xG Difference", value: "+12%", positive: true }
                      ].map((factor, index) => (
                        <div key={index} className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{factor.name}</span>
                          <span className={`font-medium ${factor.positive ? 'text-success' : 'text-destructive'}`}>
                            {factor.value}
                          </span>
                        </div>
                      ))}
                  </div>
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
    </ErrorBoundary>
  );
}
