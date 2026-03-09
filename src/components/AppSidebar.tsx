import {
  Calculator,
  Code,
  Terminal,
  MessageSquare,
  Target,
  BookOpen,
  LogOut,
  User,
  ChevronRight,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import prepMasterLogo from '@/assets/prepmaster-logo.png';
import { NavLink } from '@/components/NavLink';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';

const practiceAreas = [
  { title: 'Cheat Codes', url: '/cheat-codes', icon: BookOpen, color: 'text-amber-500' },
  { title: 'Aptitude MCQs', url: '/aptitude', icon: Calculator, color: 'text-blue-500' },
  { title: 'Technical MCQs', url: '/technical', icon: Code, color: 'text-emerald-500' },
  { title: 'Coding Round', url: '/coding', icon: Terminal, color: 'text-purple-500' },
  { title: 'Group Discussion', url: '/group-discussion', icon: MessageSquare, color: 'text-rose-500' },
  { title: 'Mock Test', url: '/mock-tests', icon: Target, color: 'text-cyan-500' },
  { title: 'Performance', url: '/performance', icon: BarChart3, color: 'text-orange-500' },
];

export function AppSidebar() {
  const { setOpenMobile, state, toggleSidebar } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className={cn("px-4 py-5", collapsed && "px-2 py-3")}>
        <NavLink to="/" className="flex items-center gap-3 group" onClick={() => setOpenMobile(false)}>
          <img src={prepMasterLogo} alt="PrepMaster" className="w-9 h-9 rounded-xl shrink-0 shadow-md transition-transform duration-200 group-hover:scale-105" />
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-lg font-bold text-sidebar-foreground tracking-tight">PrepMaster</span>
              <span className="text-[11px] text-muted-foreground -mt-0.5">Placement Prep Hub</span>
            </div>
          )}
        </NavLink>
      </SidebarHeader>

      <SidebarContent className={cn("px-3", collapsed && "px-1")}>
        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-3 mb-2">
              Practice Areas
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {practiceAreas.map((item, index) => {
                const active = location.pathname === item.url;
                return (
                  <SidebarMenuItem
                    key={item.title}
                    className="animate-fade-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.title}
                      size="default"
                    >
                      <NavLink
                        to={item.url}
                        className={cn(
                          "group/item relative rounded-lg transition-all duration-200 text-sidebar-foreground/70 hover:bg-accent hover:text-accent-foreground",
                          collapsed ? "px-2 py-2.5 justify-center" : "px-3 py-2.5"
                        )}
                        activeClassName="bg-primary/10 text-primary font-semibold shadow-sm"
                        onClick={() => { setOpenMobile(false); if (state !== 'collapsed') toggleSidebar(); }}
                      >
                        <div className={cn(
                          "p-1.5 rounded-md transition-colors duration-200",
                          active ? 'bg-primary/15' : 'bg-muted/50 group-hover/item:bg-accent'
                        )}>
                          <item.icon className={cn("h-4 w-4 shrink-0 transition-colors duration-200", active ? 'text-primary' : item.color)} />
                        </div>
                        {!collapsed && <span className="text-[13px] font-medium">{item.title}</span>}
                        {!collapsed && <ChevronRight className={cn("ml-auto h-3.5 w-3.5 transition-all duration-200", active ? 'opacity-100 text-primary' : 'opacity-0 group-hover/item:opacity-50')} />}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className={cn("px-3 pb-4 pt-2 border-t border-sidebar-border", collapsed && "px-1")}>
        {collapsed ? (
          <div className="flex flex-col items-center gap-2 py-2">
            <div
              className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0 ring-2 ring-primary/20"
              title={displayName}
            >
              <span className="text-[10px] font-bold text-primary">{initials}</span>
            </div>
            <button
              onClick={() => { handleSignOut(); setOpenMobile(false); }}
              className="p-1.5 rounded-md text-destructive hover:bg-destructive/10 transition-colors"
              title="Log Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 px-2 py-2 rounded-lg">
              <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0 ring-2 ring-primary/20">
                <span className="text-xs font-bold text-primary">{initials}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">{displayName}</p>
                <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={() => { handleSignOut(); setOpenMobile(false); }}
              className="flex items-center gap-2.5 px-4 py-2 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors w-full mt-1"
            >
              <LogOut className="w-4 h-4" />
              <span className="font-medium">Log Out</span>
            </button>
          </>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
