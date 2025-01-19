import React from 'react';
import { CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const OrderConfirmation = ({ orderDetails, selectedGift }) => {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <div className="flex justify-center mb-4">
          <CheckCircle className="h-16 w-16 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Order Confirmed!
        </h2>
        <p className="text-gray-600 mb-6">
          Thank you for your order. Your gift will be on its way soon!
        </p>
        <div className="bg-gray-50 rounded-lg p-6 mb-6 text-left">
          <h3 className="font-medium text-gray-900 mb-2">Order Details:</h3>
          <p>Order ID: {orderDetails.shipping_id}</p>
          <p>Estimated Delivery: {orderDetails.estimated_delivery}</p>
          <p className="mt-4 font-medium">Gift Selected:</p>
          <p>{selectedGift.name} - ${selectedGift.price}</p>
        </div>
        <Link
          to="/"
          className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Find Another Gift
        </Link>
      </div>
    </div>
  );
};

export default OrderConfirmation;