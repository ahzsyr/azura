/**
 * Loading state for marketing pages
 * Provides instant visual feedback during navigation
 */
export default function Loading() {
  return (
    <div className="route-loading-overlay route-loading-overlay--minimal">
      <div className="nav-progress" />
    </div>
  );
}
