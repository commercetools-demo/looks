import { LooksApp } from './components/looks-app';

// The application shell renders this under `/:projectKey/<entry point>` and
// already enforces the app's View permission for the route.
const ApplicationRoutes = () => <LooksApp />;
ApplicationRoutes.displayName = 'ApplicationRoutes';

export default ApplicationRoutes;
