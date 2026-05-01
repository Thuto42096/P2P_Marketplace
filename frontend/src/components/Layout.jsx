import { useState } from "react";
import Header from "./Header.jsx";
import Sidebar from "./Sidebar.jsx";
import SearchContext from "../lib/searchContext.js";

export default function Layout({ children }) {
  const [search, setSearch] = useState("");

  return (
    <SearchContext.Provider value={{ search, setSearch }}>
      <div className="flex flex-col h-full">
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto bg-fb-bg">
            <div className="max-w-6xl mx-auto px-4 py-6">{children}</div>
          </main>
        </div>
      </div>
    </SearchContext.Provider>
  );
}
