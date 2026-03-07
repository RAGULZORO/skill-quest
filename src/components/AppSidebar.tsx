import {
  Calculator,
  Code,
  Terminal,
  MessageSquare,
  Target,
  BookOpen,
  Brain,
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useLocation } from 'react-router-dom';
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
  useSidebar,
} from '@/components/ui/sidebar';

const practiceAreas = [
  { title: 'Cheat Codes', url: '/cheat-codes', icon: BookOpen },
  { title: 'Aptitude MCQs', url: '/aptitude', icon: Calculator },
  { title: 'Technical MCQs', url: '/technical', icon: Code },
  { title: 'Coding Round', url: '/coding', icon: Terminal },
  { title: 'Group Discussion', url: '/group-discussion', icon: MessageSquare },
  { title: 'Mock Test', url: '/mock-tests', icon: Target },
];

export function AppSidebar() {
  const { setOpenMobile } = useSidebar();
  const location = useLocation();

  return (
    <Sidebar collapsible="offcanvas" className="border-r border-sidebar-border">
      <SidebarHeader className="px-5 py-5">
        <NavLink to="/" className="flex items-center gap-3" onClick={() => setOpenMobile(false)}>
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
            <Brain className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold text-sidebar-foreground tracking-tight">PrepMaster</span>
        </NavLink>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50 px-3 mb-1">
            Practice Areas
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {practiceAreas.map((item) => {
                const active = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.title}
                      size="default"
                    >
                      <NavLink
                        to={item.url}
                        className="rounded-lg px-3 py-2.5 transition-colors text-sidebar-foreground/80 hover:bg-sidebar-accent/10 hover:text-sidebar-foreground"
                        activeClassName="bg-primary/10 text-primary font-semibold"
                        onClick={() => setOpenMobile(false)}
                      >
                        <item.icon className="h-[18px] w-[18px] shrink-0" />
                        <span className="text-[14px]">{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
