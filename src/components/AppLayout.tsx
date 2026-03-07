import React from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/hooks/useAdmin';
import { useTheme } from '@/hooks/useTheme';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  User,
  Settings,
  LogOut,
  ChevronRight,
  Sun,
  Moon,
  Target,
} from 'lucide-react';
import { useState } from 'react';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen flex w-full">
        <AppSidebar />

        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar */}
          <header className="sticky top-0 z-50 h-14 flex items-center justify-between border-b border-border bg-background/80 backdrop-blur-sm px-4">
            <SidebarTrigger />

            <div className="flex items-center gap-3">
              {isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/admin')}
                  className="hidden sm:flex items-center gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Admin
                </Button>
              )}

              <div className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted hover:bg-muted/70 transition-colors cursor-pointer"
                >
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-foreground font-medium hidden sm:inline">
                    {user?.user_metadata?.full_name || user?.email?.split('@')[0]}
                  </span>
                  <ChevronRight
                    className={`w-3 h-3 text-muted-foreground transition-transform ${profileOpen ? 'rotate-90' : ''}`}
                  />
                </button>

                {profileOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-52 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden animate-fade-in">
                      <button
                        onClick={() => { navigate('/performance'); setProfileOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
                      >
                        <Target className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium text-foreground">Performance</span>
                      </button>
                      <div className="border-t border-border" />
                      <button
                        onClick={() => { handleSignOut(); setProfileOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-destructive"
                      >
                        <LogOut className="w-4 h-4" />
                        <span className="text-sm font-medium">Log Out</span>
                      </button>
                    </div>
                  </>
                )}
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="text-muted-foreground hover:text-foreground"
              >
                {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              </Button>
            </div>
          </header>

          <main className="flex-1">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
