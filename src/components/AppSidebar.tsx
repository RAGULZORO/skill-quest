import {
  Calculator,
  Code,
  Terminal,
  MessageSquare,
  Target,
  BookOpen,
  Brain,
  LogOut,
  User,
  ChevronRight,
  BarChart3,
} from 'lucide-react';
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
  const { setOpenMobile } = useSidebar();
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
    <Sidebar collapsible="offcanvas" className="border-r border-sidebar-border">
      <SidebarHeader className="px-4 py-5">
        <NavLink to="/" className="flex items-center gap-3 group" onClick={() => setOpenMobile(false)}>
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-md transition-transform duration-200 group-hover:scale-105">
            <Brain className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold text-sidebar-foreground tracking-tight">PrepMaster</span>
            <span className="text-[11px] text-muted-foreground -mt-0.5">Placement Prep Hub</span>
          </div>
        </NavLink>
      </SidebarHeader>

      <SidebarContent className="px-3">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-3 mb-2">
            Practice Areas
          </SidebarGroupLabel>
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
                        className="group/item relative rounded-lg px-3 py-2.5 transition-all duration-200 text-sidebar-foreground/70 hover:bg-accent hover:text-accent-foreground"
                        activeClassName="bg-primary/10 text-primary font-semibold shadow-sm"
                        onClick={() => setOpenMobile(false)}
                      >
                        <div className={`p-1.5 rounded-md transition-colors duration-200 ${active ? 'bg-primary/15' : 'bg-muted/50 group-hover/item:bg-accent'}`}>
                          <item.icon className={`h-4 w-4 shrink-0 transition-colors duration-200 ${active ? 'text-primary' : item.color}`} />
                        </div>
                        <span className="text-[13px] font-medium">{item.title}</span>
                        <ChevronRight className={`ml-auto h-3.5 w-3.5 transition-all duration-200 ${active ? 'opacity-100 text-primary' : 'opacity-0 group-hover/item:opacity-50'}`} />
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* User profile section at bottom */}
      <SidebarFooter className="px-3 pb-4 pt-2 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
             onClick={() => { navigate('/performance'); setOpenMobile(false); }}>
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
      </SidebarFooter>
    </Sidebar>
  );
}
