import { Outlet } from "react-router-dom";

import Navbar from "./Navbar";
import Footer from "./Footer";
import DemandAssistantChat from "../chat/DemandAssistantChat";

function AppShell() {
  return (
    <div className="min-h-screen flex flex-col justify-between">
      <div>
        <Navbar />
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
      <DemandAssistantChat />
      <Footer />
    </div>
  );
}

export default AppShell;
