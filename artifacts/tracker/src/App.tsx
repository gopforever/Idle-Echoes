import { QueryClientProvider } from "@tanstack/react-query";
import { Router, Route, Switch } from "wouter";
import { queryClient } from "@/lib/queryClient";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Ghosts from "@/pages/Ghosts";
import Humans from "@/pages/Humans";
import LeaderboardPage from "@/pages/Leaderboard";
import Events from "@/pages/Events";
import Economy from "@/pages/Economy";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Layout>
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/ghosts" component={Ghosts} />
            <Route path="/humans" component={Humans} />
            <Route path="/leaderboard" component={LeaderboardPage} />
            <Route path="/events" component={Events} />
            <Route path="/economy" component={Economy} />
          </Switch>
        </Layout>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
