import React from 'react';
import { Link, useLocation } from "wouter";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

interface MobileMenuProps {
  links: Array<{
    href: string;
    label: string;
    testId?: string;
  }>;
}

export function MobileMenu({ links }: MobileMenuProps) {
  const [location] = useLocation();
  const [open, setOpen] = React.useState(false);

  const handleMenuItemClick = () => {
    setOpen(false);
  };

  const isActive = (href: string): boolean => {
    if (href === '/') {
      return location === '/' || location.startsWith('/dashboard');
    }
    return location.includes(href.split('#')[1] || '');
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="md:hidden"
          aria-label="Open navigation menu"
          aria-expanded={open}
        >
          <i className="fas fa-bars" aria-hidden="true"></i>
          <span className="sr-only">Menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[240px] sm:w-[300px]">
        <div className="py-6">
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <i className="fas fa-futbol text-primary-foreground"></i>
            </div>
            <span className="font-bold text-primary">SabiScore</span>
          </div>
          <nav className="flex flex-col space-y-4">
            {Array.isArray(links) && links.map((link) => (
              <Link key={link.href} href={link.href}>
                <a
                  data-testid={link.testId}
                  onClick={handleMenuItemClick}
                  className={`${
                    isActive(link.href)
                      ? "text-foreground"
                      : "text-muted-foreground"
                  } hover:text-primary font-medium transition-colors`}
                >
                  {link.label}
                </a>
              </Link>
            ))}
          </nav>
        </div>
      </SheetContent>
    </Sheet>
  );
}
