import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function Header() {
  const [selectedLeague, setSelectedLeague] = useState("39"); // Premier League
  const [location] = useLocation();

  const leagues = [
    { id: "39", name: "Premier League", country: "England" },
    { id: "140", name: "La Liga", country: "Spain" },
    { id: "135", name: "Serie A", country: "Italy" },
    { id: "78", name: "Bundesliga", country: "Germany" },
    { id: "61", name: "Ligue 1", country: "France" },
    { id: "2", name: "Champions League", country: "Europe" },
  ];

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
                <a className={`${location === "/" || location === "/dashboard" ? "text-foreground" : "text-muted-foreground"} hover:text-primary font-medium transition-colors`} data-testid="nav-dashboard">
                  Dashboard
                </a>
              </Link>
              <Link href="/dashboard#predictions">
                <a className={`${location?.includes("dashboard") ? "text-muted-foreground" : "text-muted-foreground"} hover:text-primary font-medium transition-colors`} data-testid="nav-predictions">
                  Predictions
                </a>
              </Link>
              <Link href="/dashboard#teams">
                <a className="text-muted-foreground hover:text-primary font-medium transition-colors" data-testid="nav-teams">
                  Teams
                </a>
              </Link>
              <Link href="/dashboard#leagues">
                <a className="text-muted-foreground hover:text-primary font-medium transition-colors" data-testid="nav-leagues">
                  Leagues
                </a>
              </Link>
              <Link href="/dashboard#analytics">
                <a className="text-muted-foreground hover:text-primary font-medium transition-colors" data-testid="nav-statistics">
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
