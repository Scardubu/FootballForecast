import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Fixture, Team, League } from "@/lib/types";

interface FixtureSelectorProps {
  onFixtureSelect: (fixture: Fixture) => void;
  selectedFixture?: Fixture | null;
}

export function FixtureSelector({ onFixtureSelect, selectedFixture }: FixtureSelectorProps) {
  const [selectedLeague, setSelectedLeague] = useState("39"); // Premier League
  const [dateFilter, setDateFilter] = useState("upcoming");
  const [searchTerm, setSearchTerm] = useState("");

  const topLeagues = [
    { id: "39", name: "Premier League", country: "England", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
    { id: "140", name: "La Liga", country: "Spain", flag: "🇪🇸" },
    { id: "135", name: "Serie A", country: "Italy", flag: "🇮🇹" },
    { id: "78", name: "Bundesliga", country: "Germany", flag: "🇩🇪" },
    { id: "61", name: "Ligue 1", country: "France", flag: "🇫🇷" },
    { id: "94", name: "Primeira Liga", country: "Portugal", flag: "🇵🇹" },
  ];

  const { data: fixtures, isLoading } = useQuery({
    queryKey: ["/api/fixtures", selectedLeague, dateFilter],
    select: (data: Fixture[]) => {
      let filtered = data;
      
      // Filter by date
      if (dateFilter === "upcoming") {
        filtered = data.filter(f => f.status === "NS" || f.status === "TBD");
      } else if (dateFilter === "today") {
        const today = new Date().toDateString();
        filtered = data.filter(f => new Date(f.date).toDateString() === today);
      }
      
      // Filter by search term
      if (searchTerm) {
        filtered = filtered.filter(f => 
          teams?.find(t => t.id === f.homeTeamId)?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          teams?.find(t => t.id === f.awayTeamId)?.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      return filtered.slice(0, 20); // Limit to 20 fixtures
    }
  });

  const { data: teams } = useQuery({
    queryKey: ["/api/teams"],
  });

  const getTeam = (teamId: number): Team | undefined => {
    return teams?.find((team: Team) => team.id === teamId);
  };

  const getFixtureDisplayData = (fixture: Fixture) => {
    const homeTeam = getTeam(fixture.homeTeamId);
    const awayTeam = getTeam(fixture.awayTeamId);
    const matchDate = new Date(fixture.date);
    
    return {
      homeTeam,
      awayTeam,
      date: matchDate.toLocaleDateString(),
      time: matchDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isToday: matchDate.toDateString() === new Date().toDateString(),
      isPastWeek: (Date.now() - matchDate.getTime()) < 7 * 24 * 60 * 60 * 1000,
    };
  };

  const getPredictionPreview = (fixture: Fixture) => {
    // Mock prediction preview - in real app would fetch from API
    return {
      homeWinProb: 45 + Math.random() * 30,
      confidence: 60 + Math.random() * 30,
      keyFactor: ["Home advantage", "Recent form", "Head-to-head"][Math.floor(Math.random() * 3)]
    };
  };

  if (isLoading) {
    return (
      <Card data-testid="fixture-selector">
        <CardHeader>
          <CardTitle>Select Match for Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="fixture-selector">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Select Match for AI Analysis</span>
          <Badge variant="secondary" className="text-xs">
            <i className="fas fa-brain mr-1"></i>
            ML-Powered
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Select value={selectedLeague} onValueChange={setSelectedLeague}>
            <SelectTrigger data-testid="league-filter">
              <SelectValue placeholder="Select League" />
            </SelectTrigger>
            <SelectContent>
              {topLeagues.map((league) => (
                <SelectItem key={league.id} value={league.id}>
                  <span className="flex items-center">
                    <span className="mr-2">{league.flag}</span>
                    {league.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger data-testid="date-filter">
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="upcoming">Upcoming Matches</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="all">All Matches</SelectItem>
            </SelectContent>
          </Select>

          <Input
            placeholder="Search teams..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            data-testid="team-search"
            className="w-full"
          />
        </div>

        {/* Fixtures List */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {fixtures?.map((fixture: Fixture) => {
            const { homeTeam, awayTeam, date, time, isToday, isPastWeek } = getFixtureDisplayData(fixture);
            const prediction = getPredictionPreview(fixture);
            const isSelected = selectedFixture?.id === fixture.id;

            return (
              <div
                key={fixture.id}
                className={`p-4 rounded-lg border transition-all cursor-pointer hover:shadow-md ${
                  isSelected 
                    ? 'border-primary bg-primary/5 shadow-lg' 
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => onFixtureSelect(fixture)}
                data-testid={`fixture-${fixture.id}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    {/* Home Team */}
                    <div className="flex items-center space-x-2 flex-1">
                      {homeTeam?.logo ? (
                        <img 
                          src={homeTeam.logo} 
                          alt={homeTeam.name}
                          className="w-6 h-6 rounded-full object-cover"
                          data-testid={`home-logo-${fixture.id}`}
                        />
                      ) : (
                        <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-bold">
                            {homeTeam?.name?.substring(0, 2).toUpperCase() || "HM"}
                          </span>
                        </div>
                      )}
                      <span className="font-medium text-sm" data-testid={`home-name-${fixture.id}`}>
                        {homeTeam?.name || "Home Team"}
                      </span>
                    </div>

                    <span className="text-muted-foreground text-sm">vs</span>

                    {/* Away Team */}
                    <div className="flex items-center space-x-2 flex-1">
                      {awayTeam?.logo ? (
                        <img 
                          src={awayTeam.logo} 
                          alt={awayTeam.name}
                          className="w-6 h-6 rounded-full object-cover"
                          data-testid={`away-logo-${fixture.id}`}
                        />
                      ) : (
                        <div className="w-6 h-6 bg-secondary rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-bold">
                            {awayTeam?.name?.substring(0, 2).toUpperCase() || "AW"}
                          </span>
                        </div>
                      )}
                      <span className="font-medium text-sm" data-testid={`away-name-${fixture.id}`}>
                        {awayTeam?.name || "Away Team"}
                      </span>
                    </div>
                  </div>

                  {/* Match Info & Prediction Preview */}
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="text-sm font-medium">{date}</div>
                      <div className="text-xs text-muted-foreground">{time}</div>
                    </div>

                    {/* Prediction Preview */}
                    <div className="text-right">
                      <Tooltip>
                        <TooltipTrigger>
                          <div className="text-sm font-bold text-primary">
                            {prediction.homeWinProb.toFixed(0)}%
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {prediction.confidence.toFixed(0)}% confidence
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Home win probability: {prediction.homeWinProb.toFixed(1)}%</p>
                          <p>Key factor: {prediction.keyFactor}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>

                    {/* Status Badges */}
                    <div className="flex flex-col space-y-1">
                      {isToday && (
                        <Badge variant="secondary" className="text-xs">
                          Today
                        </Badge>
                      )}
                      {isPastWeek && (
                        <Badge variant="outline" className="text-xs">
                          Recent
                        </Badge>
                      )}
                      {isSelected && (
                        <Badge variant="default" className="text-xs">
                          <i className="fas fa-check mr-1"></i>
                          Selected
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Prediction Summary */}
                {isSelected && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="grid grid-cols-3 gap-4 text-xs">
                      <div className="text-center">
                        <div className="font-medium text-primary">
                          {prediction.homeWinProb.toFixed(0)}%
                        </div>
                        <div className="text-muted-foreground">Home Win</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-muted-foreground">
                          {(100 - prediction.homeWinProb - 25).toFixed(0)}%
                        </div>
                        <div className="text-muted-foreground">Draw</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-secondary">
                          25%
                        </div>
                        <div className="text-muted-foreground">Away Win</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {(!fixtures || fixtures.length === 0) && (
            <div className="text-center py-8">
              <i className="fas fa-calendar-times text-4xl text-muted-foreground mb-4"></i>
              <h3 className="text-lg font-semibold text-foreground mb-2">No Matches Found</h3>
              <p className="text-muted-foreground">
                Try adjusting your filters or selecting a different league.
              </p>
            </div>
          )}
        </div>

        {/* Action Button */}
        {selectedFixture && (
          <div className="mt-6 pt-4 border-t border-border">
            <Button 
              className="w-full bg-primary text-primary-foreground hover:opacity-90"
              data-testid="analyze-fixture-button"
            >
              <i className="fas fa-chart-line mr-2"></i>
              Analyze Selected Match with AI
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}