import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Standing, Team } from "@/lib/types";

export function LeagueStandings() {
  const [selectedLeague] = useState(39); // Premier League

  const { data: standings, isLoading } = useQuery({
    queryKey: ["/api/standings", selectedLeague],
    select: (data: Standing[]) => data.slice(0, 5), // Show top 5
  });

  const { data: teams } = useQuery({
    queryKey: ["/api/teams"],
  });

  const getTeam = (teamId: number): Team | undefined => {
    return teams?.find((team: Team) => team.id === teamId);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="league-standings">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-foreground">Premier League</h3>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-accent hover:text-accent/80"
            data-testid="view-all-standings"
          >
            View All
          </Button>
        </div>
        
        <div className="space-y-3">
          {standings?.map((standing: Standing) => {
            const team = getTeam(standing.teamId);
            
            return (
              <div 
                key={standing.id} 
                className="flex items-center justify-between py-2 border-b border-border last:border-b-0"
                data-testid={`standing-row-${standing.teamId}`}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium text-muted-foreground w-6" data-testid={`position-${standing.teamId}`}>
                    {standing.position}
                  </span>
                  {team?.logo ? (
                    <img 
                      src={team.logo} 
                      alt={team.name}
                      className="w-6 h-6 rounded-full object-cover"
                      data-testid={`team-logo-${standing.teamId}`}
                    />
                  ) : (
                    <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">
                        {team?.name?.substring(0, 2).toUpperCase() || "??"}
                      </span>
                    </div>
                  )}
                  <span className="font-medium text-sm" data-testid={`team-name-${standing.teamId}`}>
                    {team?.name || "Unknown Team"}
                  </span>
                </div>
                <div className="flex items-center space-x-4 text-sm">
                  <span className="text-muted-foreground" data-testid={`played-${standing.teamId}`}>
                    {standing.played}
                  </span>
                  <span className="font-medium" data-testid={`points-${standing.teamId}`}>
                    {standing.points}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        
        {(!standings || standings.length === 0) && (
          <div className="text-center py-8">
            <i className="fas fa-table text-4xl text-muted-foreground mb-4"></i>
            <p className="text-muted-foreground">No standings data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
