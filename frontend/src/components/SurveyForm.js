import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronLeft, Gift } from 'lucide-react';

const SURVEY_QUESTIONS = [
  // Technology Preferences
  {
      id: 'tech_comfort',
      category: 'technology',
      question: 'How comfortable are you with technology?',
      options: ['Very Comfortable', 'Comfortable', 'Neutral', 'Not Very Comfortable', 'Not Comfortable']
  },
  {
      id: 'tech_devices',
      category: 'technology',
      question: 'Which devices do you use most frequently?',
      options: ['Smartphone', 'Laptop', 'Tablet', 'Gaming Console', 'Smart Home Devices']
  },
  {
      id: 'tech_interests',
      category: 'technology',
      question: 'What type of tech interests you most?',
      options: ['Gaming', 'Photography', 'Smart Home', 'Audio/Music', 'Wearables']
  },

  // Fashion & Style
  {
      id: 'fashion_style',
      category: 'fashion',
      question: 'How would you describe your fashion style?',
      options: ['Casual', 'Professional', 'Trendy', 'Athletic', 'Vintage']
  },
  {
      id: 'preferred_accessories',
      category: 'fashion',
      question: 'What accessories do you prefer?',
      options: ['Watches', 'Jewelry', 'Bags', 'Scarves', 'None']
  },
  {
      id: 'color_preference',
      category: 'fashion',
      question: 'What colors do you prefer in clothing?',
      options: ['Neutral Colors', 'Bright Colors', 'Dark Colors', 'Pastels', 'Mixed']
  },

  // Home & Living
  {
      id: 'home_style',
      category: 'home',
      question: 'Whats your preferred home decor style?',
      options: ['Modern', 'Traditional', 'Minimalist', 'Rustic', 'Eclectic']
  },
  {
      id: 'home_priority',
      category: 'home',
      question: 'Whats most important in your living space?',
      options: ['Comfort', 'Organization', 'Aesthetics', 'Functionality', 'Entertainment']
  },

  // Hobbies & Interests
  {
      id: 'outdoor_activities',
      category: 'hobbies',
      question: 'What outdoor activities do you enjoy?',
      options: ['Hiking', 'Gardening', 'Sports', 'Photography', 'None']
  },
  {
      id: 'indoor_hobbies',
      category: 'hobbies',
      question: 'What indoor activities do you prefer?',
      options: ['Reading', 'Gaming', 'Cooking', 'Crafts', 'Music']
  },

  // Entertainment
  {
      id: 'movie_genres',
      category: 'entertainment',
      question: 'What movie genres do you prefer?',
      options: ['Action', 'Comedy', 'Drama', 'Sci-Fi', 'Documentary']
  },
  {
      id: 'music_preference',
      category: 'entertainment',
      question: 'What type of music do you enjoy?',
      options: ['Rock', 'Pop', 'Classical', 'Electronic', 'Jazz']
  },

  // Lifestyle
  {
      id: 'daily_routine',
      category: 'lifestyle',
      question: 'How would you describe your daily routine?',
      options: ['Very Active', 'Moderately Active', 'Balanced', 'Mostly Relaxed', 'Very Relaxed']
  },
  {
      id: 'work_style',
      category: 'lifestyle',
      question: 'Whats your work/study environment like?',
      options: ['Office', 'Remote Work', 'Active/On-foot', 'Creative Studio', 'Mixed']
  },

  // Food & Drink
  {
      id: 'cooking_interest',
      category: 'food',
      question: 'How interested are you in cooking?',
      options: ['Love to Cook', 'Cook Occasionally', 'Prefer Easy Meals', 'Dont Cook Much', 'Not Interested']
  },
  {
      id: 'food_preference',
      category: 'food',
      question: 'What types of food do you prefer?',
      options: ['International Cuisine', 'Health Food', 'Comfort Food', 'Gourmet', 'Quick & Easy']
  },

  // Reading & Learning
  {
      id: 'book_preference',
      category: 'books',
      question: 'What types of books do you enjoy?',
      options: ['Fiction', 'Non-fiction', 'Self-improvement', 'Technical', 'Dont Read Much']
  },
  {
      id: 'learning_style',
      category: 'education',
      question: 'How do you prefer to learn new things?',
      options: ['Reading', 'Video Tutorials', 'Hands-on Practice', 'Audio Learning', 'Group Learning']
  },

  // Wellness
  {
      id: 'fitness_interest',
      category: 'wellness',
      question: 'How interested are you in fitness?',
      options: ['Very Interested', 'Moderately Interested', 'Casual Interest', 'Limited Interest', 'Not Interested']
  },
  {
      id: 'stress_relief',
      category: 'wellness',
      question: 'How do you prefer to relax?',
      options: ['Exercise', 'Meditation', 'Entertainment', 'Creative Activities', 'Social Activities']
  },

  // Budget (Keep as last question)
  {
      id: 'budget',
      category: 'preferences',
      question: 'What is your budget range?',
      options: [
          { label: 'Under $50', value: 50 },
          { label: '$50 - $100', value: 100 },
          { label: '$100 - $200', value: 200 },
          { label: '$200 - $500', value: 500 },
          { label: 'Over $500', value: 1000 }
      ],
      isNumeric: true
  }
];
const SurveyForm = ({ onSubmit }) => {
    const navigate = useNavigate();
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [responses, setResponses] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleResponse = (option) => {
        const currentQ = SURVEY_QUESTIONS[currentQuestion];
        const value = currentQ.isNumeric ? option.value : option;
        
        setResponses(prev => ({
            ...prev,
            [currentQ.id]: value
        }));
    };

    const handleNext = () => {
        if (currentQuestion < SURVEY_QUESTIONS.length - 1) {
            setCurrentQuestion(prev => prev + 1);
        }
    };

    const handlePrevious = () => {
        if (currentQuestion > 0) {
            setCurrentQuestion(prev => prev - 1);
        }
    };

    const handleSubmit = async () => {
        setLoading(true);
        setError(null);
        try {
            await onSubmit(responses);
            navigate('/recommendations');
        } catch (err) {
            setError('There was an error submitting your responses. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const currentQ = SURVEY_QUESTIONS[currentQuestion];
    const progress = ((currentQuestion + 1) / SURVEY_QUESTIONS.length) * 100;

    const renderOptions = () => {
        const options = currentQ.options;
        return options.map((option, index) => {
            const value = currentQ.isNumeric ? option.value : option;
            const label = currentQ.isNumeric ? option.label : option;
            const isSelected = responses[currentQ.id] === value;

            return (
                <button
                    key={index}
                    onClick={() => handleResponse(option)}
                    className={`w-full p-4 text-left border rounded-lg transition-colors
                        ${isSelected 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-200 hover:bg-gray-50'}`}
                >
                    <div className="flex items-center">
                        <div className={`w-4 h-4 rounded-full border mr-3 flex-shrink-0
                            ${isSelected 
                                ? 'border-4 border-blue-500' 
                                : 'border-gray-300'}`}
                        />
                        <span className="text-gray-900">{label}</span>
                    </div>
                </button>
            );
        });
    };

    return (
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-xl p-8">
            {/* Header */}
            <div className="flex items-center justify-center mb-8">
                <Gift className="h-8 w-8 text-blue-500 mr-2" />
                <h2 className="text-2xl font-bold text-gray-900">
                    Find Your Perfect Gift
                </h2>
            </div>

            {/* Progress Bar */}
            <div className="mb-8">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-blue-500 transition-all duration-300"
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <p className="text-sm text-gray-600 mt-2">
                    Question {currentQuestion + 1} of {SURVEY_QUESTIONS.length}
                </p>
            </div>

            {/* Question */}
            <div className="mb-8">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                    {currentQ.question}
                </h3>
                <div className="space-y-3">
                    {renderOptions()}
                </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center">
                <button
                    onClick={handlePrevious}
                    disabled={currentQuestion === 0}
                    className={`flex items-center px-4 py-2 rounded-lg
                        ${currentQuestion === 0 
                            ? 'text-gray-400 cursor-not-allowed' 
                            : 'text-gray-600 hover:text-gray-900'}`}
                >
                    <ChevronLeft className="h-5 w-5 mr-1" />
                    Previous
                </button>
                
                {currentQuestion < SURVEY_QUESTIONS.length - 1 ? (
                    <button
                        onClick={handleNext}
                        disabled={!responses[currentQ.id]}
                        className={`flex items-center px-6 py-2 rounded-lg
                            ${!responses[currentQ.id] 
                                ? 'bg-gray-200 cursor-not-allowed' 
                                : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
                    >
                        Next
                        <ChevronRight className="h-5 w-5 ml-1" />
                    </button>
                ) : (
                    <button
                        onClick={handleSubmit}
                        disabled={loading || !responses[currentQ.id]}
                        className={`flex items-center px-6 py-2 rounded-lg
                            ${loading || !responses[currentQ.id]
                                ? 'bg-gray-200 cursor-not-allowed'
                                : 'bg-green-500 hover:bg-green-600 text-white'}`}
                    >
                        {loading ? 'Processing...' : 'Get Recommendations'}
                    </button>
                )}
            </div>

            {/* Error Message */}
            {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-600 text-sm">{error}</p>
                </div>
            )}

            {/* Helpful Tips */}
            <div className="mt-8 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                    Tip: The more accurate your responses, the better we can personalize your gift recommendations!
                </p>
            </div>
        </div>
    );
};

export default SurveyForm;