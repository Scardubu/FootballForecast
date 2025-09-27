import { useState, useEffect } from "react";
import { useLeagueStore } from "@/hooks/use-league-store";
import { Link, useLocation } from "wouter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MobileMenu } from "./mobile-menu";

export function Header() {
  const { selectedLeague, setSelectedLeague } = useLeagueStore();
  const [location] = useLocation();
  const [leagues, setLeagues] = useState<{ id: string; name: string }[]>([]);

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
              <div className="md:hidden">
                <MobileMenu links={[
                  { href: "/", label: "Dashboard", testId: "mobile-nav-dashboard" },
                  { href: "/dashboard#predictions", label: "Predictions", testId: "mobile-nav-predictions" },
                  { href: "/dashboard#teams", label: "Teams", testId: "mobile-nav-teams" },
                  { href: "/dashboard#leagues", label: "Leagues", testId: "mobile-nav-leagues" },
                  { href: "/dashboard#analytics", label: "Statistics", testId: "mobile-nav-statistics" },
                ]} />
              </div>
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <i className="fas fa-futbol text-primary-foreground text-lg"></i>
              </div>
              <div>
                <h1 className="text-xl font-bold text-primary">SabiScore</h1>
                <p className="text-xs text-muted-foreground">Analytics</p>
              </div>
            </div>
            
            <nav className="hidden md:flex space-x-6">
              <Link
                href="/"
                className={`${location === "/" || location.startsWith("/dashboard") ? "text-foreground" : "text-muted-foreground"} hover:text-primary font-medium transition-colors`}
                data-testid="nav-dashboard"
              >
                Dashboard
              </Link>
              <Link
                href="/dashboard#predictions"
                className={`${location.includes("#predictions") ? "text-foreground" : "text-muted-foreground"} hover:text-primary font-medium transition-colors`}
                data-testid="nav-predictions"
              >
                Predictions
              </Link>
              <Link
                href="/dashboard#teams"
                className={`${location.includes("#teams") ? "text-foreground" : "text-muted-foreground"} hover:text-primary font-medium transition-colors`}
                data-testid="nav-teams"
              >
                Teams
              </Link>
              <Link
                href="/dashboard#leagues"
                className={`${location.includes("#leagues") ? "text-foreground" : "text-muted-foreground"} hover:text-primary font-medium transition-colors`}
                data-testid="nav-leagues"
              >
                Leagues
              </Link>
              <Link
                href="/dashboard#analytics"
                className={`${location.includes("#analytics") ? "text-foreground" : "text-muted-foreground"} hover:text-primary font-medium transition-colors`}
                data-testid="nav-statistics"
              >
                Statistics
              </Link>
            </nav>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* League Selector */}
            <Select value={selectedLeague} onValueChange={setSelectedLeague} data-testid="league-selector">
              <SelectTrigger className="w-[140px] md:w-48 bg-muted border border-border">
                <SelectValue placeholder="Select League" />
              </SelectTrigger>
              <SelectContent>
                {Array.isArray(leagues) && leagues.map((league) => (
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
