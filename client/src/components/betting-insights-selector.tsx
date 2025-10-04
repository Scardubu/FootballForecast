/**
 * Betting Insights Fixture Selector - Choose matches for detailed betting analysis
 */

import { useState } from "react";
import { useApi } from "@/hooks/use-api";
import { useLeagueStore } from "@/hooks/use-league-store";
import { usePredictionStore } from "@/hooks/use-prediction-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarIcon, TrendingUp, Loader2 } from "lucide-react";
import { format, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import type { Fixture } from "@shared/schema";

const SUPPORTED_LEAGUES = [
  { id: "39", name: "Premier League", country: "England" },
  { id: "140", name: "La Liga", country: "Spain" },
  { id: "135", name: "Serie A", country: "Italy" },
  { id: "78", name: "Bundesliga", country: "Germany" },
  { id: "61", name: "Ligue 1", country: "France" },
  { id: "94", name: "Primeira Liga", country: "Portugal" },
];

interface BettingInsightsSelectorProps {
  onFixtureSelect?: (fixtureId: number) => void;
}

export function BettingInsightsSelector({ onFixtureSelect }: BettingInsightsSelectorProps) {
  const [selectedLeague, setSelectedLeague] = useState<string>(SUPPORTED_LEAGUES[0].id);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState<'upcoming' | 'today' | 'week'>('upcoming');
  const { generatePrediction, isGenerating } = usePredictionStore();

  // Fetch fixtures based on league and date
  const { data: fixtures, loading } = useApi<Fixture[]>(
    `/api/fixtures?league=${selectedLeague}&season=2023&status=NS&limit=20`,
    { retry: true }
  );

  const handleGeneratePrediction = async (fixtureId: number) => {
    await generatePrediction(fixtureId);
    onFixtureSelect?.(fixtureId);
  };

  const getFixturesForTab = () => {
    if (!fixtures || !Array.isArray(fixtures)) return [];
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekFromNow = addDays(today, 7);

    switch (activeTab) {
      case 'today':
        return fixtures.filter(f => {
          const fixtureDate = new Date(f.date);
          return fixtureDate >= today && fixtureDate < addDays(today, 1);
        });
      case 'week':
        return fixtures.filter(f => {
          const fixtureDate = new Date(f.date);
          return fixtureDate >= today && fixtureDate <= weekFromNow;
        });
      default:
        return fixtures.slice(0, 10);
    }
  };

  const filteredFixtures = getFixturesForTab();

  return (
    <Card className="glass-effect">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Select Match for Betting Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* League Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium">League</label>
          <Select value={selectedLeague} onValueChange={setSelectedLeague}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_LEAGUES.map(league => (
                <SelectItem key={league.id} value={league.id}>
                  <div className="flex items-center gap-2">
                    <span>{league.name}</span>
                    <span className="text-xs text-muted-foreground">({league.country})</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Time Range Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="week">This Week</TabsTrigger>
            <TabsTrigger value="upcoming">All Upcoming</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Fixtures List */}
        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {!loading && filteredFixtures.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No fixtures available for this time range
            </div>
          )}

          {!loading && filteredFixtures.map(fixture => (
            <FixtureCard
              key={fixture.id}
              fixture={fixture}
              onSelect={() => handleGeneratePrediction(fixture.id)}
              isGenerating={isGenerating}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Fixture Card Component
interface FixtureCardProps {
  fixture: Fixture;
  onSelect: () => void;
  isGenerating: boolean;
}

function FixtureCard({ fixture, onSelect, isGenerating }: FixtureCardProps) {
  const [homeTeam, setHomeTeam] = useState<string>('Loading...');
  const [awayTeam, setAwayTeam] = useState<string>('Loading...');

  // Fetch team names
  const { data: homeTeamData } = useApi<any>(`/api/teams/${fixture.homeTeamId}`, {
    disabled: !fixture.homeTeamId,
    retry: false
  });
  const { data: awayTeamData } = useApi<any>(`/api/teams/${fixture.awayTeamId}`, {
    disabled: !fixture.awayTeamId,
    retry: false
  });

  // Update team names when data loads
  if (homeTeamData?.name && homeTeam === 'Loading...') {
    setHomeTeam(homeTeamData.name);
  }
  if (awayTeamData?.name && awayTeam === 'Loading...') {
    setAwayTeam(awayTeamData.name);
  }

  const fixtureDate = new Date(fixture.date);
  const isToday = new Date().toDateString() === fixtureDate.toDateString();

  return (
    <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
      <CardContent className="p-4" onClick={onSelect}>
        <div className="flex items-center justify-between">
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{homeTeam}</span>
              <Badge variant="outline" className="text-xs">vs</Badge>
              <span className="font-medium text-sm">{awayTeam}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CalendarIcon className="h-3 w-3" />
              <span>{format(fixtureDate, 'MMM dd, yyyy')}</span>
              <span>•</span>
              <span>{format(fixtureDate, 'HH:mm')}</span>
              {isToday && (
                <Badge variant="secondary" className="text-xs ml-1">Today</Badge>
              )}
            </div>
          </div>
          <Button 
            size="sm" 
            variant="ghost"
            disabled={isGenerating}
            className="group-hover:bg-primary/10"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <TrendingUp className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
