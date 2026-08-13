import AppTabs from '@/components/app-tabs';

/**
 * The tab bar itself. It sits under the root Stack so that screens which are not
 * tabs — the listing detail, for one — can be pushed on top of it.
 */
export default function TabsLayout() {
  return <AppTabs />;
}
