import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { MyRoutes } from "./routers/routes";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MyRoutes />
      <Toaster position="top-right" />
    </QueryClientProvider>
  );
}

export default App;
