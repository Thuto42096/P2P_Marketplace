import { createContext, useContext } from "react";

const SearchContext = createContext({ search: "", setSearch: () => {} });

export function useSearch() {
  return useContext(SearchContext);
}

export default SearchContext;
