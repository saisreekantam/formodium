import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import LoginPage from './components/LoginPage';
import SurveyForm from './components/SurveyForm';
import GiftRecommendations from './components/GiftRecommendations';
import ShippingForm from './components/ShippingForm';
import OrderConfirmation from './components/OrderConfirmation';

const API_BASE_URL = 'http://localhost:8000';

// Protected Route wrapper component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" />;
};

const App = () => {
  const [surveyResponses, setSurveyResponses] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [selectedGift, setSelectedGift] = useState(null);
  const [orderDetails, setOrderDetails] = useState(null);
  const { user,isAuthenticated } = useAuth();

  const handleSurveySubmit = async (responses) => {
    try {
      const response = await fetch(`${API_BASE_URL}/survey`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({ responses }),
      });
      const data = await response.json();
      setRecommendations(data);
      setSurveyResponses(responses);
      return true;
    } catch (error) {
      console.error('Error submitting survey:', error);
      return false;
    }
  };

  const handleShippingSubmit = async (shippingDetails) => {
    try {
      const response = await fetch(`${API_BASE_URL}/shipping`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify(shippingDetails),
      });
      const data = await response.json();
      setOrderDetails(data);
      return true;
    } catch (error) {
      console.error('Error submitting shipping details:', error);
      return false;
    }
  };

  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <main className="container mx-auto px-4 py-8">
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    {user?.hasCompletedSurvey ? (
                      <Navigate to="/recommendations" />
                    ) : (
                      <SurveyForm onSubmit={handleSurveySubmit} />
                    )}
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/recommendations"
                element={
                  <ProtectedRoute>
                    <GiftRecommendations
                      recommendations={recommendations}
                      onSelectGift={setSelectedGift}
                    />
                  </ProtectedRoute>
                }
              />
              {/* <Route
                path="/products"
                element={<AllProducts onSelectGift={setSelectedGift} />}
              /> */}
              <Route
                path="/shipping"
                element={
                  <ProtectedRoute>
                    {selectedGift ? (
                      <ShippingForm
                        selectedGift={selectedGift}
                        onSubmit={handleShippingSubmit}
                      />
                    ) : (
                      <Navigate to="/recommendations" />
                    )}
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/confirmation"
                element={
                  <ProtectedRoute>
                    {orderDetails ? (
                      <OrderConfirmation
                        orderDetails={orderDetails}
                        selectedGift={selectedGift}
                      />
                    ) : (
                      <Navigate to="/" />
                    )}
                  </ProtectedRoute>
                }
              />
            </Routes>
          </main>
        </div>
      </AuthProvider>
    </Router>
  );
};

export default App;