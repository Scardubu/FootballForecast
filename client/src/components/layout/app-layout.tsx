import React from "react";
import { Header } from "@/components/header";
import { SkipToMain } from "@/components/accessibility";

export interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-background">
      <SkipToMain />
      <Header />
      <main id="main-content" role="main" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
      <footer className="bg-card border-t border-border mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <i className="fas fa-futbol text-primary-foreground"></i>
                </div>
                <span className="font-bold text-primary">SabiScore Analytics</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Real-time football insights powered by advanced analytics and AI predictions.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-3">Features</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Live Match Tracking</li>
                <li>AI Predictions</li>
                <li>Team Analytics</li>
                <li>Historical Data</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-3">Data Sources</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>API-Football</li>
                <li>Real-time Updates</li>
                <li>15-second Refresh</li>
                <li>1100+ Leagues</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-3">Connect</h4>
              <div className="flex space-x-4">
                <a href="#" className="text-muted-foreground hover:text-primary">
                  <i className="fab fa-twitter"></i>
                </a>
                <a href="#" className="text-muted-foreground hover:text-primary">
                  <i className="fab fa-facebook"></i>
                </a>
                <a href="#" className="text-muted-foreground hover:text-primary">
                  <i className="fab fa-instagram"></i>
                </a>
              </div>
            </div>
          </div>

          <div className="border-t border-border mt-8 pt-8 text-center">
            <p className="text-sm text-muted-foreground">
              © 2025 SabiScore Analytics. All rights reserved. | Data provided by API-Football
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
