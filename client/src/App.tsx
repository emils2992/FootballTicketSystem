import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import { DiscordProvider } from "./context/discord-context";

function Router() {
  return (
    <Switch>
      {/* Dashboard page */}
      <Route path="/" component={Dashboard} />
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <DiscordProvider>
        <Router />
        <Toaster />
      </DiscordProvider>
    </QueryClientProvider>
  );
}

export default App;
