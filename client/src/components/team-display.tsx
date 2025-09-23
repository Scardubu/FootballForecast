import { useState } from "react";
import { getCanonicalTeam, getTeamFlag, getTeamColors } from "@shared/team-mapping";
import { cn } from "@/lib/utils";
import type { Team } from "@shared/schema";

interface TeamDisplayProps {
  team?: Team;
  size?: "sm" | "md" | "lg";
  showFlag?: boolean;
  showName?: boolean;
  className?: string;
  "data-testid"?: string;
}

export function TeamDisplay({ 
  team, 
  size = "md", 
  showFlag = false, 
  showName = true,
  className,
  "data-testid": testId
}: TeamDisplayProps) {
  const [logoError, setLogoError] = useState(false);
  
  if (!team) {
    return (
      <div className={cn("flex items-center gap-2", className)} data-testid={testId}>
        <div className={cn(
          "bg-muted rounded-full flex items-center justify-center text-muted-foreground",
          size === "sm" && "w-6 h-6 text-xs",
          size === "md" && "w-8 h-8 text-sm", 
          size === "lg" && "w-12 h-12 text-base"
        )}>
          ?
        </div>
        {showName && <span className="text-muted-foreground">Unknown Team</span>}
      </div>
    );
  }

  const canonical = getCanonicalTeam(team.id);
  const teamFlag = getTeamFlag(team.id);
  const teamColors = getTeamColors(team.id);
  const displayName = canonical?.displayName || team.name;

  const logoSize = {
    sm: "w-6 h-6",
    md: "w-8 h-8", 
    lg: "w-12 h-12"
  }[size];

  const flagSize = {
    sm: "w-4 h-3",
    md: "w-5 h-4",
    lg: "w-6 h-4"
  }[size];

  const textSize = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg"
  }[size];

  // Fallback initials with team colors
  const renderFallbackLogo = () => {
    const initials = displayName.substring(0, 2).toUpperCase();
    const bgColor = teamColors?.primary || "#6366f1";
    
    return (
      <div 
        className={cn(logoSize, "rounded-full flex items-center justify-center text-white font-bold")}
        style={{ backgroundColor: bgColor }}
        data-testid={`${testId ? testId + '-' : ''}fallback-logo`}
      >
        <span className={size === "sm" ? "text-xs" : size === "md" ? "text-sm" : "text-base"}>
          {initials}
        </span>
      </div>
    );
  };

  return (
    <div className={cn("flex items-center gap-2", className)} data-testid={testId}>
      {/* Team Logo */}
      <div className="relative">
        {team.logo && !logoError ? (
          <img
            src={team.logo}
            alt={displayName}
            className={cn(logoSize, "rounded-full object-cover")}
            onError={() => setLogoError(true)}
            data-testid={`${testId ? testId + '-' : ''}logo`}
          />
        ) : (
          renderFallbackLogo()
        )}
        
        {/* Country Flag Overlay */}
        {showFlag && teamFlag && (
          <img
            src={teamFlag}
            alt={`${canonical?.country || team.country} flag`}
            className={cn(
              flagSize,
              "absolute -bottom-1 -right-1 rounded-sm border border-white shadow-sm object-cover"
            )}
            data-testid={`${testId ? testId + '-' : ''}flag`}
          />
        )}
      </div>

      {/* Team Name */}
      {showName && (
        <span 
          className={cn("font-medium", textSize)}
          data-testid={`${testId ? testId + '-' : ''}name`}
          title={canonical?.canonicalName || displayName}
        >
          {displayName}
        </span>
      )}
    </div>
  );
}

// Additional component for compact match displays
export function MatchTeamsDisplay({
  homeTeam,
  awayTeam,
  showFlags = true,
  size = "md",
  className
}: {
  homeTeam?: Team;
  awayTeam?: Team;
  showFlags?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <TeamDisplay 
        team={homeTeam} 
        size={size}
        showFlag={showFlags}
        showName={true}
        data-testid="home-team"
      />
      
      <span className="mx-3 text-muted-foreground font-bold">
        VS
      </span>
      
      <TeamDisplay 
        team={awayTeam}
        size={size} 
        showFlag={showFlags}
        showName={true}
        data-testid="away-team"
      />
    </div>
  );
}