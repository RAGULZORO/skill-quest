import React, { useState } from 'react';
import prepMasterLogo from '@/assets/prepmaster-logo.png';
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
  Sun,
  Moon,
  Target,
  Menu } from
'lucide-react';

export function AppLayout({ children }: {children: React.ReactNode;}) {
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
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />

        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar */}
          <header className="sticky top-0 z-50 h-14 flex items-center justify-between border-b border-border bg-background px-4">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="text-foreground hover:bg-muted" />
              <div className="flex items-center gap-2">
                <img src={prepMasterLogo} alt="PrepMaster" className="w-7 h-7 rounded-lg shadow-sm" />
                <span className="text-foreground text-lg font-bold tracking-tight">PrepMaster</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isAdmin &&
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/admin')}
                className="text-muted-foreground hover:text-foreground">
                
                  <Settings className="w-4 h-4" />
                  <span className="hidden sm:inline ml-1.5">Admin</span>
                </Button>
              }

              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="text-muted-foreground hover:text-foreground">
                
                {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </Button>

              {/* Profile dropdown */}
              <div className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-muted transition-colors cursor-pointer">
                  
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <span className="text-sm text-foreground font-medium hidden sm:inline max-w-[120px] truncate">
                    {user?.user_metadata?.full_name || user?.email?.split('@')[0]}
                  </span>
                </button>

                {profileOpen &&
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                    <div className="absolute right-0 top-full mt-1.5 w-48 bg-popover border border-border rounded-lg shadow-lg z-50 overflow-hidden py-1">
                      <button
                      onClick={() => {navigate('/performance');setProfileOpen(false);}}
                      className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-muted transition-colors text-sm text-foreground">
                      
                        <Target className="w-4 h-4 text-primary" />
                        Performance
                      </button>
                      <div className="border-t border-border mx-2 my-1" />
                      <button
                      onClick={() => {handleSignOut();setProfileOpen(false);}}
                      className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-muted transition-colors text-sm text-destructive">
                      
                        <LogOut className="w-4 h-4" />
                        Log Out
                      </button>
                    </div>
                  </>
                }
              </div>
            </div>
          </header>

          <main className="flex-1">{children}</main>
        </div>
      </div>
    </SidebarProvider>);

}