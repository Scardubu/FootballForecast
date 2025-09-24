import { useState, useEffect } from "react";
import { useLeagueStore } from "@/hooks/use-league-store";
import { Link, useLocation } from "wouter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function Header() {
  const { selectedLeague, setSelectedLeague } = useLeagueStore();
  const [location] = useLocation();

  const [leagues, setLeagues] = useState([]);

  useEffect(() => {
    async function fetchLeagues() {
      try {
        const response = await fetch('/api/leagues');
        const data = await response.json();
        setLeagues(data);
      } catch (error) {
        console.error('Failed to fetch leagues:', error);
      }
    }

    fetchLeagues();
  }, []);

  return (
    <header className="bg-card border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <i className="fas fa-futbol text-primary-foreground text-lg"></i>
              </div>
              <div>
                <h1 className="text-xl font-bold text-primary">SabiScore</h1>
                <p className="text-xs text-muted-foreground">Analytics</p>
              </div>
            </div>
            
            <nav className="hidden md:flex space-x-6">
              <Link href="/">
                <a className={`${location === "/" || location.startsWith("/dashboard") ? "text-foreground" : "text-muted-foreground"} hover:text-primary font-medium transition-colors`} data-testid="nav-dashboard">
                  Dashboard
                </a>
              </Link>
              <Link href="/dashboard#predictions">
                <a className={`${location.includes("#predictions") ? "text-foreground" : "text-muted-foreground"} hover:text-primary font-medium transition-colors`} data-testid="nav-predictions">
                  Predictions
                </a>
              </Link>
              <Link href="/dashboard#teams">
                <a className={`${location.includes("#teams") ? "text-foreground" : "text-muted-foreground"} hover:text-primary font-medium transition-colors`} data-testid="nav-teams">
                  Teams
                </a>
              </Link>
              <Link href="/dashboard#leagues">
                <a className={`${location.includes("#leagues") ? "text-foreground" : "text-muted-foreground"} hover:text-primary font-medium transition-colors`} data-testid="nav-leagues">
                  Leagues
                </a>
              </Link>
              <Link href="/dashboard#analytics">
                <a className={`${location.includes("#analytics") ? "text-foreground" : "text-muted-foreground"} hover:text-primary font-medium transition-colors`} data-testid="nav-statistics">
                  Statistics
                </a>
              </Link>
            </nav>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* League Selector */}
            <Select value={selectedLeague} onValueChange={setSelectedLeague} data-testid="league-selector">
              <SelectTrigger className="w-48 bg-muted border border-border">
                <SelectValue placeholder="Select League" />
              </SelectTrigger>
              <SelectContent>
                {leagues.map((league) => (
                  <SelectItem key={league.id} value={league.id} data-testid={`league-option-${league.id}`}>
                    {league.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Live Indicator */}
            <div className="flex items-center space-x-2 text-sm">
              <div className="w-2 h-2 bg-success rounded-full live-pulse" data-testid="live-indicator"></div>
              <span className="text-muted-foreground">Live</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
