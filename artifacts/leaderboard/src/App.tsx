import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Leaderboard from "@/pages/Leaderboard";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Leaderboard />
    </QueryClientProvider>
  );
}

export default App;
