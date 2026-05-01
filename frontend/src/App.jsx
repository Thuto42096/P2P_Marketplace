import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import Browse from "./pages/Browse.jsx";
import ListingDetail from "./pages/ListingDetail.jsx";
import CreateListing from "./pages/CreateListing.jsx";
import SellerDashboard from "./pages/SellerDashboard.jsx";
import BuyerDashboard from "./pages/BuyerDashboard.jsx";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Browse />} />
        <Route path="/listing/:id" element={<ListingDetail />} />
        <Route path="/sell" element={<SellerDashboard />} />
        <Route path="/sell/new" element={<CreateListing />} />
        <Route path="/buy" element={<BuyerDashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
