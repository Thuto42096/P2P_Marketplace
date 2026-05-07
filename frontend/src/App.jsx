import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAccount } from "wagmi";
import Layout from "./components/Layout.jsx";
import Browse from "./pages/Browse.jsx";
import ListingDetail from "./pages/ListingDetail.jsx";
import CreateListing from "./pages/CreateListing.jsx";
import SellerDashboard from "./pages/SellerDashboard.jsx";
import BuyerDashboard from "./pages/BuyerDashboard.jsx";
import Messages from "./pages/Messages.jsx";
import Login from "./pages/Login.jsx";

function RequireWallet({ children }) {
  const { isConnected, isConnecting, isReconnecting } = useAccount();
  const location = useLocation();

  if (isConnecting || isReconnecting) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-fb-subtle">
        Connecting wallet…
      </div>
    );
  }

  if (!isConnected) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          <RequireWallet>
            <Layout>
              <Routes>
                <Route path="/" element={<Browse />} />
                <Route path="/listing/:id" element={<ListingDetail />} />
                <Route path="/sell" element={<SellerDashboard />} />
                <Route path="/sell/new" element={<CreateListing />} />
                <Route path="/buy" element={<BuyerDashboard />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="/messages/:id" element={<Messages />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          </RequireWallet>
        }
      />
    </Routes>
  );
}
