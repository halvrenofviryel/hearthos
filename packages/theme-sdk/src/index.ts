export type {
  ThemeContract,
  ThemePalette,
  LayoutProps,
  MessageDisplayProps,
  InputAreaProps,
  ThreadListProps,
  PlanViewProps,
  CoursePlanViewProps,
  MemoryViewProps,
  MemberCardProps,
} from './contract';

export { ThemeEventBus } from './hooks';
export type { ThemeEventMap, ThemeEventHandler } from './hooks';

export {
  ThemeProvider,
  useTheme,
  useThemeComponents,
  useThemePalette,
  useEventBus,
} from './provider';

export { VividChatTheme } from './themes/vivid-chat';
